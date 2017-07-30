import bodyParser from 'body-parser'

const slack_domain = '/slack'
const verify_token = false

function setup(app, secrets) {
  app.use(slack_domain, bodyParser.urlencoded({extended: false}))

  app.use(slack_domain, (req, res, next)=>{
    const token = req.body.token
    if(!verify_token || token == secrets.verification_token) {
      next()
    } else {
      res.status(400)
      res.send("Incorrect verification token")
    }
  })

  app.post(`${slack_domain}/gh`, (req, res)=>{
    console.log(`Got request with body ${JSON.stringify(req.body)}`)
    let response = {}
    const text = req.body.text
    const issue_number = text.match(/(\d+)/)
    if(issue_number === null) {
      response.response_type = 'ephemeral'
      response.text = `Invalid issue number: ${text}`
    } else {
      response.response_type = 'in_channel'
      response.text = `https://github.com/JuliaLang/julia/issues/${issue_number[1]}`
    }
    res.type('json')
    res.send(response)
  })
}

export default {setup}
