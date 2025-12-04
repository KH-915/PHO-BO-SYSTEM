import React, { useState, useEffect } from 'react';
import { getComments, createComment, toggleReaction } from '../services/interactionService';

export default function PostCard({ post }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [likes, setLikes] = useState(post.like_count || 0);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    try {
      const res = await getComments(post.post_id, 'POST');
      setComments(res.data);
    } catch (error) {
      console.error("Lỗi tải comment");
    }
  };

  const handleSendComment = async (e) => {
    if (e.key === 'Enter' && commentText.trim()) {
      try {
        await createComment(post.post_id, 'POST', commentText);
        setCommentText('');
        fetchComments();
      } catch (error) {
        alert("Lỗi gửi comment");
      }
    }
  };

  const handleLike = async () => {
    try {
      await toggleReaction(post.post_id, 'POST', 'LIKE');
      setLikes(prev => prev + 1);
    } catch (error) {
      if(error.response?.status === 400) alert("Bạn đã like bài này rồi!");
    }
  };

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        {/* Author Header */}
        <div className="d-flex align-items-center mb-3">
          {post.author_avatar ? (
            <img 
              src={post.author_avatar} 
              className="rounded-circle me-2" 
              width="40" 
              height="40"
              alt="avatar"
              style={{objectFit: 'cover'}}
            />
          ) : (
            <div 
              className="rounded-circle me-2 bg-secondary d-flex align-items-center justify-content-center text-white"
              style={{width: '40px', height: '40px', fontSize: '16px'}}
            >
              {post.author_name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <div className="fw-bold">{post.author_name || "Unknown User"}</div>
            <small className="text-muted">
              {post.created_at && new Date(post.created_at).toLocaleString()}
              {post.location && (
                <span className="ms-2">
                  <i className="bi bi-geo-alt me-1"></i>
                  {post.location.type === 'GROUP' && `trong ${post.location.name}`}
                  {post.location.type === 'PAGE' && `tại ${post.location.name}`}
                </span>
              )}
            </small>
          </div>
        </div>

        {/* Post Content */}
        <p className="card-text">{post.text_content || post.content}</p>
        
        {/* Display files if any */}
        {post.files && post.files.length > 0 && (
          <div className="mt-2 mb-3">
            {post.files.map((file, idx) => (
              <div key={idx} className="mb-2">
                {file.file_type?.startsWith('image/') ? (
                  <img 
                    src={file.file_url} 
                    alt="post" 
                    className="img-fluid rounded"
                    style={{maxHeight: '400px', width: '100%', objectFit: 'cover'}}
                  />
                ) : file.file_type?.startsWith('video/') ? (
                  <video 
                    src={file.file_url} 
                    controls 
                    className="w-100 rounded"
                    style={{maxHeight: '400px'}}
                  />
                ) : (
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                    <i className="bi bi-paperclip me-1"></i>
                    {file.file_url.split('/').pop()}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <hr />
        
        {/* Action Buttons */}
        <div className="d-flex gap-2">
          <button className="btn btn-light btn-sm" onClick={handleLike}>
            <i className="bi bi-hand-thumbs-up me-1"></i>
            Like ({likes})
          </button>
          <button className="btn btn-light btn-sm" onClick={() => setShowComments(!showComments)}>
            <i className="bi bi-chat me-1"></i>
            Bình luận
          </button>
          <button className="btn btn-light btn-sm">
            <i className="bi bi-share me-1"></i>
            Chia sẻ
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 bg-light p-3 rounded">
            {/* List comments */}
            <div className="mb-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
              {comments.length === 0 ? (
                <p className="text-muted small">Chưa có bình luận nào</p>
              ) : (
                comments.map(c => (
                  <div key={c.comment_id} className="mb-2">
                    <strong>{c.commenter_name || c.commenter?.first_name || 'User'}: </strong> 
                    <span>{c.text_content || c.content}</span>
                  </div>
                ))
              )}
            </div>
            
            {/* Input comment */}
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Viết bình luận... (Enter để gửi)" 
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={handleSendComment}
            />
          </div>
        )}
      </div>
    </div>
  );
}