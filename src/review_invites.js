import React from 'react'
import {gql, graphql} from 'react-apollo'
import _ from 'lodash'

class ReviewInvite extends React.Component {
  constructor() {
    super()
  }

  setStatus(status) {
    console.log(this.props.request.id, ' ', status)
    this.props.mutate({
      variables: {id: this.props.request.id,
                  status: status},
      update(store, results) {
        // const request = results.data.changeRequestStatus.request
        // request.status = status
        // store.writeFragment({
        //   id: `InviteRequest:${request.id}`,
        //   fragment: ReviewInvite.fragments.request,
        //   data: request})
        // console.log(record)
      }
    })
  }

  render() {
    const request = this.props.request
    return <div className='row'>
      <div className='col-xs-2'>
        {`${request.name.last}, ${request.name.first}`}
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
        <button className='btn btn-success' onClick={()=>this.setStatus('ACCEPTED')}>Approve</button>
      </div>
      <div className='col-xs-2'>
        <button className='btn btn-danger' onClick={()=>this.setStatus('DENIED')}>Deny</button>
      </div>
    </div>
  }
}

ReviewInvite.fragments = {
  request:  gql`
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


const modifyInvite = gql`
  ${ReviewInvite.fragments.request}

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

ReviewInvite = graphql(modifyInvite)(ReviewInvite)

class ReviewInvites extends React.Component {
  render() {
    if (this.props.data.getRequests) {
      const requests = this.props.data.getRequests
      const sorted = _.sortBy(requests, [req=>{
        return {'PENDING': 0, 'DENIED': 1, 'APPROVED': 2}[req.status]
      }, req=>{return req.github}])
      const requests_dom = sorted.map(request=>{
        return <div key={request.id}><ReviewInvite request={request}/></div>
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
  ${ReviewInvite.fragments.request}

  query {
    getRequests {
      ...requestParts
    }
  }`

ReviewInvites = graphql(getInvites)(ReviewInvites)

export default ReviewInvites
