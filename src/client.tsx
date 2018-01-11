import 'babel-polyfill'
import * as ReactDOM from 'react-dom'
import * as React from 'react'
import { ApolloClient, ApolloProvider, gql, graphql, createNetworkInterface, ChildProps } from 'react-apollo'
import * as emailValidator from 'email-validator'
import CoC from './coc'
import { ReviewInvites, fragments as InviteFragments } from './review_invites'
import { User } from './types'

const networkInterface = createNetworkInterface({
  uri: '/graphql',
  opts: {
    credentials: 'same-origin',
  },
});
const client = new ApolloClient({ networkInterface })

interface MainProps {
  page: string
  user: User
}

class Main extends React.Component<MainProps, {}> {
  static defaultProps: Partial<MainProps> = { page: 'invite_request' }

  render() {
    const page = this.props.page
    let inner_content = null

    if (page == 'invite_request') {
      inner_content = <InviteRequestGQL user={this.props.user} />
    } else if (page == 'review') {
      inner_content = <ReviewInvites />
    }
    return <div>
      <div className='container main'>
        <Footer page={page} user={this.props.user} />
        <div id='logoArea'>
          <a href="http://julialang.org"><img className='logo' src="/assets/Julia_prog_language.svg" /></a>
        </div>

        {inner_content}

      </div>
    </div>
  }
}

class Footer extends React.Component<{ user: User, page: string }, {}> {
  render() {
    let login = null
    let review = null
    let logout = null
    const user = this.props.user
    if (user && user.login) {
      login = <a>Welcome <span className='header'>{user.login}</span></a>
      const page = this.props.page
      if (page == 'invite_request' && user.is_admin) {
        review = <a href='/review'>Review requests</a>
      } else if (page == 'review') {
        review = <a href='/'>Request an invite</a>
      }
      logout = <a href='/logout'>Logout</a>
    } else {
      login = <a href='/login'>Login with Github (optional)</a>
    }
    return <ul id='topnav'>
      <li id='login_nav'>{login}</li>
      <li>{review}</li>
      <li>{logout}</li>
    </ul>
  }
}

interface RequestState {
  email?: string
  first?: string
  last?: string
  github?: string
  status?: string
  coc?: boolean
  msg?: string
}

interface InviteRequestProps {
  user: User
}

class InviteRequest extends React.Component<ChildProps<InviteRequestProps, any>, RequestState> {
  constructor() {
    super()
    this.state = {
      email: '', first: '', last: '', github: '',
      status: 'neutral', 'coc': false, msg: ''
    }
    this.onChange = this.onChange.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  componentDidMount() {
    const user = this.props.user
    if (user) {
      let init_state: RequestState = {}
      if (user.email) init_state.email = user.email
      if (user.login) init_state.github = user.login
      if (user.name) {
        const split = (user.name as string).split(' ')
        if (split.length > 0) {
          init_state.first = split[0]
        }
        if (split.length > 1) {
          init_state.last = split[1]
        }
      }
      this.setState(init_state)
    }
  }

  onChange(event: React.ChangeEvent<{}>) {
    const target = event.target
    const value = target.type == 'checkbox' ? target.checked : target.value
    this.setState({ [target.name]: value })
  }

  onSubmit(event: React.FormEvent<{}>) {
    event.preventDefault()
    this.props.mutate!({
      variables: {
        email: this.state.email,
        first: this.state.first,
        last: this.state.last,
        github: this.state.github
      }
    }).then(({ data }) => {
      const status = data.addRequest.status
      if (status.code >= 0) {
        this.setState({ status: 'success' })
      } else {
        this.setState({ status: 'fail', msg: status.msg })
      }
    }).catch((error: any) => {
      console.log('error: ', error)
    })
  }

  validate() {
    const validEmail = this.state.email ? emailValidator.validate(this.state.email) : false
    if (this.state.first && this.state.last) {
      return validEmail && this.state.first.length > 0 && this.state.last.length > 0 && this.state.coc
    } else {
      return false
    }
  }

  render() {
    const isValid = this.validate()
    const status = this.state.status;
    let requestStatus = null;
    if (status != 'neutral') {
      requestStatus = <span>Request sent</span>
    }
    let statusMsg = null;
    if (status == 'success') {
      statusMsg = <div className='alert alert-success'>Success! A request for an invite for  <strong>{this.state.email}</strong> has been received.</div>
    } else if (status == 'fail') {
      statusMsg = <div className='alert alert-danger'>{this.state.msg}</div>
    }
    return <div>

      <h1>Slack invite request</h1>
      <form id="inviteForm" onSubmit={this.onSubmit}>

        <label>Email (required)</label>
        <input type='email' className='form-control' name='email' value={this.state.email} onChange={this.onChange}  />

        <label>First name (required)</label>
        <input className='form-control' name='first' value={this.state.first} onChange={this.onChange} type='text' />

        <label>Last name (required)</label>
        <input className='form-control' name='last' value={this.state.last} onChange={this.onChange} type='text' />

        <label>Github handle (if you have one)</label>
        <input className='form-control' name='github' value={this.state.github} onChange={this.onChange} type='text' />

        <div id='agreeRow'>
          <label>Check if you agree: </label>
          <input className='form-check' type='checkbox' onChange={this.onChange} name='coc' checked={this.state.coc} />
        </div>
        <CoC />

        <div id='acceptButton'>
          {statusMsg}
          <button className='btn btn-primary' type='submit' disabled={!isValid}>Request invitation</button>
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

const InviteRequestGQL = graphql<any, InviteRequestProps>(requestInvite)(InviteRequest)

class Root extends React.Component<{ page: string, user: User }, {}> {
  render() {
    return <div>
      <ApolloProvider client={client}>
        <Main page={this.props.page} user={this.props.user} />
      </ApolloProvider>
    </div>
  }
}

declare const page: string
declare const user: User
declare const document: any
declare const window: any

function mount_react() {
  ReactDOM.render(<Root page={page} user={user} />, document.getElementById('root'))
}

window.onload = mount_react;
