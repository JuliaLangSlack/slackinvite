import express from 'express'
import graphqlHTTP from 'express-graphql'
import {buildSchema} from 'graphql'
import fs from 'fs'
import compression from 'compression'
import r from 'rethinkdb'
import _ from 'lodash'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import request from 'request'
import sjcl from 'sjcl'

async function load_schema() {
  let schema_text = fs.readFileSync('./schema.graphql', 'utf8')
  let schema = await buildSchema(schema_text);
  return schema
}

let connection = null

async function ensure_tables(names) {
  const tables = await r.tableList().run(connection)
  let promises = []
  for (let name of names) {
    if (!_.includes(tables, name)) {
      promises.push(r.tableCreate(name).run(connection))
    }
  }
  for (let promise of promises) {
    await promise
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function gen_session_key() {
  const rng = sjcl.random.randomWords(10)
  const encoded = sjcl.codec.base64.fromBits(rng)
  return encoded
}

function load_secrets() {
  const file = fs.readFileSync('/secrets/secrets.json', 'utf8')
  const decoded = JSON.parse(file)
  return decoded
}

async function init() {
  const schema = await load_schema();
  const secrets = load_secrets()

  while (true) {
    try {
      connection = await r.connect({host: 'db', port: 28015})
      break
    } catch (err) {
      console.log(`Error connecting to db: ${err}`)
      await timeout(1000)
    }
  }

  await ensure_tables(['invites', 'sessions'])

  let root = {
    addRequest: async({email, first, last, github}) => {
      const n_prev_users = await r.table('invites')('email').count(email).run(connection)
      if (n_prev_users == 0) {
        const res = await r.table('invites').insert({email, first, last, github, status: 'PENDING'}).run(connection)
        const status = {
          code: 0,
          msg: 'Success'
        }
        const id = res.generated_keys[0]
        const request = {
          email: email,
          name: {
            first: first,
            last: last
          },
          github: github,
          comment: '',
          id: id
        }
        return {request, status}
      } else {
        return {
          status: {
            code: -1,
            msg: 'Another invite associated with that email is already pending.'
          }
        }
      }
    }
  }

  let app = express()
  app.use(compression())
  app.use(cookieParser())

  app.use(async(req, res, next) => {
    let session = req.cookies['session']

    if (session == null) {
      session = gen_session_key()
      res.cookie('session', session)
    }
    req.session = session
    let user_cursor = await r.table('sessions').filter({session}).run(connection)
    let users = await user_cursor.toArray()
    if (users.length > 0) {
      req.user = users[0]
      console.log('Request from user ', req.user)
    }
    next()
  })

  app.use('/graphql', bodyParser.json())

  app.use('/graphql', (req, res, next) => {
    console.log(`GQL query: ${JSON.stringify(req.body)}`)
    next()
  })

  app.use('/graphql', graphqlHTTP({schema: schema, rootValue: root, graphiql: true}))

  app.get('/', async(req, res) => {
    let html = fs.readFileSync('./main.html', 'utf8')
    res.send(html)
  })

  app.get('/login', (req, res) => {
    const query_string = `scope=user:email&client_id=${secrets.github.client_id}`
    const url = `https://github.com/login/oauth/authorize?${query_string}`
    res.redirect(url)
  })

  app.get('/oauth_callback', (req, res) => {
    const code = req.query.code
    request({
      method: 'POST',
      uri: 'https://github.com/login/oauth/access_token',
      formData: {
        client_id: secrets.github.client_id,
        client_secret: secrets.github.client_secret,
        code: code
      },
      headers: {
        Accept: 'application/json'
      }
    }, async(error, response, body) => {
      try {
        const data = JSON.parse(body)
        const token = data['access_token']
        const session = req.cookies.session
        let user = req.user

        request({
          method: 'POST',
          uri: 'https://api.github.com/graphql',
          headers: {
            "Authorization": `bearer ${token}`,
            "User-Agent": "juliaslack"
          },
          json: {
            query: `query {
              viewer {
                email
                login
                name
              }
            }`
          }
        }, async (error, response, body) => {
          const viewer = body.data.viewer
          const record = {
            session: session,
            email: viewer.email,
            login: viewer.login,
            name: viewer.name,
            github_token: token
          }
          if (user == null) {
            await r.table('sessions').insert(record).run(connection)
          } else {
            await r.table('sessions').get(user.id).update(record).run(connection)
          }
        })
      } catch (err) {
        console.log('Error getting access token: ', err)
        console.log('Body was ', body)
      }
      res.redirect('/')
    })
  })

  app.use('/assets', express.static('assets'))

  app.listen(4000)

}

init().then(res => {
  console.log('Running')
})
