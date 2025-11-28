import React from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">SimpleFacebook</Link>
          
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarContent">
            {/* Center: Main Navigation */}
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link active" to="/"><i className="bi bi-house-door-fill"></i> Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/friends"><i className="bi bi-people-fill"></i> Friends</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/groups"><i className="bi bi-collection-fill"></i> Groups</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/pages"><i className="bi bi-flag-fill"></i> Pages</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/events"><i className="bi bi-calendar-event-fill"></i> Events</Link>
              </li>
              {user?.is_admin && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin"><i className="bi bi-shield-lock-fill"></i> Admin</Link>
                </li>
              )}
            </ul>

            {/* Right: User Profile & Actions */}
            <div className="d-flex align-items-center gap-3">
              <Link to={`/profile/${user?.user_id}`} className="text-white text-decoration-none d-flex align-items-center gap-2">
                <img 
                  src={user?.profile_picture_url || '/default-ava.png'} 
                  className="rounded-circle border border-white" 
                  width="30" height="30" 
                  alt="me"
                />
                <span className="d-none d-lg-block">{user?.first_name}</span>
              </Link>
              <button onClick={handleLogout} className="btn btn-sm btn-light text-primary fw-bold">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      {/* This renders the child page (Feed, Friends, etc.) */}
      <div className="bg-light min-vh-100 pt-4">
        <Outlet /> 
      </div>
    </>
  )
}