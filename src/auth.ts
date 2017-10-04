import * as _ from 'lodash'
import * as r from 'rethinkdb'
import { User } from './types'

let conn: r.Connection | null = null

function set_connection(c: r.Connection) {
  conn = c
}

interface Record {
  github: string
}

function test_conn() {
  if (conn == null) {
    throw ("Connection not set")
  }
}

async function review_authorized(user: User): Promise<boolean> {
  test_conn()
  if (user == null) return false
  if (user.login == null) return false
  const login = user.login
  const admins_cursor = await r.table('admins').run(conn!)
  const records: Record[] = await admins_cursor.toArray()
  const admins = records.map(record => { return record['github'] })
  return _.includes(admins, login)
}

export { review_authorized, set_connection }
