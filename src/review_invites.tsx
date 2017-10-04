import * as React from 'react'
import { gql, graphql, MutationFunc, ChildProps } from 'react-apollo'
import * as _ from 'lodash'
import { InviteRequest } from './types'

interface Props {
  request: InviteRequest
}

class ReviewInvite extends React.Component<ChildProps<Props, undefined>, {}> {
  setStatus(status: string) {
    this.props.mutate!({
      variables: {
        id: this.props.request.id,
        status: status
      }
    })
  }

  render() {
    const request = this.props.request
    let name = "<Unknown>"
    if (request.name) {
      name = `${request.name.last}, ${request.name.first}`
    }
    return <div className='row'>
      <div className='col-xs-2'>
        {name}
      </div>
      <div className='col-xs-2'>
        <a href={`https://github.com/${request.github}`}>{request.github}</a>
      </div>
      <div className='col-xs-2'>
        <a href={`mailto:${request.email}`}>{request.email}</a>
      </div>
      <div className='col-xs-2'>
        {request.status}
      </div>
      <div className='col-xs-2'>
        <button className='btn btn-success' onClick={() => this.setStatus('ACCEPTED')}>Approve</button>
      </div>
      <div className='col-xs-2'>
        <button className='btn btn-danger' onClick={() => this.setStatus('DENIED')}>Deny</button>
      </div>
    </div>
  }
}

const fragments = {
  request: gql`
    fragment requestParts on InviteRequest {
      id
      name {
        first
        last
      }
      email
      status
      github
    }
  `
}

interface InviteGQLResponse {
  getRequests: InviteRequest[]
}

const modifyInvite = gql`
  ${fragments.request}

  mutation modify($id: ID, $status: String) {

    changeRequestStatus(id: $id, status: $status) {
      status {
        msg
      }

      request {
        ...requestParts
      }
    }
  }
`

const ReviewInviteGQL = graphql<any, Props>(modifyInvite)(ReviewInvite)


class ReviewInvites extends React.Component<ChildProps<{}, InviteGQLResponse>, {}> {
  render() {
    if (!this.props.data) return <div />
    if (this.props.data.getRequests) {
      const requests: InviteRequest[] = this.props.data.getRequests
      const sorted = _.sortBy(requests, [(req: InviteRequest) => {
        if (req.status) {
          return ({ 'PENDING': 0, 'DENIED': 1, 'APPROVED': 2 } as { [status: string]: number })[req.status]
        } else {
          return 3
        }
      }, (req: InviteRequest) => { return req.github }])
      const requests_dom = sorted.map(request => {
        return <div key={request.id}><ReviewInviteGQL request={request} /></div>
      })
      return <div>
        <div className='row'>
          <div className='col-xs-2 header'>Name</div>
          <div className='col-xs-2 header'>Github</div>
          <div className='col-xs-2 header'>Email</div>
          <div className='col-xs-2 header'>Status</div>
          <div className='col-xs-4 header'>Actions</div>
        </div>
        {requests_dom}
      </div>
    } else {
      return <div>Loading...</div>
    }

  }
}

const getInvites = gql`
  ${fragments.request}

  query {
    getRequests {
      ...requestParts
    }
  }
`

const ReviewInvitesGQL = graphql<InviteGQLResponse, any>(getInvites)(ReviewInvites)

export { ReviewInvitesGQL as ReviewInvites, fragments }
