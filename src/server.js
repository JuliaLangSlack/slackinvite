import express from 'express'
import graphqlHTTP from 'express-graphql'
import {buildSchema} from 'graphql'
import fs from 'fs'
import compression from 'compression'
import r from 'rethinkdb'
import _ from 'lodash'
import bodyParser from 'body-parser'

async function load_schema()  {
  let schema_text = fs.readFileSync('./schema.graphql', 'utf8')
  let schema = await buildSchema(schema_text);
  return schema
}

let connection = null

async function ensure_tables(names) {
  const tables = await r.tableList().run(connection)
  let promises = []
  for(let name of names) {
    if(!_.includes(tables, name)) {
      promises.push(r.tableCreate(name).run(connection))
    }
  }
  for(let promise of promises) {
    await promise
  }
}

function timeout(ms) {
  return new Promise(resolve=>setTimeout(resolve, ms))
}


async function init() {
  let schema = await load_schema();

  while(true) {
    try {
      connection = await r.connect({host: 'db', port: 28015})
      break
    } catch(err) {
      console.log(`Error connecting to db: ${err}`)
      await timeout(1000)
    }
  }

  await ensure_tables(['invites'])

  let root = {
    addRequest: async ({email, first, last, github})=>{
      const n_prev_users = await r.table('invites')('email').count(email).run(connection)
      if(n_prev_users == 0) {
        const res = await r.table('invites').insert({email, first, last, github, status: 'PENDING'}).run(connection)
        const status = {code: 0, msg: 'Success'}
        const id = res.generated_keys[0]
        const request = {email: email, name: {first: first, last: last}, github: github, comment: '', id: id}
        return {request, status}
      } else {
        return {status: {code: -1, msg: 'Another invite associated with that email is already pending.'}}
      }
    }
  }

  let app = express()

  app.use('/graphql', bodyParser.json())

  app.use('/graphql', (req, res, next)=>{
    console.log(`GQL query: ${JSON.stringify(req.body)}`)
    next()
  })

  app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }))

  app.use(compression())

  app.get('/', async (req, res)=>{
    let html = fs.readFileSync('./main.html', 'utf8')
    res.send(html)
  })

  app.use('/assets', express.static('assets'))

  app.listen(4000)

}

init().then(res=>{
  console.log('Running')
})
