import 'babel-polyfill'
import ReactDOM from 'react-dom'
import React from 'react'
import {ApolloClient, ApolloProvider, gql, graphql} from 'react-apollo'
import emailValidator from 'email-validator'
import CoC from './coc.js'

const client = new ApolloClient()

class Main extends React.Component {
  constructor() {
    super()
    this.state = {email: '', first: '', last: '', github: '',
                  status: 'neutral', 'coc': false, msg: ''}
    this.onChange = this.onChange.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
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
    return <div className='container main'>
      <div className='logo'>
        <a href="http://julialang.org"><img src="/assets/Julia_prog_language.svg"/></a>
      </div>
      <h1>Slack invite request</h1>
      {statusMsg}
      <form className='form' onSubmit={this.onSubmit}>
        <div className='form-group'>
          <label>Email (required)</label>
          <input name='email' value={this.email} onChange={this.onChange} type="text" className='form-control'/>
        </div>

        <div className='form-group'>
          <label>First name (required)</label>
          <input name='first' value={this.first} onChange={this.onChange} type='text' className='form-control'/>
        </div>

        <div className='form-group'>
          <label>Last name (required)</label>
          <input name='last' value={this.last} onChange={this.onChange} type='text' className='form-control'/>
        </div>

        <div className='form-group'>
          <label>Github handle (if you have one)</label>
          <input name='github' value={this.github} onChange={this.onChange} type='text' className='form-control'/>
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

Main = graphql(requestInvite)(Main)

class Root extends React.Component {
  render() {
    return <div>
      <ApolloProvider client={client}>
          <Main/>
      </ApolloProvider>
    </div>
  }
}

function mount_react() {
  ReactDOM.render(<Root/>, document.getElementById('root'))
  console.log(`Ready`)
}

window.onload = mount_react;
