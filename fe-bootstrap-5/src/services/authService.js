import api from './api'

const login = (payload) => api.post('/auth/login', payload)
const register = (payload) => api.post('/auth/register', payload)
const getMe = () => api.get('/users/me')
const logout = () => api.post('/auth/logout')

export default { login, register, getMe, logout }
