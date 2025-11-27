import axios from 'axios'

// Ensure browser will send/receive HttpOnly cookies
axios.defaults.withCredentials = true

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Allow registering a handler that will be invoked on 401 responses.
// Auth layer can register a function that clears local user state and redirects.
let unauthorizedHandler = null
export function registerUnauthorizedHandler(fn){
  unauthorizedHandler = fn
}

api.interceptors.response.use(
  res => res,
  err => {
    if (err && err.response && err.response.status === 401) {
      if (typeof unauthorizedHandler === 'function') {
        try { unauthorizedHandler() } catch(e) { /* swallow */ }
      }
    }
    return Promise.reject(err)
  }
)

export default api
