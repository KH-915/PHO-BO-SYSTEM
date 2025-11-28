import React, { useState, useEffect } from 'react';
import { getCommentsApi, createCommentApi, reactApi } from '../services/api';

export default function PostCard({ post }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [likes, setLikes] = useState(post.like_count || 0); // Giả sử backend trả về số like

  // 2. Dùng useEffect để load comments khi người dùng bấm nút "Bình luận"
  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]); // Chạy lại khi showComments thay đổi thành true

  const fetchComments = async () => {
    try {
      const res = await getCommentsApi(post.post_id);
      setComments(res.data);
    } catch (error) {
      console.error("Lỗi tải comment");
    }
  };

  const handleSendComment = async (e) => {
    if (e.key === 'Enter' && commentText.trim()) {
      try {
        await createCommentApi(post.post_id, commentText);
        setCommentText('');
        fetchComments(); // Refresh list comment
      } catch (error) {
        alert("Lỗi gửi comment");
      }
    }
  };

  const handleLike = async () => {
    try {
      await reactApi(post.post_id, 'like');
      setLikes(prev => prev + 1); // Tăng like ở frontend để UX mượt hơn
    } catch (error) {
      // Backend trả lỗi nếu đã like rồi (theo bảng API mô tả)
      if(error.response?.status === 400) alert("Bạn đã like bài này rồi!");
    }
  };

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <h6 className="card-title fw-bold">{post.author?.first_name || "Unknown User"}</h6>
        <p className="card-text">{post.content}</p>
        <hr />
        
        {/* Action Buttons */}
        <div className="d-flex gap-2">
          <button className="btn btn-light btn-sm" onClick={handleLike}>
            <i className="bi bi-hand-thumbs-up"></i> Like ({likes})
          </button>
          <button className="btn btn-light btn-sm" onClick={() => setShowComments(!showComments)}>
            <i className="bi bi-chat"></i> Bình luận
          </button>
        </div>

        {/* Khu vực Comments */}
        {showComments && (
          <div className="mt-3 bg-light p-3 rounded">
            {/* List comments */}
            <div className="mb-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
              {comments.map(c => (
                <div key={c.comment_id} className="mb-2">
                  <strong>{c.commenter?.first_name}: </strong> 
                  <span>{c.content}</span>
                </div>
              ))}
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