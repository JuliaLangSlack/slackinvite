import * as bodyParser from 'body-parser'
import * as r from 'rethinkdb'
import * as request from 'request'
import * as querystring from 'querystring'
import { User } from './types'
import * as express from 'express'
import {db_name} from './db'
import { prettify } from './util'
import * as WebSocket from 'ws'
import * as rp from 'request-promise-native'
import * as crypto from 'crypto'

interface Secrets {
  admin_id: string
  verification_token: string
  client_id: string
  client_secret: string
}

const slack_domain = '/slack'
const verify_token = false
let secrets: Secrets | null = null
let connection: r.Connection | null = null
// const redirect_uri = 'https://slackinvite.malmaud.com/slack_oauth'
const redirect_uri = 'http://a7e0d16c.ngrok.io/slack_oauth'

interface InviteRequest {
  token?: string
  email?: string
  first_name?: string
  last_name?: string
}

async function get_slack_token() {
  const tokenCursor = await r.table('slack_tokens').filter({ user_id: secrets!.admin_id }).orderBy(r.desc('create_date')).run(connection!)
  const tokens = await tokenCursor.toArray()
  const token = <string>tokens[0].token
  return token
}

async function send_invite(user: User) {
  let req: InviteRequest = {}
  req.email = user.email
<<<<<<< HEAD
  const tokenCursor = await r.db(db_name).table('slack_tokens').filter({ user_id: secrets!.admin_id }).orderBy(r.desc('create_date')).run(connection!)
  const tokens = await tokenCursor.toArray()
  const token = tokens[0].token
||||||| merged common ancestors
  const tokenCursor = await r.table('slack_tokens').filter({ user_id: secrets!.admin_id }).orderBy(r.desc('create_date')).run(connection!)
  const tokens = await tokenCursor.toArray()
  const token = tokens[0].token
=======
  const token = await get_slack_token()
>>>>>>> .
  req.token = token
  if (user.name) {
    const name = user.name
    if (name.first) {
      req.first_name = name.first
    }
    if (name.last) {
      req.last_name = name.last
    }
  }
  request({
    method: 'POST',
    uri: 'https://slack.com/api/users.admin.invite',
    formData: req,
    headers: { Accept: 'application/json' }
  }, (error, response, body) => {
    body = JSON.parse(body)
    if (!body.ok) {
      console.log(`Invite error: ${JSON.stringify(body)}`)
    }
  })
}

interface SlashResponse {
  response_type?: string
  text?: string
}

function setup(app: express.Application, _connection: r.Connection, _secrets: Secrets) {
  secrets = _secrets
  connection = _connection
  app.use(slack_domain, bodyParser.urlencoded({ extended: false }))

  app.use(slack_domain, (req, res, next) => {
    const token = req.body.token
    if (!verify_token || token == secrets!.verification_token) {
      next()
    } else {
      res.status(400)
      res.send("Incorrect verification token")
    }
  })

  app.post(`${slack_domain}/gh`, (req, res) => {
    let response: SlashResponse = {}
    const text = req.body.text
    const matches = text.match(/^(?:(.+\/.+)(?:\s|#|\/))?#?(\d+)/)
    if (matches === null) {
      response.response_type = 'ephemeral'
      response.text = `Invalid issue number: ${text}`
    } else {
      response.response_type = 'in_channel'
      response.text = `https://github.com/${matches[1] === undefined ? "JuliaLang/julia" : matches[1]}/issues/${matches[2]}`
    }
    res.type('json')
    res.send(response)
  })

  app.get('/slack_login', (req, res) => {
    const params = {
      client_id: secrets!.client_id,
      scope: 'client',
      redirect_uri: redirect_uri
    }
    res.redirect(`https://slack.com/oauth/authorize?${querystring.stringify(params)}`)

  })

  app.get('/slack/bot_login', (req, res) => {
    const params = {
      client_id: secrets!.client_id,
      scope: 'chat:write:bot',
      redirect_uri: redirect_uri
    }
    res.redirect(`https://slack.com/oauth/authorize?${querystring.stringify(params)}`)
  })

  app.get('/send_invite', (req, res) => {
    send_invite({ email: 'malmaud+test5@gmail.com' })
    res.redirect('/')
  })

  app.get('/slack_oauth', (req, res) => {
    request({
      method: 'POST',
      uri: 'https://slack.com/api/oauth.access',
      formData: {
        client_id: secrets!.client_id,
        client_secret: secrets!.client_secret,
        code: req.query.code,
        redirect_uri: redirect_uri
      }
    }, (error, response, body) => {
      body = JSON.parse(body)
      if (!body.ok) {
        console.log(`Error with Slack OAuth: ${JSON.stringify(body)}`)
        res.redirect('/')
      } else {
<<<<<<< HEAD
        r.db(db_name).table('slack_tokens').insert({ token: body.access_token, user_id: body.user_id, scope: body.scope, team_name: body.team_name, team_id: body.team_id, create_date: r.now() }).run(connection!)
||||||| merged common ancestors
        r.table('slack_tokens').insert({ token: body.access_token, user_id: body.user_id, scope: body.scope, team_name: body.team_name, team_id: body.team_id, create_date: r.now() }).run(connection!)
=======
        console.log(`credentials: ${JSON.stringify(body)}`)
        r.table('slack_tokens').insert({ token: body.access_token, user_id: body.user_id, scope: body.scope, team_name: body.team_name, team_id: body.team_id, create_date: r.now() }).run(connection!)
>>>>>>> .
        res.redirect('/')
      }
    })
  })

  interface SlackRTM {
    token: string
  }

  app.get('/slack/rtm', async (req, res) => {
    const token = await get_slack_token()
    const body: SlackRTM = { token }
    const response = await rp({
      uri: 'https://slack.com/api/rtm.connect',
      headers: {Accept: 'application/json'},
      formData: body,
      method: 'post'})
    res.send('ok')
    const parsed = JSON.parse(response)
    console.log(parsed)
    slack_ws_connect(parsed.url, parsed.self.id)
  })
}

async function get_dm_channel(user: string) {
  const token = await get_slack_token()
  const msg = {token}
  const raw_body = await rp({
    uri: 'https://slack.com/api/im.list',
    formData: msg,
    method: 'post'
  })
  const body = JSON.parse(raw_body)
  console.log(body)
  for(const im of body.ims) {
    if(im.user == user) {
      return im.id
    }
  }
  return null
}

async function slack_ws_connect(url: string, user: string) {
  const ws = new WebSocket(url)
  ws.on('message', data=>{
    console.log(`got ws msg: ${data}`)
  })
  ws.on('open', async ()=>{
    const channel = await get_dm_channel(user)
    console.log(`channel: ${channel}`)
    let msgcounter = 0
    function send_msg() {
      const msg_id = crypto.randomBytes(20).toString('hex')
      const msg = {id: msg_id, type: 'message', channel: channel, text: `hi from jon: ${msgcounter}`}
      ws.send(JSON.stringify(msg))
      msgcounter += 1
    }
    // setInterval(send_msg, 3000)
  })


}

export { setup, send_invite }
