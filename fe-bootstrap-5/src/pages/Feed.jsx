import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import postService from '../services/postService'
import { useAuth } from '../contexts/AuthContext'
import CreatePostWidget from '../components/CreatePostWidget' // Ensure path is correct
// If PostCard is in a separate file, import it. If defined in file, keep it.
// import PostCard from '../components/PostCard' 

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
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

  useEffect(() => { load() }, [])

  return (
    <div className="container">
      <div className="row">
        
        {/* --- LEFT SIDEBAR: Navigation Shortcuts --- */}
        <div className="col-md-3 d-none d-md-block">
          <div className="card shadow-sm border-0 sticky-top" style={{top: '80px', zIndex: 1}}>
            <div className="list-group list-group-flush">
              <Link to={`/profile/${user?.user_id}`} className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0">
                <img src={user?.profile_picture_url || 'https://via.placeholder.com/40'} className="rounded-circle" width="40" height="40" alt="me" />
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
              {posts.map(post => <PostCard key={post.post_id} post={post} />)}
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
                {/* Mock data for visualization */}
                {[1,2,3].map(i => (
                  <li key={i} className="list-group-item border-0 d-flex align-items-center gap-2 px-3 py-2">
                    <div className="position-relative">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} className="rounded-circle" width="35" height="35" />
                      <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{width: 10, height: 10}}></span>
                    </div>
                    <span className="small fw-bold">Friend Name {i}</span>
                  </li>
                ))}
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
function PostCard({ post }) {
  // Logic to determine Author Name/Avatar based on Schema Polymorphism
  const isUser = post.author_type === 'USER';
  const authorName = isUser 
    ? `${post.author_first_name} ${post.author_last_name}` 
    : post.page_name;
  
  // Link to either Profile ID or Page ID
  const authorLink = isUser 
    ? `/profile/${post.author_id}` 
    : `/pages/${post.author_id}`;

  const authorAvatar = post.author_avatar || 'https://via.placeholder.com/50';
  const hasMedia = post.attachments && post.attachments.length > 0;

  return (
    <div className="card mb-3 shadow-sm border-0">
      <div className="card-header bg-white border-0 d-flex align-items-center pt-3 pb-2">
        <Link to={authorLink}>
          <img src={authorAvatar} className="rounded-circle me-2" width="40" height="40" alt="avatar" style={{objectFit:'cover'}}/>
        </Link>
        <div>
          <Link to={authorLink} className="fw-bold text-dark text-decoration-none">{authorName}</Link>
          <div className="text-muted small d-flex align-items-center">
            {new Date(post.created_at).toLocaleString()}
            <span className="mx-1">•</span>
            {/* Privacy Icon based on Enum */}
            {post.privacy_setting === 'PUBLIC' && <i className="bi bi-globe" title="Public"></i>}
            {post.privacy_setting === 'FRIENDS' && <i className="bi bi-people-fill" title="Friends"></i>}
            {post.privacy_setting === 'ONLY_ME' && <i className="bi bi-lock-fill" title="Only Me"></i>}
          </div>
        </div>
      </div>

      <div className="card-body pt-1">
        <p className="card-text">{post.text_content}</p>
      </div>

      {hasMedia && (
        <img 
          src={post.attachments[0].file_url} 
          className="img-fluid w-100" 
          alt="Post content" 
          style={{maxHeight: '500px', objectFit: 'cover'}} 
        />
      )}

      {/* Footer Stats (Optional) */}
      <div className="px-3 py-2 d-flex justify-content-between text-muted small border-bottom">
        <span><i className="bi bi-hand-thumbs-up-fill text-primary"></i> 12</span>
        <span>4 Comments</span>
      </div>

      <div className="card-footer bg-white d-flex justify-content-between border-0 pb-3">
        <button className="btn btn-light text-muted flex-grow-1"><i className="bi bi-hand-thumbs-up"></i> Like</button>
        <button className="btn btn-light text-muted flex-grow-1"><i className="bi bi-chat"></i> Comment</button>
        <button className="btn btn-light text-muted flex-grow-1"><i className="bi bi-share"></i> Share</button>
      </div>
    </div>
  )
}