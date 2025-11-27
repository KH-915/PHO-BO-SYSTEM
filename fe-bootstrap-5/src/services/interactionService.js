import api from './api'

export async function toggleReaction(target_id, target_type, reaction_type = 'LIKE', reactor_user_id = null){
  // POST /reactions with reaction payload. Backend expects reactor_user_id in this API.
  const payload = {
    reactable_id: target_id,
    reactable_type: target_type,
    reaction_type: reaction_type,
  }
  if(reactor_user_id != null) payload.reactor_user_id = reactor_user_id
  const res = await api.post('/reactions', payload)
  return res.data
}

export async function removeReaction(target_id, target_type, reactor_user_id){
  // delete by composite key: /reactions/{reactor_user_id}/{reactable_id}/{reactable_type}
  if(!reactor_user_id) throw new Error('reactor_user_id required for delete')
  const res = await api.delete(`/reactions/${reactor_user_id}/${target_id}/${target_type}`)
  return res.data
}

export async function getComments(target_id, target_type){
  const res = await api.get('/comments', { params: { commentable_id: target_id, commentable_type: target_type } })
  return res.data
}

export async function createComment(target_id, target_type, text, commenter_user_id = null){
  const payload = {
    commentable_id: target_id,
    commentable_type: target_type,
    text_content: text,
  }
  if(commenter_user_id != null) payload.commenter_user_id = commenter_user_id
  const res = await api.post('/comments', payload)
  return res.data
}

export default {
  toggleReaction,
  removeReaction,
  getComments,
  createComment,
}
