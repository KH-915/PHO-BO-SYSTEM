import api from './api'

export async function toggleReaction(target_id, target_type, reaction_type = 'LIKE'){
  // POST /reactions - backend gets user from cookie, but still needs the payload fields
  const payload = {
    reactable_id: target_id,
    reactable_type: target_type,
    reaction_type: reaction_type,
  }
  return api.post('/reactions', payload)
}

export async function removeReaction(target_id, target_type, reactor_user_id){
  // delete by composite key: /reactions/{reactor_user_id}/{reactable_id}/{reactable_type}
  if(!reactor_user_id) throw new Error('reactor_user_id required for delete')
  const res = await api.delete(`/reactions/${reactor_user_id}/${target_id}/${target_type}`)
  return res.data
}

export async function getComments(target_id, target_type){
  return api.get('/comments', { params: { commentable_id: target_id, commentable_type: target_type } })
}

export async function createComment(target_id, target_type, text, parent_comment_id = null){
  const payload = {
    commentable_id: target_id,
    commentable_type: target_type,
    text_content: text,
  }
  if (parent_comment_id) {
    payload.parent_comment_id = parent_comment_id
  }
  return api.post('/comments', payload)
}

export default {
  toggleReaction,
  removeReaction,
  getComments,
  createComment,
}
