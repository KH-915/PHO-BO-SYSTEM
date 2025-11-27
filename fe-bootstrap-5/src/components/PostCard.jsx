import React, { useState, useEffect } from 'react'
import interactionService from '../services/interactionService'
import { DEFAULT_AVATAR } from '../lib/placeholders'

export default function PostCard({ post, onUpdated, currentUserAvatar, currentUserId }){
  // Defensive defaults
  const initialLiked = !!post.is_liked_by_me
  const initialLikeCount = (post.stats && typeof post.stats.likes === 'number') ? post.stats.likes : 0

  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const initialCommentCount = (post.stats && typeof post.stats.comments === 'number') ? post.stats.comments : 0
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [commentInput, setCommentInput] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [processingLike, setProcessingLike] = useState(false)
  const [postingComment, setPostingComment] = useState(false)

  const target_id = post.post_id || post.id || post.id_str || null
  // backend enums expect upper-case values
  const target_type = 'POST'

  // If the parent re-uses the same component instance for a different post
  // (due to missing/unstable keys), ensure local state resets when post id changes.
  useEffect(() => {
    setComments([])
    setShowComments(false)
    setIsLiked(!!post.is_liked_by_me)
    setLikeCount((post.stats && typeof post.stats.likes === 'number') ? post.stats.likes : 0)
    setCommentCount((post.stats && typeof post.stats.comments === 'number') ? post.stats.comments : 0)
    // keep input cleared for a new post
    setCommentInput('')
  }, [post.post_id])

  async function handleLike(){
    if(processingLike) return
    const nextLiked = !isLiked
    // optimistic
    setIsLiked(nextLiked)
    setLikeCount(c => nextLiked ? c + 1 : Math.max(0, c - 1))
    setProcessingLike(true)
    try{
      // include current user id provided by parent so backend schemas validate
      await interactionService.toggleReaction(target_id, target_type, 'LIKE', currentUserId)
    }catch(err){
      // revert
      setIsLiked(isLiked)
      setLikeCount(c => isLiked ? c + 1 : Math.max(0, c - 1))
      console.error('Like failed', err)
    }finally{
      setProcessingLike(false)
    }
  }

  async function toggleComments(){
    const next = !showComments
    setShowComments(next)
    if(next && comments.length === 0){
      setLoadingComments(true)
      try{
        // fetch comments specifically for this post id
        const id = post.post_id || post.id
        const data = await interactionService.getComments(id, 'POST')
        // assume data is array
        setComments(Array.isArray(data) ? data : (data.results || []))
      }catch(err){
        console.error('Failed to load comments', err)
      }finally{
        setLoadingComments(false)
      }
    }
  }

  async function handleSubmitComment(e){
    // prevent form submit causing full page reload
    if(e && e.preventDefault) e.preventDefault()
    const text = commentInput && commentInput.trim()
    if(!text) return
    setPostingComment(true)
    try{
    const created = await interactionService.createComment(target_id, target_type, text, currentUserId)
    // Append the created comment to this card's local state (no full reload)
    setComments(prev => [...prev, created])
    // increment local comment count immediately so UI updates without reload
    setCommentCount(c => c + 1)
    setCommentInput('')
    }catch(err){
      console.error('Failed to post comment', err)
    }finally{
      setPostingComment(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex mb-2">
          <img src={post.author_avatar || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:40,height:40,objectFit:'cover'}} />
          <div>
            <div className="fw-bold">{post.author_name || 'Unknown'}</div>
            <div className="text-muted small">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</div>
          </div>
        </div>

        <div className="mb-3">{post.text_content}</div>

        <div className="d-flex justify-content-between align-items-center border-top pt-2">
          <div>
            <button className={`btn btn-sm btn-link ${isLiked ? 'text-primary' : 'text-muted'}`} onClick={handleLike} disabled={processingLike}>
              <i className={`bi ${isLiked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}></i>
              <span className="ms-2">Like</span>
              <span className="ms-1 text-muted">({likeCount})</span>
            </button>

            <button className={`btn btn-sm btn-link text-muted`} onClick={toggleComments}>
              <i className="bi bi-chat-left-text"></i>
              <span className="ms-2">Comments</span>
              <span className="ms-1 text-muted">({commentCount})</span>
            </button>
          </div>
          <div className="text-muted small">{post.privacy_setting}</div>
        </div>

        {showComments && (
          <div className="mt-3">
            {loadingComments ? (
              <div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"></div></div>
            ) : (
              <div>
                {comments.length === 0 && <div className="text-muted small mb-2">No comments yet</div>}
                {comments.map((c, idx) => (
                  <div key={c.comment_id || c.id || idx} className="d-flex mb-2">
                    <img src={c.commenter_avatar || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:32,height:32,objectFit:'cover'}} />
                    <div className="bg-light rounded px-2 py-1" style={{flex:1}}>
                      <div className="small fw-bold">{c.commenter_name || c.commenter || 'User'}</div>
                      <div className="small">{c.text_content}</div>
                      <div className="text-muted tiny small">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                    </div>
                  </div>
                ))}

                <form onSubmit={handleSubmitComment} className="d-flex align-items-start mt-2">
                  <img src={post.current_user_avatar || currentUserAvatar || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:32,height:32,objectFit:'cover'}} />
                  <div style={{flex:1}}>
                    <div className="input-group">
                      <input className="form-control form-control-sm" placeholder="Write a comment..." value={commentInput} onChange={e=>setCommentInput(e.target.value)} />
                      <button className="btn btn-primary btn-sm" type="submit" disabled={postingComment}>
                        <i className="bi bi-send-fill"></i>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
