import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import FriendRequests from './pages/FriendRequests'
import FriendList from './pages/FriendList'
import AdminLayout from './pages/admin/AdminLayout'
import UserManagement from './pages/admin/UserManagement'
import Statistics from './pages/admin/Statistics'
import { useAuth } from './contexts/AuthContext'

export default function App(){
  const { user, isInitializing } = useAuth()

  if(isInitializing){
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-2">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="container-centered">
        <Routes>
          <Route path="/" element={user ? <Feed /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/friends/requests" element={<FriendRequests />} />
          <Route path="/friends" element={<FriendList />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={user ? <AdminLayout /> : <Navigate to="/login" replace />}>
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="stats" element={<Statistics />} />
          </Route>
        </Routes>
      </div>
    </>
  )
}
