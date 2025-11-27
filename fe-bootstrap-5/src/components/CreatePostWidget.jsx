import React, { useState } from 'react';
import { createPost } from '../services/api';

export default function CreatePostWidget({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      // Gọi API POST /api/posts với body { content }
      await createPost(content);
      setContent('');
      if (onPostCreated) onPostCreated(); // Refresh feed
    } catch (error) {
      alert('Lỗi khi đăng bài');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <textarea 
          className="form-control mb-2" 
          rows="3" 
          placeholder="Bạn đang nghĩ gì?"
          value={content}
          onChange={e => setContent(e.target.value)}
        ></textarea>
        <div className="d-flex justify-content-end">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang đăng...' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}