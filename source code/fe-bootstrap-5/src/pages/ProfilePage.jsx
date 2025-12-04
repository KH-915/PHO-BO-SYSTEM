import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import friendService from '../services/friendService';
import CreatePostWidget from '../components/CreatePostWidget';
import PostCard from '../components/PostCard';
import MediaModal from '../components/MediaModal';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [zoomedMedia, setZoomedMedia] = useState(null);

  const isOwnProfile = currentUser && currentUser.user_id === parseInt(userId);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, postsRes] = await Promise.all([
        userService.getUserProfile(userId),
        userService.getUserPosts(userId)
      ]);
      console.log('Profile data:', profileRes.data); // Debug log
      setProfile(profileRes.data);
      setPosts(postsRes.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      await friendService.sendFriendRequest(parseInt(userId));
      await loadProfileData(); // Reload to update friendship status
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Lỗi khi gửi lời mời kết bạn');
    }
  };

  const handleAcceptFriend = async () => {
    try {
      await friendService.acceptFriendRequest(parseInt(userId));
      await loadProfileData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Lỗi khi chấp nhận lời mời');
    }
  };

  const handleUnfriend = async () => {
    if (!confirm('Bạn có chắc muốn hủy kết bạn?')) return;
    try {
      await friendService.unfriend(parseInt(userId));
      await loadProfileData();
    } catch (error) {
      console.error('Error unfriending:', error);
      alert('Lỗi khi hủy kết bạn');
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">Không tìm thấy người dùng</div>
      </div>
    );
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Người dùng';

  return (
    <div className="container mt-4">
      {/* Cover Photo & Avatar */}
      <div className="card mb-4">
        {profile.cover_photo_url ? (
          <img 
            src={profile.cover_photo_url} 
            className="card-img-top" 
            alt="cover"
            style={{height: '300px', objectFit: 'cover'}}
          />
        ) : (
          <div 
            className="card-img-top" 
            style={{height: '300px', backgroundColor: '#dee2e6'}}
          ></div>
        )}
        <div className="card-body">
          <div className="d-flex align-items-start">
            {/* Avatar */}
            <div style={{marginTop: '-80px', marginRight: '20px'}}>
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  className="rounded-circle border border-4 border-white" 
                  width="150" 
                  height="150"
                  alt="avatar"
                  style={{objectFit: 'cover'}}
                />
              ) : (
                <div 
                  className="rounded-circle border border-4 border-white bg-secondary d-flex align-items-center justify-content-center text-white"
                  style={{width: '150px', height: '150px', fontSize: '48px', fontWeight: 'bold'}}
                >
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name & Actions */}
            <div className="flex-grow-1">
              <h2 className="mb-1">{fullName}</h2>
              {profile.bio && <p className="text-muted">{profile.bio}</p>}
              
              {/* Friend Action Buttons */}
              {!isOwnProfile && currentUser && (
                <div className="mt-3">
                  {profile.friendship_status === 'NONE' && (
                    <button className="btn btn-primary" onClick={handleAddFriend}>
                      <i className="bi bi-person-plus me-2"></i>Kết bạn
                    </button>
                  )}
                  {profile.friendship_status === 'PENDING' && (
                    <button className="btn btn-warning" disabled>
                      <i className="bi bi-clock me-2"></i>Đã gửi lời mời
                    </button>
                  )}
                  {profile.friendship_status === 'ACCEPTED' && (
                    <button className="btn btn-outline-danger" onClick={handleUnfriend}>
                      <i className="bi bi-person-dash me-2"></i>Hủy kết bạn
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <i className="bi bi-file-post me-2"></i>Bài viết
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <i className="bi bi-info-circle me-2"></i>Giới thiệu
          </button>
        </li>
      </ul>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {/* Create Post Widget - only on own profile */}
          {isOwnProfile && (
            <CreatePostWidget onPostCreated={loadProfileData} />
          )}

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="alert alert-info">
              {isOwnProfile ? 'Bạn chưa có bài viết nào' : 'Người dùng chưa có bài viết nào'}
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.post_id} post={post} />
            ))
          )}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title mb-3">Thông tin cá nhân</h5>
            
            <div className="row mb-3">
              <div className="col-md-3 fw-bold">Họ và tên:</div>
              <div className="col-md-9">{fullName}</div>
            </div>
            
            {profile.email && (
              <div className="row mb-3">
                <div className="col-md-3 fw-bold">Email:</div>
                <div className="col-md-9">{profile.email}</div>
              </div>
            )}
            
            {profile.phone_number && (
              <div className="row mb-3">
                <div className="col-md-3 fw-bold">Số điện thoại:</div>
                <div className="col-md-9">{profile.phone_number}</div>
              </div>
            )}
            
            {profile.date_of_birth && (
              <div className="row mb-3">
                <div className="col-md-3 fw-bold">Ngày sinh:</div>
                <div className="col-md-9">{new Date(profile.date_of_birth).toLocaleDateString('vi-VN')}</div>
              </div>
            )}
            
            {profile.gender && (
              <div className="row mb-3">
                <div className="col-md-3 fw-bold">Giới tính:</div>
                <div className="col-md-9">
                  {profile.gender === 'MALE' && 'Nam'}
                  {profile.gender === 'FEMALE' && 'Nữ'}
                  {profile.gender === 'OTHER' && 'Khác'}
                </div>
              </div>
            )}
            
            {profile.bio && (
              <div className="row mb-3">
                <div className="col-md-3 fw-bold">Giới thiệu:</div>
                <div className="col-md-9">{profile.bio}</div>
              </div>
            )}

            {!isOwnProfile && !profile.email && (
              <div className="alert alert-info mt-3">
                <i className="bi bi-info-circle me-2"></i>
                Một số thông tin cá nhân chỉ hiển thị với chủ tài khoản
              </div>
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
  );
}
