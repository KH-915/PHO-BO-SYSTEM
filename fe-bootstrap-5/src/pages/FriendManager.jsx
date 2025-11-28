import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import friendService from '../services/friendService';
import Swal from 'sweetalert2';

export default function FriendManager() {
  const [users, setUsers] = useState([]); // List người lạ để kết bạn
  const [requests, setRequests] = useState([]); // List lời mời kết bạn
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Dùng useEffect load cả 2 danh sách song song
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, reqsRes] = await Promise.all([
          friendService.getSuggestions(),
          friendService.getFriendRequests()
        ]);
        setUsers(usersRes.data || []);
        setRequests(reqsRes.data || []);
      } catch (e) {
        console.error("Lỗi tải danh sách bạn bè", e);
        setUsers([]);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Gửi lời mời
  const handleAddFriend = async (userId, userName) => {
    try {
      await friendService.sendFriendRequest(userId);
      await Swal.fire({
        icon: 'success',
        title: 'Friend Request Sent!',
        text: `Friend request sent to ${userName}`,
        timer: 2000,
        showConfirmButton: false
      });
      // Remove from suggestions list
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Failed to send friend request. They may have already received your request.',
        confirmButtonColor: '#dc3545'
      });
    }
  };

  // Chấp nhận lời mời (Dùng request_id theo API)
  const handleAccept = async (requestId, userName) => {
    try {
      await friendService.acceptRequest(requestId);
      await Swal.fire({
        icon: 'success',
        title: 'Friend Request Accepted!',
        text: `You are now friends with ${userName}`,
        timer: 2000,
        showConfirmButton: false
      });
      // Xóa request khỏi list trên UI sau khi accept thành công
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Failed to accept friend request',
        confirmButtonColor: '#dc3545'
      });
    }
  };

  const handleReject = async (requestId) => {
    try {
      await friendService.rejectRequest(requestId);
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
      Swal.fire({
        icon: 'info',
        title: 'Request Rejected',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Failed to reject friend request',
        confirmButtonColor: '#dc3545'
      });
    }
  };

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Friends</h2>
      
      <div className="row">
        {/* Cột trái: Lời mời kết bạn */}
        <div className="col-md-5 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Friend Requests ({requests?.length || 0})</h5>
            </div>
            <div className="card-body" style={{maxHeight: '600px', overflowY: 'auto'}}>
              {(!requests || requests.length === 0) ? (
                <p className="text-muted text-center py-3">No pending requests</p>
              ) : (
                <div className="list-group list-group-flush">
                  {requests?.map(req => (
                    <div key={req.user_id} className="list-group-item d-flex align-items-center gap-3 py-3">
                      <img 
                        src={req.avatar_url || `https://ui-avatars.com/api/?name=${req.first_name}+${req.last_name}`}
                        className="rounded-circle"
                        width="50"
                        height="50"
                        style={{objectFit: 'cover'}}
                        alt={req.first_name}
                      />
                      <div className="flex-grow-1">
                        <div className="fw-bold">{req.first_name} {req.last_name}</div>
                        <small className="text-muted">wants to be friends</small>
                      </div>
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleAccept(req.user_id, `${req.first_name} ${req.last_name}`)}
                        >
                          <i className="bi bi-check-lg me-1"></i>
                          Accept
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleReject(req.user_id)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Tất cả người dùng */}
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">People You May Know ({filteredUsers.length})</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={{maxHeight: '540px', overflowY: 'auto'}}>
                {(!filteredUsers || filteredUsers.length === 0) ? (
                  <p className="text-muted text-center py-3">No users found</p>
                ) : (
                  <div className="row g-3">
                    {filteredUsers?.map(user => (
                      <div key={user.user_id} className="col-md-6">
                        <div className="card h-100 shadow-sm">
                          <div className="card-body d-flex align-items-center gap-3">
                            <img 
                              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`}
                              className="rounded-circle"
                              width="60"
                              height="60"
                              style={{objectFit: 'cover'}}
                              alt={`${user.first_name} ${user.last_name}`}
                            />
                            <div className="flex-grow-1">
                              <Link to={`/profile/${user.user_id}`} className="fw-bold text-decoration-none text-dark">
                                {user.first_name} {user.last_name}
                              </Link>
                              <div className="small text-muted">{user.email}</div>
                            </div>
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => handleAddFriend(user.user_id, `${user.first_name} ${user.last_name}`)}
                            >
                              <i className="bi bi-person-plus me-1"></i>
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}