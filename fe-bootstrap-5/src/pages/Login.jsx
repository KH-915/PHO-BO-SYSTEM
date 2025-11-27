import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const { login } = useAuth()
  

  const submit = async (e)=>{
    e.preventDefault()
    setError(null)
    try{
      await login({ email, password })
    }catch(err){
      setError(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-12 col-md-6">
        <div className="card card-rounded shadow-sm p-4">
          <h4 className="mb-3">Login to SimpleFacebook</h4>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control input-pill" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control input-pill" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-primary btn-pill" type="submit">Login</button>
              <Link to="/register" className="text-secondary">Create account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
