import api from './api'

export async function getSuggestions() {
  const res = await api.get('/users/suggestions')
  return res.data
}

export async function sendFriendRequest(targetId) {
  const res = await api.post(`/friends/${targetId}`)
  return res.data
}

export async function getFriendRequests(){
  const res = await api.get('/friends/requests')
  return res.data
}

export async function getFriends(){
  const res = await api.get('/friends')
  return res.data
}

export async function acceptRequest(targetId){
  const res = await api.put(`/friends/${targetId}/accept`)
  return res.data
}

export async function rejectRequest(targetId){
  const res = await api.delete(`/friends/${targetId}/reject`)
  return res.data
}

export async function unfriend(targetId){
  const res = await api.delete(`/friends/${targetId}`)
  return res.data
}

export default {
  getSuggestions,
  sendFriendRequest,
  getFriendRequests,
  getFriends,
  acceptRequest,
  rejectRequest,
  unfriend,
}
