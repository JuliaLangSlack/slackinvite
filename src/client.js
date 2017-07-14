import 'babel-polyfill'
import ReactDOM from 'react-dom'
import React from 'react'
import {ApolloClient, ApolloProvider, gql, graphql, createNetworkInterface} from 'react-apollo'
import emailValidator from 'email-validator'
import CoC from './coc.js'
import ReviewInvites from './review_invites'

const networkInterface = createNetworkInterface({
  uri: '/graphql',
  opts: {
    credentials: 'same-origin',
  },
});
const client = new ApolloClient({networkInterface})

class Main extends React.Component {
  constructor() {
    super()
  }

  render() {
    const page = this.props.page
    let inner_content = null

    if(page == 'invite_request') {
      inner_content = <InviteRequest user={this.props.user}/>
    } else if(page == 'review') {
      inner_content = <ReviewInvites/>
    }
    return <div>
      <div className='container main'>
        <Footer page={this.props.page} user={this.props.user}/>
        <div className='logo'>
          <a href="http://julialang.org"><img src="/assets/Julia_prog_language.svg"/></a>
        </div>

        {inner_content}

      </div>
    </div>
  }
}

Main.defaultProps = {page: 'invite_request'}

class Footer extends React.Component {
  render() {
    let login = null
    let review = null
    let logout = null
    const user = this.props.user
    if (user && user.login) {
      login = <a>Welcome <span className='header'>{user.login}</span></a>
      const page = this.props.page
      if(page=='invite_request' && user.is_admin) {
        review = <a href='/review'>Review requests</a>
      } else if(page=='review') {
        review = <a href='/'>Request an invite</a>
      }
      logout = <a href='/logout'>Logout</a>
    } else {
      login = <a href='/login'>Login with Github (optional)</a>
    }
    return <ul className='nav nav-tabs'>
      <li>{login}</li>
      <li>{review}</li>
      <li>{logout}</li>
    </ul>
  }
}



class InviteRequest extends React.Component {
  constructor() {
    super()
    this.state = {email: '', first: '', last: '', github: '',
                  status: 'neutral', 'coc': false, msg: ''}
    this.onChange = this.onChange.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  componentDidMount() {
    console.log("mounted")
    const user = this.props.user
    if(user) {
      let init_state = {}
      if(user.email) init_state.email = user.email
      if(user.login) init_state.github = user.login
      if(user.name) {
        const split = user.name.split(' ')
        if(split.length > 0) {
          init_state.first = split[0]
        }
        if(split.length > 1) {
          init_state.last = split[1]
        }
      }
      this.setState(init_state)
    }
  }

  onChange(event) {
    const target = event.target
    const value = target.type=='checkbox' ? target.checked : target.value
    this.setState({[target.name]: value})
  }

  onSubmit(event) {
    event.preventDefault()
    this.props.mutate({
      variables: {email: this.state.email,
                  first: this.state.first,
                  last: this.state.last,
                  github: this.state.github}
    }).then(({data})=>{
      const status = data.addRequest.status
      if(status.code >= 0) {
        this.setState({status: 'success'})
      } else {
        this.setState({status: 'fail', msg: status.msg})
      }
    }).catch(error=>{
      console.log('error: ', error)
    })
  }

  validate() {
    const validEmail = emailValidator.validate(this.state.email)
    return validEmail && this.state.first.length > 0 && this.state.last.length > 0 && this.state.coc
  }

  render() {
    const isValid = this.validate()
    const status = this.state.status;
    let statusMsg = null;
    if(status == 'success') {
      statusMsg = <div className='alert alert-success'>Success! A request for an invite for  <strong>{this.state.email}</strong> has been received.</div>
    } else if(status == 'fail') {
      statusMsg = <div className='alert alert-danger'>{this.state.msg}</div>
    }
    return <div>

      <h1>Slack invite request</h1>
      {statusMsg}
      <form className='form' onSubmit={this.onSubmit}>
        <div className='form-group'>
          <label>Email (required)</label>
          <input name='email' value={this.state.email} onChange={this.onChange} type="text" className='form-control'/>
        </div>

        <div className='form-group'>
          <label>First name (required)</label>
          <input name='first' value={this.state.first} onChange={this.onChange} type='text' className='form-control'/>
        </div>

        <div className='form-group'>
          <label>Last name (required)</label>
          <input name='last' value={this.state.last} onChange={this.onChange} type='text' className='form-control'/>
        </div>

        <div className='form-group'>
          <label>Github handle (if you have one)</label>
          <input name='github' value={this.state.github} onChange={this.onChange} type='text' className='form-control'/>
        </div>

        <div className='form-group'>
          <div className=''>
            <input className='checkbox-inline' type='checkbox' onChange={this.onChange} name='coc' checked={this.state.coc}/>
            <CoC/>
          </div>
        </div>

        <div className='form-group'>
          <button type='submit' className='btn btn-default' disabled={!isValid} ref={btn=>{this.btn=btn;}}>Request invitation</button>
        </div>

      </form>
    </div>
  }
}

const requestInvite = gql`
  mutation requestInvite($first: String, $last:String,  $github: String, $email: String) {
    addRequest(email: $email, first:$first, last:$last, github:$github) {
      status {
        msg
        code
      }
      request {
        id
      }
    }
  }`

InviteRequest = graphql(requestInvite)(InviteRequest)

class Root extends React.Component {
  render() {
    return <div>
      <ApolloProvider client={client}>
          <Main page={this.props.page} user={this.props.user}/>
      </ApolloProvider>
    </div>
  }
}

function mount_react() {
  ReactDOM.render(<Root page={page} user={user}/>, document.getElementById('root'))
  console.log(`Ready for page ${page}`)
}

window.onload = mount_react;
