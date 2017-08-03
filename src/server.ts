import * as express from 'express'
import * as graphqlHTTP from 'express-graphql'
import {buildSchema, graphql} from 'graphql'
import * as fs from 'fs'
import * as compression from 'compression'
import * as r from 'rethinkdb'
import * as _ from 'lodash'
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as request from 'request'
import * as sjcl from 'sjcl'
import * as pug from 'pug'
import {schema} from './schema'
import * as Auth from './auth'
import * as Email from './email'
import * as Slack from './slack'
import {User} from './types'

let connection:r.Connection|null = null
let db_name = 'test'

async function ensure_tables(names:string[]) {
  const tables = await r.db(db_name).tableList().run(connection!)
  let promises = []
  for (let name of names) {
    if (!_.includes(tables, name)) {
      promises.push(r.db(db_name).tableCreate(name).run(connection!))
    }
  }
  for (let promise of promises) {
    await promise
  }
}

function timeout(ms:number) {
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

interface TemplateOptions {
  user?: any
  page?: string
}

function load_template(name:string, options:TemplateOptions) {
  if(options==null) {
    options = {}
  }
  if(options.user == null) {
    options.user = '{}'
  }
  return pug.renderFile(`./templates/${name}.jade`, options)
}

declare global {
    namespace Express {
        export interface Request {
          user:User
          connection: r.Connection
          session: string
        }
    }
}

async function init() {
  const secrets = load_secrets()
  console.log('Initializing email')
  Email.init(secrets.email)
  console.log('Done')
  console.log('Initializing db')
  while (true) {
    try {
      connection = await r.connect({host: 'db', port: 28015})
      break
    } catch (err) {
      console.log(`Error connecting to db: ${err}`)
      await timeout(1000)
    }
  }
  console.log('Done')
  Auth.set_connection(connection)

  console.log('Creating tables')
  await ensure_tables(['invites', 'sessions', 'status_changes', 'admins', 'slack_tokens'])
  console.log('Done')



  let app = express()
  app.use(compression())
  app.use(cookieParser())


  app.use((req, res, next) => {
    req.connection = <any>connection
    next()
  })

  app.use(async(req, res, next) => {
    let session = req.cookies['session']

    if (session == null || session == '') {
      session = gen_session_key()
      res.cookie('session', session)
    }
    (<any>req).session = session
    let user_cursor = await r.table('sessions').filter({session}).run(connection!)
    let users:User[] = await user_cursor.toArray()
    if (users.length > 0) {
      req.user = users[0]
      req.user.is_admin = await Auth.review_authorized(req.user)
      next()
    } else {
      next()
    }
  })
  //
  // app.use('/graphql', bodyParser.json())
  //
  // app.use('/graphql', (req, res, next) => {
  //   console.log(`GQL query: ${JSON.stringify(req.body)}`)
  //   next()
  // })

  // app.use('/graphql', graphqlHTTP((request, response, params)=>{
  //   return {
  //     schema: schema,
  //     graphiql: true}
  // }))

  app.use('/graphql', graphqlHTTP({schema: schema, graphiql: true}))


  app.get('/', async(req, res) => {
    console.log('Responding')
    res.send(load_template('main', {page: 'invite_request', user: JSON.stringify((<any>req).user)}))
  })

  app.get('/login', (req, res) => {
    const query_string = `scope=user:email&client_id=${secrets.github.client_id}`
    const url = `https://github.com/login/oauth/authorize?${query_string}`
    res.redirect(url)
  })

  app.get('/review', async (req, res)=>{
    if (await Auth.review_authorized(req.user)) {
      res.send(load_template('main', {page: 'review', user: JSON.stringify(req.user)}))
    } else {
      res.redirect('/')
    }
  })

  app.get('/logout', (req, res)=>{
    res.cookie('session', '')
    res.redirect('/')
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
            await r.table('sessions').insert(record).run(connection!)
            res.redirect('/')
          } else {
            if(user.id == null) {
              throw("User id field is missing")
            } else {
              await r.table('sessions').get(user.id).update(record).run(connection!)
            }
            res.redirect('/')
          }
        })
      } catch (err) {
        console.log('Error getting access token: ', err)
        console.log('Body was ', body)
        res.redirect('/')
      }

    })
  })

  app.use('/assets', express.static('assets'))

  Slack.setup(app, connection, secrets.slack)

  app.listen(4000)

}

init().then(res => {
  console.log('Running')
})
