import _ from 'lodash'
import r from 'rethinkdb'

let conn = null

function set_connection(c) {
  conn = c
}

async function review_authorized(user) {
  if(user==null) return false
  if(user.login==null) return false
  const login = user.login
  const admins_cursor = await r.table('admins').run(conn)
  const records = await admins_cursor.toArray()
  const admins = records.map(record=>{return record['github']})
  return _.includes(admins, login)
}

export default {review_authorized, set_connection}
