import api from './api'

const getFeed = (params = {}) => api.get('/feed', { params })
const createPost = (payload) => api.post('/posts', payload)
const sharePost = (id, payload) => api.post(`/posts/${id}/share`, payload)

export default { getFeed, createPost, sharePost }
