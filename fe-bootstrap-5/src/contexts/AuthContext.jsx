import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import { registerUnauthorizedHandler } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    // register global 401 handler: clear user state when backend returns 401
    registerUnauthorizedHandler(()=>{
      setUser(null)
    })

    async function loadMe(){
      setIsInitializing(true)
      try{
        const res = await authService.getMe()
        // The backend should return user object on successful session
        setUser(res.data)
      }catch(e){
        // 401 or other errors -> leave as guest
        setUser(null)
      }finally{
        setIsInitializing(false)
      }
    }
    loadMe()
  },[])

  const login = async (credentials)=>{
    const res = await authService.login(credentials)
    // backend sets HttpOnly cookie; response includes user info
    if(res.data && res.data.user){
      setUser(res.data.user)
      navigate('/')
    }
    return res
  }

  const register = async (payload)=>{
    const res = await authService.register(payload)
    // If backend logs in user on register and returns user, set it
    if(res.data && res.data.user){
      setUser(res.data.user)
      navigate('/')
    }
    return res
  }

  const logout = async ()=>{
    try{
      await authService.logout()
    }catch(e){ /* ignore */ }
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{user, isInitializing, login, register, logout}}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}
