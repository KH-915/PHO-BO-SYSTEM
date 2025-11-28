import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Import Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import FriendManager from './pages/FriendManager' // This component handles Requests + Suggestions
import GroupList from './pages/GroupList'
import GroupDetail from './pages/GroupDetail'
import ProfilePage from './pages/ProfilePage'
import PageList from './pages/PageList'
import PageDetail from './pages/PageDetail'
import EventList from './pages/EventList'
import EventDetail from './pages/EventDetail'
import Layout from './components/Layout'

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, isInitializing } = useAuth()
  
  // Show a loading spinner while checking auth status
  if (isInitializing) {
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
          
          {/* Group Detail */}
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          
          {/* Profile Page */}
          <Route path="/profile/:userId" element={<ProfilePage />} />
          
          {/* Pages */}
          <Route path="/pages" element={<PageList />} />
          <Route path="/pages/:pageId" element={<PageDetail />} />
          
          {/* Events */}
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          
        </Route>
      </Routes>
    </AuthProvider>
  )
}