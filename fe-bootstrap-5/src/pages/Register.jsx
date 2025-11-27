import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register(){
  const [payload, setPayload] = useState({ email:'', password:'', first_name:'', last_name:'', phone_number:'' })
  const [error, setError] = useState(null)
  const { register } = useAuth()
  

  const handleChange = (e)=>{
    setPayload({...payload, [e.target.name]: e.target.value})
  }
  const submit = async (e)=>{
    e.preventDefault(); setError(null)
    try{
      await register(payload)
    }catch(err){
      setError(err?.response?.data?.message || 'Register failed')
    }
  }

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-12 col-md-6">
        <div className="card card-rounded shadow-sm p-4">
          <h4 className="mb-3">Create an account</h4>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="row">
              <div className="col">
                <input name="first_name" className="form-control mb-2" placeholder="First name" value={payload.first_name} onChange={handleChange} />
              </div>
              <div className="col">
                <input name="last_name" className="form-control mb-2" placeholder="Last name" value={payload.last_name} onChange={handleChange} />
              </div>
            </div>
            <div className="mb-2">
              <input name="email" className="form-control" placeholder="Email" value={payload.email} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <input name="phone_number" className="form-control" placeholder="Phone" value={payload.phone_number} onChange={handleChange} />
            </div>
            <div className="mb-3">
              <input name="password" type="password" className="form-control" placeholder="Password" value={payload.password} onChange={handleChange} />
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-primary btn-pill" type="submit">Register</button>
              <Link to="/login" className="text-secondary">Already have an account?</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
