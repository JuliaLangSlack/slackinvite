import nodemailer from 'nodemailer'

let transporter = null

function init(secrets) {

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

async function send_mail(options) {
  const data = await transporter.sendMail(options)
  return data
}


export default {init, send_mail}
