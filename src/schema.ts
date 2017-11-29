import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
  GraphQLEnumType,
  GraphQLList
} from 'graphql'
import * as r from 'rethinkdb'
import * as Auth from './auth'
import * as Email from './email'
import * as Slack from './slack'
import { User, StatusCode } from './types'


const StatusType = new GraphQLObjectType({
  name: 'Status',
  fields: {
    code: { type: GraphQLInt },
    msg: { type: GraphQLString }
  }
})

const NameType = new GraphQLObjectType({
  name: 'Name',
  fields: {
    first: { type: GraphQLString },
    last: { type: GraphQLString }
  }
})

const InviteStatusType = new GraphQLEnumType({
  name: 'InviteStatus',
  values: {
    ACCEPTED: { value: 0 },
    DENIED: { value: 1 },
    PENDING: { value: 2 }
  }
})

const InviteRequestType = new GraphQLObjectType({
  name: 'InviteRequest',
  fields: {
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    name: { type: NameType },
    comment: { type: GraphQLString },
    status: { type: InviteStatusType },
    github: { type: GraphQLString }
  }
})

const VersionType = new GraphQLObjectType({
  name: 'Version',
  fields: {
    major: { type: GraphQLInt },
    minor: { type: GraphQLInt },
    patch: { type: GraphQLInt },
    string: { type: GraphQLString }
  }
})

interface Record {
  email?: string
  first?: string
  last?: string
  github?: string
  status?: string
  id?: string
}

const VERSION = "3.3.0"

interface Version {
  major: number
  minor: number
  patch: number
  string: string
}

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getRequests: {
      type: new GraphQLList(InviteRequestType),
      async resolve(root, args, context) {
        if (await Auth.review_authorized(context.user)) {
          const cursor = await r.table('invites').run(context.connection)
          const requests: Record[] = await cursor.toArray()
          let res = []
          for (let request of requests) {
            res.push({
              id: request.id,
              email: request.email,
              name: { first: request.first, last: request.last },
              github: request.github,
              status: StatusCode[request.status as (keyof typeof StatusCode)]
            })
          }
          return res
        } else {
          return []
        }
      }
    },
    version: {
      type: VersionType,
      resolve(root, args, context): Version {
        const [major, minor, patch] = VERSION.split(".").map(x => parseInt(x))
        return { major: major, minor: minor, patch: patch, string: VERSION }
      }
    }
  }
})

const RequestStatusType = new GraphQLObjectType({
  name: 'RequestStatus',
  fields: {
    status: { type: StatusType },
    request: { type: InviteRequestType }
  }
})

function send_invite_mail() {
  Email.send_mail({
    from: 'Jon Malmaud <malmaud@gmail.com>',
    to: 'malmaud@gmail.com',
    subject: 'A new Slack invite request has been received',
    html: '<a href=\"https://slackinvite.malmaud.com/review\">Login</a> to see'
  })
}



function send_status_email(record: Record) {
  const email = record.email
  Email.send_mail({
    from: 'Jon Malmaud <malmaud@gmail.com>',
    to: 'malmaud@gmail.com',
    subject: 'A status update has been received',
    html: `For user ${email}`
  })
}

async function insert_request(connection: r.Connection, { email, first, last, github }: Record) {
  const n_prev_users: number = await (r.table('invites') as any)('email').count(email).run(connection)
  if (n_prev_users == 0) {
    const res = await r.table('invites').insert({ email, first, last, github, status: 'ACCEPTED', time: r.now() }).run(connection)
    //send_invite_mail()

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

    return { request, status }
  } else {
    return {
      status: {
        code: -1,
        msg: 'Another invite associated with that email is already pending.'
      }
    }
  }
}

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addRequest: {
      type: RequestStatusType,
      args: {
        email: { type: GraphQLString },
        first: { type: GraphQLString },
        last: { type: GraphQLString },
        github: { type: GraphQLString }
      },
      resolve(root, { email, first, last, github }, context) {
        Slack.send_invite({ email: email, name: { first: first, last: last } })
        const res = insert_request(context.connection, { email, first, last, github })
        return res
      }
    },

    changeRequestStatus: {
      type: RequestStatusType,
      args: {
        id: { type: GraphQLID },
        status: { type: GraphQLString }
      },
      async resolve(root, { id, status }, context) {
        if (!(await Auth.review_authorized(context.user))) {
          return { status: { code: -2, msg: "Not authorized" } }
        }
        const conn = context.connection
        const status_change = r.table('status_changes').insert({ status: status, request_id: id, user_id: context.user.id, time: r.now() }).run(conn)
        const invite_add = r.table('invites').get(id).update({ status: status }).run(conn)
        await status_change
        await invite_add
        const record: Record = (await r.table('invites').get(id).run(conn)) as any
        send_status_email(record)
        const request = { id: record.id, email: record.email, status: StatusCode[record.status as keyof typeof StatusCode], name: { first: record.first, last: record.last }, github: record.github }
        return { status: { code: 0, msg: 'OK' }, request: request }
      }
    }
  }
})

const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
  types: [StatusType, NameType, InviteStatusType, InviteRequestType, RequestStatusType]
})


export { schema }
