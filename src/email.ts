import * as nodemailer from 'nodemailer'
import {User} from './types'

let transporter:nodemailer.Transporter|null = null

interface Secrets {
  server: string
  user: string
  pass: string
}

function init(secrets: Secrets) {
  transporter = nodemailer.createTransport({
    host: secrets.server,
    port: 465,
    secure: true,
    auth: {
      user: secrets.user,
      pass: secrets.pass
    }
  })
}

async function send_mail(options:nodemailer.SendMailOptions) {
  const data = await transporter!.sendMail(options)
  return data
}


export {init, send_mail}
