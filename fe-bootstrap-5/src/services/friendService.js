import api from './api'

export async function getSuggestions() {
  return api.get('/users/suggestions')
}

export async function sendFriendRequest(targetId) {
  return api.post(`/friends/${targetId}`)
}

export async function getFriendRequests(){
  return api.get('/friends/requests')
}

export async function getFriends(){
  return api.get('/friends')
}

export async function acceptRequest(targetId){
  return api.put(`/friends/${targetId}/accept`)
}

export async function rejectRequest(targetId){
  return api.delete(`/friends/${targetId}/reject`)
}

export async function unfriend(targetId){
  return api.delete(`/friends/${targetId}`)
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
