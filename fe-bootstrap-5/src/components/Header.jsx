import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = async ()=>{
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container-centered d-flex align-items-center">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="rounded-circle bg-primary d-inline-block" style={{width:36,height:36,marginRight:8}}></div>
          <strong style={{color:'var(--fb-blue)'}}>SimpleFacebook</strong>
        </Link>
        <div className="ms-auto">
          {user ? (
            <div className="d-flex align-items-center gap-3">
              <Link to="/friends/requests" className="btn btn-link position-relative text-decoration-none">
                <i className="bi bi-person-plus-fill" style={{fontSize: '1.25rem'}}>freind request</i>
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">0</span>
              </Link>
              <Link to="/friends" className="btn btn-link text-decoration-none">
                <i className="bi bi-people-fill" style={{fontSize: '1.25rem'}}>freinds</i>
              </Link>
              <span className="text-secondary">{user.name || user.first_name || user.email}</span>
              <button className="btn btn-outline-secondary btn-sm btn-pill" onClick={onLogout}>Logout</button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-primary btn-pill">Login</Link>
              <Link to="/register" className="btn btn-outline-primary btn-pill">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
