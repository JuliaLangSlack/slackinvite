import * as bodyParser from 'body-parser'
import * as r from 'rethinkdb'
import * as request from 'request'
import * as querystring from 'querystring'
import {User} from './types'
import * as express from 'express'

interface Secrets {
  admin_id: string
  verification_token: string
  client_id: string
  client_secret: string
}

const slack_domain = '/slack'
const verify_token = true
let secrets:Secrets|null = null
let connection:r.Connection|null = null
const redirect_uri = 'https://slackinvite.malmaud.com/slack_oauth'

interface InviteRequest {
  token?: string
  email?: string
  first_name?: string
  last_name?: string
}

async function send_invite(user:User) {
  let req:InviteRequest = {}
  req.email = user.email
  const tokenCursor = await r.table('slack_tokens').filter({user_id: secrets!.admin_id}).orderBy(r.desc('create_date')).run(connection!)
  const tokens = await tokenCursor.toArray()
  const token = tokens[0].token
  req.token = token
  if(user.name) {
    const name = user.name
    if(name.first) {
      req.first_name = name.first
    }
    if(name.last) {
      req.last_name = name.last
    }
  }
  request({
    method: 'POST',
    uri: 'https://slack.com/api/users.admin.invite',
    formData: req,
    headers: {Accept: 'application/json'}
  }, (error, response, body)=>{
    body = JSON.parse(body)
    if(!body.ok) {
      console.log(`Invite error: ${JSON.stringify(body)}`)
    }
  })
}

interface SlashResponse {
  response_type?: string
  text?: string
}

function setup(app:express.Application, _connection:r.Connection, _secrets:Secrets) {
  secrets = _secrets
  connection = _connection
  app.use(slack_domain, bodyParser.urlencoded({extended: false}))

  app.use(slack_domain, (req, res, next)=>{
    const token = req.body.token
    if(!verify_token || token == secrets!.verification_token) {
      next()
    } else {
      res.status(400)
      res.send("Incorrect verification token")
    }
  })

  app.post(`${slack_domain}/gh`, (req, res)=>{
    let response:SlashResponse = {}
    const text = req.body.text
    const matches = text.match(/(.*\/.* )?(\d+)/)
    if(matches === null) {
      response.response_type = 'ephemeral'
      response.text = `Invalid issue number: ${text}`
    } else {
      response.response_type = 'in_channel'
      response.text = `https://github.com/${matches[1] === null ? "JuliaLang/julia" : matches[1]}/issues/${matches[2]}`
    }
    res.type('json')
    res.send(response)
  })

  app.get('/slack_login', (req, res)=>{
    const params = {
      client_id: secrets!.client_id,
      scope: 'client',
      redirect_uri: redirect_uri
    }
    res.redirect(`https://slack.com/oauth/authorize?${querystring.stringify(params)}`)

  })

  app.get('/send_invite', (req, res)=>{
    send_invite({email: 'malmaud+test5@gmail.com'})
    res.redirect('/')
  })

  app.get('/slack_oauth', (req, res)=>{
    request({
      method: 'POST',
      uri: 'https://slack.com/api/oauth.access',
      formData: {
        client_id: secrets!.client_id,
        client_secret: secrets!.client_secret,
        code: req.query.code,
        redirect_uri: redirect_uri
      }
    }, (error, response, body)=>{
      body = JSON.parse(body)
      if(!body.ok) {
        console.log(`Error with Slack OAuth: ${JSON.stringify(body)}`)
        res.redirect('/')
      } else {
        r.table('slack_tokens').insert({token: body.access_token, user_id: body.user_id, scope: body.scope, team_name: body.team_name, team_id: body.team_id, create_date: r.now()}).run(connection!)
        res.redirect('/')
      }
    })
  })
}

export {setup, send_invite}
