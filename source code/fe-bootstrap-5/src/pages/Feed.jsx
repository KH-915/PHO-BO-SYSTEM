import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import postService from '../services/postService'
import friendService from '../services/friendService'
import interactionService from '../services/interactionService'
import { useAuth } from '../contexts/AuthContext'
import CreatePostWidget from '../components/CreatePostWidget'
import Swal from 'sweetalert2'

// Helper function to format timestamp
const formatTimestamp = (dateString) => {
  const date = new Date(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = String(date.getFullYear()).slice(-2)
  return `${hours}:${minutes}-${month}/${year}`
} 

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await postService.getFeed()
      setPosts(res.data) // Expecting backend to return joined data (User/Page info)
    } catch (e) {
      console.error("Feed load error:", e)
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const res = await friendService.getFriends()
      setFriends(res.data || [])
    } catch (e) {
      console.error("Friends load error:", e)
      setFriends([])
    }
  }

  useEffect(() => { 
    load()
    loadFriends()
  }, [])

  return (
    <div className="container">
      <div className="row">
        
        {/* --- LEFT SIDEBAR: Navigation Shortcuts --- */}
        <div className="col-md-3 d-none d-md-block">
          <div className="card shadow-sm border-0 sticky-top" style={{top: '80px', zIndex: 1}}>
            <div className="list-group list-group-flush">
              <Link to={`/profile/${user?.user_id}`} className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0">
                <img src={user?.profile_picture_url || '/default-avatar.png'} className="rounded-circle" width="40" height="40" alt="me" />
                <span className="fw-bold">{user?.first_name} {user?.last_name}</span>
              </Link>
              <Link to="/friends" className="list-group-item list-group-item-action border-0 py-2">
                <i className="bi bi-people text-primary me-3"></i> Friends
              </Link>
              <Link to="/groups" className="list-group-item list-group-item-action border-0 py-2">
                <i className="bi bi-people-fill text-info me-3"></i> Groups
              </Link>
              <Link to="/pages" className="list-group-item list-group-item-action border-0 py-2">
                <i className="bi bi-flag-fill text-warning me-3"></i> Pages
              </Link>
              <Link to="/saved" className="list-group-item list-group-item-action border-0 py-2">
                <i className="bi bi-bookmark-fill text-success me-3"></i> Saved
              </Link>
            </div>
          </div>
        </div>

        {/* --- CENTER: Main Feed Content --- */}
        <div className="col-12 col-md-6">
          <CreatePostWidget onPostCreated={load} />
          
          {loading ? (
            <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <>
              {posts.length === 0 && <p className="text-center text-muted">No posts yet. Add friends or join groups!</p>}
              {posts.map(post => <PostCard key={post.post_id} post={post} onUpdate={load} />)}
            </>
          )}
        </div>

        {/* --- RIGHT SIDEBAR: Contacts / Suggestions --- */}
        <div className="col-md-3 d-none d-lg-block">
          <div className="sticky-top" style={{top: '80px'}}>
            
            {/* Mini Friend Requests Section */}
            <div className="card shadow-sm mb-3 border-0">
              <div className="card-header bg-white fw-bold border-0">Requests</div>
              <div className="card-body py-2">
                <Link to="/friends" className="btn btn-outline-primary btn-sm w-100">See All Requests</Link>
              </div>
            </div>

            {/* Contacts / Online Friends */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white fw-bold border-0 d-flex justify-content-between">
                <span>Contacts</span>
                <i className="bi bi-search text-muted"></i>
              </div>
              <ul className="list-group list-group-flush">
                {friends.length === 0 ? (
                  <li className="list-group-item border-0 text-muted small text-center py-3">
                    No friends yet
                  </li>
                ) : (
                  friends.slice(0, 10).map(friend => (
                    <li key={friend.user_id} className="list-group-item border-0 d-flex align-items-center gap-2 px-3 py-2">
                      <div className="position-relative">
                        <img 
                          src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'Friend')}`} 
                          className="rounded-circle" 
                          width="35" 
                          height="35"
                          style={{objectFit: 'cover'}}
                          alt={friend.name || 'Friend'}
                        />
                        <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{width: 10, height: 10}}></span>
                      </div>
                      <Link to={`/profile/${friend.user_id}`} className="small fw-bold text-dark text-decoration-none">
                        {friend.name || 'Friend'}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------
// PostCard Component (Refined)
// ---------------------------------------------------------
function PostCard({ post, onUpdate }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me)
  const [likeCount, setLikeCount] = useState(post.stats?.likes || 0)
  const [commentCount, setCommentCount] = useState(post.stats?.comments || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [mediaModal, setMediaModal] = useState(null) // { file, index }

  const authorName = post.author_name || 'Unknown User';
  const authorLink = `/profile/${post.author_id}`;
  const authorAvatar = post.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`;
  const hasMedia = post.files && post.files.length > 0;
  const isSharedPost = post.post_type === 'SHARE' && post.shared_post;

  const handleLike = async () => {
    try {
      await interactionService.toggleReaction(post.post_id, 'POST', 'LIKE')
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    } catch (e) {
      console.error("Like error:", e)
      Swal.fire({
        icon: 'error',
        title: 'Failed to like post',
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  const handleShowComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      try {
        const res = await interactionService.getComments(post.post_id, 'POST')
        setComments(res.data)
      } catch (e) {
        console.error("Load comments error:", e)
      } finally {
        setLoadingComments(false)
      }
    }
    setShowComments(!showComments)
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    try {
      const res = await interactionService.createComment(post.post_id, 'POST', commentText)
      setComments([...comments, res.data])
      setCommentCount(prev => prev + 1)
      setCommentText('')
    } catch (e) {
      console.error("Comment error:", e)
      Swal.fire({
        icon: 'error',
        title: 'Failed to add comment',
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  const handleAddReply = async (e, parentCommentId) => {
    e.preventDefault()
    if (!replyText.trim()) return

    try {
      const res = await interactionService.createComment(post.post_id, 'POST', replyText, parentCommentId)
      setComments([...comments, res.data])
      setCommentCount(prev => prev + 1)
      setReplyText('')
      setReplyingTo(null)
    } catch (e) {
      console.error("Reply error:", e)
      Swal.fire({
        icon: 'error',
        title: 'Failed to add reply',
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  const handleShare = async () => {
    // Only allow sharing public posts
    if (post.privacy_setting !== 'PUBLIC') {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Share',
        text: 'Only public posts can be shared.',
        confirmButtonColor: '#0d6efd'
      })
      return
    }

    const { value: formValues } = await Swal.fire({
      title: 'Share Post',
      html: `
        <div class="text-start">
          <label for="share-text" class="form-label">Add your thoughts (optional)</label>
          <textarea id="share-text" class="form-control mb-3" rows="3" placeholder="What do you think about this?"></textarea>
          
          <label for="share-privacy" class="form-label">Who can see this?</label>
          <select id="share-privacy" class="form-select">
            <option value="PUBLIC">Public</option>
            <option value="FRIENDS">Friends</option>
            <option value="ONLY_ME">Only Me</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Share',
      confirmButtonColor: '#0d6efd',
      preConfirm: () => {
        return {
          text: document.getElementById('share-text').value,
          privacy: document.getElementById('share-privacy').value
        }
      }
    })

    if (formValues) {
      try {
        await postService.sharePost(post.post_id, {
          text_content: formValues.text,
          privacy_setting: formValues.privacy
        })
        
        await Swal.fire({
          icon: 'success',
          title: 'Post Shared!',
          text: 'The post has been shared successfully.',
          timer: 2000,
          showConfirmButton: false
        })
        
        if (onUpdate) onUpdate()
      } catch (e) {
        console.error("Share error:", e)
        Swal.fire({
          icon: 'error',
          title: 'Failed to Share',
          text: e.response?.data?.detail || 'Failed to share post. Please try again.',
          confirmButtonColor: '#dc3545'
        })
      }
    }
  }

  return (
    <div className="card mb-3 shadow-sm border-0">
      <div className="card-header bg-white border-0 d-flex align-items-center pt-3 pb-2">
        <Link to={authorLink}>
          <img src={authorAvatar} className="rounded-circle me-2" width="40" height="40" alt="avatar" style={{objectFit:'cover'}}/>
        </Link>
        <div>
          <Link to={authorLink} className="fw-bold text-dark text-decoration-none">{authorName}</Link>
          <div className="text-muted small d-flex align-items-center">
            {formatTimestamp(post.created_at)}
            <span className="mx-1">•</span>
            {/* Group Location or Privacy Setting */}
            {post.location && post.location.type === 'GROUP' ? (
              <>
                <i className="bi bi-people-fill me-1" title="Posted in Group"></i>
                <Link to={`/groups/${post.location.group_id}`} className="text-decoration-none">
                  {post.location.group_name}
                </Link>
              </>
            ) : post.location && post.location.type === 'PAGE' ? (
              <>
                <i className="bi bi-flag-fill me-1" title="Posted on Page"></i>
                <Link to={`/pages/${post.location.page_id}`} className="text-decoration-none">
                  {post.location.page_name}
                </Link>
              </>
            ) : (
              <>
                {/* Privacy Text and Icon */}
                {post.privacy_setting === 'PUBLIC' && (
                  <>
                    <i className="bi bi-globe me-1" title="Public"></i>
                    <span>Public</span>
                  </>
                )}
                {post.privacy_setting === 'FRIENDS' && (
                  <>
                    <i className="bi bi-people-fill me-1" title="Friends"></i>
                    <span>Friends</span>
                  </>
                )}
                {post.privacy_setting === 'ONLY_ME' && (
                  <>
                    <i className="bi bi-lock-fill me-1" title="Only Me"></i>
                    <span>Only Me</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card-body pt-1">
        <p className="card-text">{post.text_content}</p>
      </div>

      {/* Shared Post - Recursive Display */}
      {isSharedPost && (
        <div className="mx-3 mb-3">
          <SharedPostContent sharedPost={post.shared_post} />
        </div>
      )}

      {/* Media Gallery */}
      {hasMedia && (
        <MediaGallery files={post.files} onFileClick={(file, index) => setMediaModal({ file, index, allFiles: post.files })} />
      )}

      {/* Footer Stats */}
      <div className="px-3 py-2 d-flex justify-content-between text-muted small border-bottom">
        <span>
          <i className={`bi bi-hand-thumbs-up-fill ${isLiked ? 'text-primary' : ''}`}></i>{' '}
          {likeCount === 0 ? 'No like' : likeCount === 1 ? '1 like' : `${likeCount} likes`}
        </span>
        <span>{commentCount} Comments</span>
      </div>

      <div className="card-footer bg-white d-flex justify-content-between border-0 pb-2">
        <button 
          className={`btn btn-light flex-grow-1 ${isLiked ? 'text-primary fw-bold' : 'text-muted'}`}
          onClick={handleLike}
        >
          <i className="bi bi-hand-thumbs-up"></i> Like
        </button>
        <button 
          className="btn btn-light text-muted flex-grow-1"
          onClick={handleShowComments}
        >
          <i className="bi bi-chat"></i> Comment
        </button>
        <button 
          className="btn btn-light text-muted flex-grow-1"
          onClick={handleShare}
        >
          <i className="bi bi-share"></i> Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="card-body border-top pt-3">
          {loadingComments ? (
            <div className="text-center py-2">
              <div className="spinner-border spinner-border-sm text-primary"></div>
            </div>
          ) : (
            <>
              {comments.length === 0 ? (
                <p className="text-muted small text-center">No comments yet. Be the first!</p>
              ) : (
                <div className="mb-3">
                  {comments.filter(c => !c.parent_comment_id).map(comment => (
                    <CommentItem 
                      key={comment.comment_id} 
                      comment={comment} 
                      allComments={comments}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onReply={handleAddReply}
                    />
                  ))}
                </div>
              )}
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control form-control-sm" 
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={!commentText.trim()}
                >
                  <i className="bi bi-send"></i>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Media Modal */}
      {mediaModal && (
        <MediaModal 
          file={mediaModal.file}
          allFiles={mediaModal.allFiles}
          currentIndex={mediaModal.index}
          onClose={() => setMediaModal(null)}
          onNavigate={(newIndex) => setMediaModal({ ...mediaModal, file: mediaModal.allFiles[newIndex], index: newIndex })}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------
// SharedPostContent Component - Recursive Shared Post Display
// ---------------------------------------------------------
function SharedPostContent({ sharedPost }) {
  if (!sharedPost) return null

  const authorName = sharedPost.author_name || 'Unknown User'
  const authorLink = `/profile/${sharedPost.author_id}`
  const authorAvatar = sharedPost.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`
  const isNestedShare = sharedPost.post_type === 'SHARE' && sharedPost.shared_post
  const hasMedia = sharedPost.files && sharedPost.files.length > 0

  return (
    <div className="card border">
      <div className="card-header bg-light border-0 d-flex align-items-center py-2 px-3">
        <Link to={authorLink}>
          <img src={authorAvatar} className="rounded-circle me-2" width="32" height="32" alt="avatar" style={{objectFit:'cover'}}/>
        </Link>
        <div className="flex-grow-1">
          <Link to={authorLink} className="fw-bold text-dark text-decoration-none small">{authorName}</Link>
          <div className="text-muted" style={{fontSize: '0.75rem'}}>
            {formatTimestamp(sharedPost.created_at)}
            <span className="mx-1">•</span>
            {sharedPost.privacy_setting === 'PUBLIC' && <i className="bi bi-globe" title="Public"></i>}
            {sharedPost.privacy_setting === 'FRIENDS' && <i className="bi bi-people-fill" title="Friends"></i>}
            {sharedPost.privacy_setting === 'ONLY_ME' && <i className="bi bi-lock-fill" title="Only Me"></i>}
          </div>
        </div>
      </div>

      <div className="card-body py-2 px-3">
        <p className="card-text small mb-0">{sharedPost.text_content}</p>
      </div>

      {/* Media Gallery for shared post */}
      {hasMedia && (
        <div className="px-3 pb-2">
          <MediaGallery files={sharedPost.files} onFileClick={() => {}} />
        </div>
      )}

      {/* Nested shared post - recursive */}
      {isNestedShare && (
        <div className="mx-3 mb-2">
          <SharedPostContent sharedPost={sharedPost.shared_post} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------
// CommentItem Component with Reply Support
// ---------------------------------------------------------
function CommentItem({ comment, allComments, replyingTo, setReplyingTo, replyText, setReplyText, onReply }) {
  const [showReplies, setShowReplies] = useState(false)
  const replies = allComments.filter(c => c.parent_comment_id === comment.comment_id)

  return (
    <div className="mb-3">
      <div className="d-flex gap-2">
        <img 
          src={comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || 'User')}`} 
          className="rounded-circle" 
          width="32" 
          height="32"
          style={{objectFit: 'cover'}}
          alt={comment.commenter_name}
        />
        <div className="flex-grow-1">
          <div className="bg-light rounded p-2">
            <div className="fw-bold small">{comment.commenter_name}</div>
            <div className="small">{comment.text_content}</div>
          </div>
          <div className="d-flex gap-3 text-muted small ms-2 mt-1">
            <span>{formatTimestamp(comment.created_at)}</span>
            <button 
              className="btn btn-link btn-sm p-0 text-muted text-decoration-none"
              onClick={() => setReplyingTo(replyingTo === comment.comment_id ? null : comment.comment_id)}
            >
              Reply
            </button>
            {replies.length > 0 && (
              <button 
                className="btn btn-link btn-sm p-0 text-muted text-decoration-none"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.comment_id && (
            <form onSubmit={(e) => onReply(e, comment.comment_id)} className="d-flex gap-2 mt-2">
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder={`Reply to ${comment.commenter_name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={!replyText.trim()}
              >
                <i className="bi bi-send"></i>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setReplyingTo(null)}
              >
                <i className="bi bi-x"></i>
              </button>
            </form>
          )}

          {/* Nested Replies */}
          {showReplies && replies.length > 0 && (
            <div className="ms-4 mt-2 border-start border-2 ps-3">
              {replies.map(reply => (
                <div key={reply.comment_id} className="d-flex gap-2 mb-2">
                  <img 
                    src={reply.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.commenter_name || 'User')}`} 
                    className="rounded-circle" 
                    width="28" 
                    height="28"
                    style={{objectFit: 'cover'}}
                    alt={reply.commenter_name}
                  />
                  <div className="flex-grow-1">
                    <div className="bg-light rounded p-2">
                      <div className="fw-bold small">{reply.commenter_name}</div>
                      <div className="small">{reply.text_content}</div>
                    </div>
                    <div className="text-muted small ms-2 mt-1">
                      {formatTimestamp(reply.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// MediaGallery Component - Facebook-style media display
// ---------------------------------------------------------
function MediaGallery({ files, onFileClick }) {
  if (!files || files.length === 0) return null

  const renderMedia = (file, index, style = {}) => {
    const handleClick = () => onFileClick(file, index)
    
    if (file.kind === 'IMAGE') {
      return (
        <img 
          src={file.file_url} 
          alt={file.file_name}
          className="w-100 h-100"
          style={{ objectFit: 'cover', cursor: 'pointer', ...style }}
          onClick={handleClick}
        />
      )
    } else if (file.kind === 'VIDEO') {
      return (
        <div className="position-relative w-100 h-100" onClick={handleClick} style={{ cursor: 'pointer' }}>
          <video 
            src={file.file_url}
            className="w-100 h-100"
            style={{ objectFit: 'cover', ...style }}
          />
          <div className="position-absolute top-50 start-50 translate-middle">
            <i className="bi bi-play-circle-fill text-white" style={{ fontSize: '3rem', opacity: 0.9 }}></i>
          </div>
        </div>
      )
    } else {
      return (
        <div 
          className="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary text-white"
          onClick={handleClick}
          style={{ cursor: 'pointer', ...style }}
        >
          <i className="bi bi-file-earmark text-white" style={{ fontSize: '3rem' }}></i>
        </div>
      )
    }
  }

  // 1 file: full width
  if (files.length === 1) {
    return (
      <div style={{ maxHeight: '500px', overflow: 'hidden' }}>
        {renderMedia(files[0], 0)}
      </div>
    )
  }

  // 2 files: side by side
  if (files.length === 2) {
    return (
      <div className="d-flex" style={{ height: '300px', gap: '2px' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderMedia(files[0], 0)}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderMedia(files[1], 1)}
        </div>
      </div>
    )
  }

  // 3 files: 1 left, 2 stacked right
  if (files.length === 3) {
    return (
      <div className="d-flex" style={{ height: '400px', gap: '2px' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderMedia(files[0], 0)}
        </div>
        <div className="d-flex flex-column" style={{ flex: 1, gap: '2px' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderMedia(files[1], 1)}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderMedia(files[2], 2)}
          </div>
        </div>
      </div>
    )
  }

  // 4+ files: 1 left, 2 stacked right (third shows +N overlay)
  return (
    <div className="d-flex" style={{ height: '400px', gap: '2px' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderMedia(files[0], 0)}
      </div>
      <div className="d-flex flex-column" style={{ flex: 1, gap: '2px' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderMedia(files[1], 1)}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {renderMedia(files[2], 2)}
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-white"
            style={{ background: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontSize: '2rem', fontWeight: 'bold' }}
            onClick={() => onFileClick(files[2], 2)}
          >
            +{files.length - 3}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// MediaModal Component - Full screen media viewer with interactions
// ---------------------------------------------------------
function MediaModal({ file, allFiles, currentIndex, onClose, onNavigate }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(file.is_liked_by_me)
  const [likeCount, setLikeCount] = useState(file.stats?.likes || 0)
  const [commentCount, setCommentCount] = useState(file.stats?.comments || 0)
  const [loadingComments, setLoadingComments] = useState(false)

  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < allFiles.length - 1

  const handlePrev = () => {
    if (canGoPrev) onNavigate(currentIndex - 1)
  }

  const handleNext = () => {
    if (canGoNext) onNavigate(currentIndex + 1)
  }

  const handleLike = async () => {
    try {
      await interactionService.toggleReaction(file.file_id, 'FILE', 'LIKE')
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    } catch (e) {
      console.error("Like file error:", e)
    }
  }

  const handleShowComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      try {
        const res = await interactionService.getComments(file.file_id, 'FILE')
        setComments(res.data)
      } catch (e) {
        console.error("Load file comments error:", e)
      } finally {
        setLoadingComments(false)
      }
    }
    setShowComments(!showComments)
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    try {
      const res = await interactionService.createComment(file.file_id, 'FILE', commentText)
      setComments([...comments, res.data])
      setCommentCount(prev => prev + 1)
      setCommentText('')
    } catch (e) {
      console.error("Comment on file error:", e)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 bg-dark d-flex align-items-center justify-content-center"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        className="btn btn-light position-absolute top-0 end-0 m-3"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      >
        <i className="bi bi-x-lg"></i>
      </button>

      {/* Navigation Buttons */}
      {canGoPrev && (
        <button 
          className="btn btn-light position-absolute start-0 top-50 translate-middle-y ms-3"
          style={{ zIndex: 10000 }}
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        >
          <i className="bi bi-chevron-left"></i>
        </button>
      )}
      {canGoNext && (
        <button 
          className="btn btn-light position-absolute end-0 top-50 translate-middle-y me-3"
          style={{ zIndex: 10000 }}
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      )}

      {/* Main Content Area */}
      <div 
        className="d-flex w-100 h-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Media Display */}
        <div className="flex-grow-1 d-flex align-items-center justify-content-center bg-black">
          {file.kind === 'IMAGE' && (
            <img 
              src={file.file_url} 
              alt={file.file_name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
          {file.kind === 'VIDEO' && (
            <video 
              src={file.file_url}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          )}
          {file.kind === 'FILE' && (
            <div className="text-white text-center">
              <i className="bi bi-file-earmark" style={{ fontSize: '5rem' }}></i>
              <div className="mt-3">{file.file_name}</div>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-3">
                Download
              </a>
            </div>
          )}
        </div>

        {/* Right: Interaction Panel */}
        <div className="bg-white" style={{ width: '400px', overflowY: 'auto' }}>
          <div className="p-3">
            <h5 className="mb-3">{file.file_name}</h5>
            
            {/* Stats */}
            <div className="d-flex justify-content-between text-muted small mb-3 pb-3 border-bottom">
              <span>
                <i className={`bi bi-hand-thumbs-up-fill ${isLiked ? 'text-primary' : ''}`}></i>{' '}
                {likeCount === 0 ? 'No like' : likeCount === 1 ? '1 like' : `${likeCount} likes`}
              </span>
              <span>{commentCount} Comments</span>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 mb-3 pb-3 border-bottom">
              <button 
                className={`btn btn-sm flex-grow-1 ${isLiked ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={handleLike}
              >
                <i className="bi bi-hand-thumbs-up"></i> Like
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary flex-grow-1"
                onClick={handleShowComments}
              >
                <i className="bi bi-chat"></i> Comment
              </button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div>
                {loadingComments ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                  </div>
                ) : (
                  <>
                    {comments.length === 0 ? (
                      <p className="text-muted small text-center">No comments yet.</p>
                    ) : (
                      <div className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {comments.map(comment => (
                          <div key={comment.comment_id} className="mb-3">
                            <div className="d-flex gap-2">
                              <img 
                                src={comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || 'User')}`} 
                                className="rounded-circle" 
                                width="32" 
                                height="32"
                                style={{objectFit: 'cover'}}
                                alt={comment.commenter_name}
                              />
                              <div className="flex-grow-1">
                                <div className="bg-light rounded p-2">
                                  <div className="fw-bold small">{comment.commenter_name}</div>
                                  <div className="small">{comment.text_content}</div>
                                </div>
                                <div className="text-muted small ms-2 mt-1">
                                  {formatTimestamp(comment.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Comment Form */}
                    <form onSubmit={handleAddComment} className="d-flex gap-2">
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-sm"
                        disabled={!commentText.trim()}
                      >
                        <i className="bi bi-send"></i>
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}