import React, { useState } from 'react';
import postService from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function CreatePostWidget({ onPostCreated, groupId = null, groupPrivacy = null, pageId = null, pageName = null }) {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC'); // Privacy không được chọn khi đăng trong group/page
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const { user } = useAuth();

  // Xác định xem có đang đăng trong group hoặc page không
  const isGroupPost = groupId !== null;
  const isPagePost = pageId !== null;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    // Create previews
    const newPreviews = selectedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
    }));

    setFiles([...files, ...selectedFiles]);
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    setLoading(true);
    try {
      // Upload files first
      const fileIds = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await api.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          fileIds.push(response.data.file_id);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          const errorMsg = uploadError.response?.data?.detail || 'Failed to upload file';
          
          if (errorMsg.includes('unavailable') || errorMsg.includes('not configured')) {
            alert('File upload is not configured on the server. Please configure Cloudinary credentials in the backend .env file.\n\nFor now, you can post without attachments.');
            // Clear files and continue with text-only post
            previews.forEach(p => URL.revokeObjectURL(p.url));
            setFiles([]);
            setPreviews([]);
            return;
          } else {
            throw uploadError;
          }
        }
      }

      // Create post with file IDs
      const postData = {
        text_content: content,
        file_ids: fileIds
      };
      
      // Add location if posting to a group or page
      if (groupId) {
        postData.location_type = 'GROUP';
        postData.location_id = parseInt(groupId);
        // Privacy tự động là PUBLIC khi đăng trong group, không gửi privacy_setting
      } else if (pageId) {
        postData.location_type = 'PAGE_TIMELINE';
        postData.location_id = parseInt(pageId);
        // Privacy tự động là PUBLIC khi đăng trên page, không gửi privacy_setting
      } else {
        // Chỉ có privacy_setting khi đăng trên timeline
        postData.privacy_setting = privacy;
      }
      
      await postService.createPost(postData);

      // Reset form
      setContent('');
      setPrivacy('PUBLIC');
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setFiles([]);
      setPreviews([]);
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error('Post creation error:', error);
      const errorDetail = error.response?.data?.detail;
      if (errorDetail && typeof errorDetail === 'string') {
        alert(`Error: ${errorDetail}`);
      } else {
        alert('Lỗi khi đăng bài');
      }
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
          placeholder={isGroupPost ? `Write something in this group...` : isPagePost ? `Post as ${pageName}...` : `Bạn đang nghĩ gì?`}
          value={content}
          onChange={e => setContent(e.target.value)}
        ></textarea>
        
        {/* File Previews */}
        {previews.length > 0 && (
          <div className="mb-2 d-flex flex-wrap gap-2">
            {previews.map((preview, idx) => (
              <div key={idx} className="position-relative" style={{ width: '100px', height: '100px' }}>
                {preview.type === 'image' ? (
                  <img src={preview.url} alt="" className="w-100 h-100" style={{ objectFit: 'cover', borderRadius: '8px' }} />
                ) : preview.type === 'video' ? (
                  <video src={preview.url} className="w-100 h-100" style={{ objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary text-white" style={{ borderRadius: '8px' }}>
                    📄
                  </div>
                )}
                <button 
                  type="button"
                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                  style={{ padding: '0 6px', fontSize: '12px' }}
                  onClick={() => removeFile(idx)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2 align-items-center">
            {/* Chỉ hiện privacy selector khi KHÔNG đăng trong group hoặc page */}
            {!isGroupPost && !isPagePost && (
              <select 
                className="form-select w-auto"
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
              >
                <option value="PUBLIC">Công khai</option>
                <option value="FRIENDS">Bạn bè</option>
                <option value="ONLY_ME">Chỉ mình tôi</option>
              </select>
            )}
            {isGroupPost && (
              <small className="text-muted">
                {groupPrivacy === 'PUBLIC' ? '🌐 Group công khai - Ai cũng xem được' : '🔒 Group riêng tư - Chỉ thành viên xem được'}
              </small>
            )}
            <label className="btn btn-outline-secondary btn-sm mb-0">
              Ảnh/Video
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*"
                className="d-none"
                onChange={handleFileChange}
              />
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || (!content.trim() && files.length === 0)}>
            {loading ? 'Đang đăng...' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}