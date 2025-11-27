import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Import Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import FriendManager from './pages/FriendManager' // This component handles Requests + Suggestions
import GroupList from './pages/GroupList'
import Layout from './components/Layout'

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  // Show a loading spinner while checking auth status
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes (No Layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          
          {/* Home / Feed */}
          <Route path="/" element={<Feed />} />
          
          {/* Friend Manager (Handles Requests & Suggestions) */}
          <Route path="/friends" element={<FriendManager />} />
          
          {/* Group List */}
          <Route path="/groups" element={<GroupList />} />
          
          {/* Placeholder for Profile */}
          <Route path="/profile/:id" element={<div className="text-center mt-5">Profile Page Coming Soon</div>} />
          
        </Route>
      </Routes>
    </AuthProvider>
  )
}