import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import pageService from '../services/pageService'
import postService from '../services/postService'
import interactionService from '../services/interactionService'
import Swal from 'sweetalert2'
import { useAuth } from '../contexts/AuthContext'
import CreatePostWidget from '../components/CreatePostWidget'
import MediaModal from '../components/MediaModal'

// Helper function to format timestamp
const formatTimestamp = (dateString) => {
  const date = new Date(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = String(date.getFullYear()).slice(-2)
  return `${hours}:${minutes}-${month}/${year}`
}

export default function PageDetail() {
  const { pageId } = useParams()
  const [page, setPage] = useState(null)
  const [posts, setPosts] = useState([])
  const [roles, setRoles] = useState([])
  const [activeTab, setActiveTab] = useState('discussion') // discussion, about, roles
  const [loading, setLoading] = useState(true)
  const [zoomedMedia, setZoomedMedia] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadPageData()
  }, [pageId])

  const loadPageData = async () => {
    setLoading(true)
    try {
      const pageRes = await pageService.getPage(pageId)
      setPage(pageRes.data)
      
      // Load posts (always public for pages)
      const postsRes = await pageService.getPagePosts(pageId)
      setPosts(postsRes.data || [])
      
      // Load roles if admin
      if (pageRes.data.my_role === 'ADMIN') {
        const rolesRes = await pageService.getPageRoles(pageId)
        setRoles(rolesRes.data || [])
      }
    } catch (error) {
      console.error('Load page error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.detail || 'Failed to load page'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      await pageService.followPage(pageId)
      loadPageData()
      Swal.fire({ icon: 'success', title: 'Followed!', timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Error following page' })
    }
  }

  const handleUnfollow = async () => {
    try {
      await pageService.unfollowPage(pageId)
      loadPageData()
      Swal.fire({ icon: 'success', title: 'Unfollowed', timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Error unfollowing page' })
    }
  }

  const handleAddRole = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add Page Role',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label for="user-email" class="form-label fw-bold">User Email *</label>
            <input id="user-email" type="email" class="form-control" placeholder="user@example.com" required>
          </div>
          
          <div class="mb-3">
            <label for="role-select" class="form-label fw-bold">Role *</label>
            <select id="role-select" class="form-select">
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="MODERATOR">Moderator</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Role',
      confirmButtonColor: '#0d6efd',
      width: '500px',
      preConfirm: () => {
        const email = document.getElementById('user-email').value.trim()
        const role = document.getElementById('role-select').value
        
        if (!email) {
          Swal.showValidationMessage('Email is required')
          return false
        }
        
        return { email, role }
      }
    })

    if (formValues) {
      try {
        await pageService.assignPageRole(pageId, formValues.email, formValues.role)
        await Swal.fire({
          icon: 'success',
          title: 'Role Added!',
          timer: 1500,
          showConfirmButton: false
        })
        loadPageData()
      } catch (error) {
        console.error('Add role error:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.detail || 'Failed to add role'
        })
      }
    }
  }

  const handleRemoveRole = async (userId) => {
    const result = await Swal.fire({
      title: 'Remove Role?',
      text: 'This user will no longer have access to manage this page.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#dc3545'
    })

    if (result.isConfirmed) {
      try {
        await pageService.removePageRole(pageId, userId)
        await Swal.fire({
          icon: 'success',
          title: 'Role Removed',
          timer: 1500,
          showConfirmButton: false
        })
        loadPageData()
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to remove role'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Page not found</div>
      </div>
    )
  }

  const isFollowed = page.is_followed
  const hasRole = page.my_role !== null
  const isAdmin = page.my_role === 'ADMIN'

  return (
    <div className="container mt-4">
      {/* Page Header */}
      <div className="card mb-4">
        <div 
          className="card-img-top" 
          style={{height: '250px', backgroundColor: '#dee2e6'}}
        ></div>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2>{page.name}</h2>
              <div className="text-muted mb-2">
                {page.category && (
                  <span className="badge bg-secondary me-2">{page.category}</span>
                )}
                <i className="bi bi-people me-1"></i>{page.follower_count || 0} {page.follower_count === 1 ? 'follower' : 'followers'}
                {hasRole && (
                  <span className="badge bg-primary ms-2">
                    <i className="bi bi-shield-check me-1"></i>{page.my_role}
                  </span>
                )}
              </div>
              {page.description && <p className="text-muted">{page.description}</p>}
            </div>
            <div>
              {!hasRole && (
                <>
                  {!isFollowed ? (
                    <button className="btn btn-primary" onClick={handleFollow}>
                      <i className="bi bi-plus-circle me-2"></i>Follow
                    </button>
                  ) : (
                    <button className="btn btn-outline-secondary" onClick={handleUnfollow}>
                      <i className="bi bi-check-circle me-2"></i>Following
                    </button>
                  )}
                </>
              )}
              {isAdmin && (
                <button className="btn btn-outline-primary ms-2" onClick={handleAddRole}>
                  <i className="bi bi-person-plus me-2"></i>Add Role
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'discussion' ? 'active' : ''}`}
            onClick={() => setActiveTab('discussion')}
          >
            <i className="bi bi-file-post me-2"></i>Posts
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <i className="bi bi-info-circle me-2"></i>About
          </button>
        </li>
        {isAdmin && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <i className="bi bi-people me-2"></i>Roles
            </button>
          </li>
        )}
      </ul>

      {/* Discussion Tab */}
      {activeTab === 'discussion' && (
        <div>
          {hasRole && (
            <CreatePostWidget 
              onPostCreated={loadPageData} 
              pageId={pageId}
              pageName={page.name}
            />
          )}
          
          {posts.length === 0 ? (
            <div className="alert alert-info">No posts yet. Be the first to post!</div>
          ) : (
            posts.map(post => (
              <PostCard key={post.post_id} post={post} onUpdate={loadPageData} />
            ))
          )}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="card">
          <div className="card-body">
            <h4 className="mb-4">About This Page</h4>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <strong>Page Name:</strong>
                  <p className="text-muted">{page.name}</p>
                </div>
                {page.username && (
                  <div className="mb-3">
                    <strong>Username:</strong>
                    <p className="text-muted">@{page.username}</p>
                  </div>
                )}
                {page.category && (
                  <div className="mb-3">
                    <strong>Category:</strong>
                    <p className="text-muted">{page.category}</p>
                  </div>
                )}
              </div>
              <div className="col-md-6">
                {page.description && (
                  <div className="mb-3">
                    <strong>Description:</strong>
                    <p className="text-muted">{page.description}</p>
                  </div>
                )}
                {page.contact_info && (
                  <div className="mb-3">
                    <strong>Contact Information:</strong>
                    <p className="text-muted">{JSON.stringify(page.contact_info)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab (Admin Only) */}
      {activeTab === 'roles' && isAdmin && (
        <div className="card">
          <div className="card-header bg-white">
            <h5 className="mb-0">Page Roles</h5>
          </div>
          <div className="list-group list-group-flush">
            {roles.length === 0 ? (
              <div className="list-group-item text-center text-muted">
                No roles assigned yet
              </div>
            ) : (
              roles.map(role => (
                <div key={role.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>User ID: {role.user_id}</strong>
                    <span className="badge bg-primary ms-2">{role.role}</span>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleRemoveRole(role.user_id)}
                  >
                    <i className="bi bi-trash"></i> Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Media Modal */}
      {zoomedMedia && (
        <MediaModal 
          mediaUrl={zoomedMedia.url}
          mediaType={zoomedMedia.type}
          onClose={() => setZoomedMedia(null)}
        />
      )}
    </div>
  )
}

// PostCard Component (simplified version for pages)
function PostCard({ post, onUpdate }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me)
  const [likeCount, setLikeCount] = useState(post.stats?.likes || 0)
  const [commentCount, setCommentCount] = useState(post.stats?.comments || 0)
  const [loadingComments, setLoadingComments] = useState(false)

  const authorName = post.author_name || 'Page'
  const authorAvatar = post.author_avatar || 'https://ui-avatars.com/api/?name=Page'

  const handleLike = async () => {
    try {
      await interactionService.toggleReaction(post.post_id, 'POST', 'LIKE')
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    } catch (e) {
      console.error("Like error:", e)
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
    }
  }

  return (
    <div className="card mb-3 shadow-sm border-0">
      <div className="card-header bg-white border-0 d-flex align-items-center pt-3 pb-2">
        <img src={authorAvatar} className="rounded-circle me-2" width="40" height="40" alt="avatar" style={{objectFit:'cover'}}/>
        <div>
          <div className="fw-bold">{authorName}</div>
          <div className="text-muted small">
            {formatTimestamp(post.created_at)}
            <span className="mx-1">•</span>
            <i className="bi bi-globe me-1" title="Public"></i>
            <span>Public</span>
          </div>
        </div>
      </div>

      <div className="card-body pt-1">
        <p className="card-text">{post.text_content}</p>
      </div>

      {/* Media Display */}
      {post.files && post.files.length > 0 && (
        <div className="px-0">
          {post.files.map((file, idx) => (
            <div key={idx}>
              {file.kind === 'IMAGE' && (
                <img 
                  src={file.file_url} 
                  alt={file.file_name}
                  className="w-100"
                  style={{ maxHeight: '500px', objectFit: 'cover' }}
                />
              )}
              {file.kind === 'VIDEO' && (
                <video 
                  src={file.file_url}
                  controls
                  className="w-100"
                  style={{ maxHeight: '500px' }}
                />
              )}
            </div>
          ))}
        </div>
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
                  {comments.map(comment => (
                    <div key={comment.comment_id} className="mb-3">
                      <div className="d-flex gap-2">
                        <img 
                          src={comment.commenter_avatar || 'https://ui-avatars.com/api/?name=User'} 
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
  )
}
