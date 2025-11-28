import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  // Initial state matches USERS + PROFILES table columns
  const [payload, setPayload] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '', // Required by PROFILES
    gender: 'MALE'     // Enum from PROFILES
  })
  const [error, setError] = useState(null)
  const { register } = useAuth()

  const handleChange = (e) => {
    setPayload({ ...payload, [e.target.name]: e.target.value })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      // Backend transaction: Insert USERS -> Get ID -> Insert PROFILES
      await register(payload)
    } catch (err) {
      setError(err?.response?.data?.message || 'Register failed')
    }
  }

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-12 col-md-6">
        <div className="card shadow-sm p-4">
          <h4 className="mb-3">Create an account</h4>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="row">
              <div className="col">
                <input name="first_name" className="form-control mb-2" placeholder="First name" required value={payload.first_name} onChange={handleChange} />
              </div>
              <div className="col">
                <input name="last_name" className="form-control mb-2" placeholder="Last name" required value={payload.last_name} onChange={handleChange} />
              </div>
            </div>
            
            {/* New Fields for PROFILES Table */}
            <div className="row mb-2">
              <div className="col">
                <label className="form-label small text-muted">Date of Birth</label>
                <input name="date_of_birth" type="date" className="form-control" required value={payload.date_of_birth} onChange={handleChange} />
              </div>
              <div className="col">
                <label className="form-label small text-muted">Gender</label>
                <select name="gender" className="form-select" value={payload.gender} onChange={handleChange}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="mb-2">
              <input name="email" type="email" className="form-control" placeholder="Email" required value={payload.email} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <input name="phone_number" className="form-control" placeholder="Phone (Optional)" value={payload.phone_number} onChange={handleChange} />
            </div>
            <div className="mb-3">
              <input name="password" type="password" className="form-control" placeholder="Password" required value={payload.password} onChange={handleChange} />
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-primary" type="submit">Register</button>
              <Link to="/login" className="text-decoration-none">Already have an account?</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}