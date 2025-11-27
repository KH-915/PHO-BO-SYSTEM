import React, { useEffect, useState } from 'react';
import { getAllUsers, getFriendRequests, sendFriendRequest, acceptFriendRequest } from '../services/api';

export default function FriendManager() {
  const [users, setUsers] = useState([]); // List người lạ để kết bạn
  const [requests, setRequests] = useState([]); // List lời mời kết bạn

  // 3. Dùng useEffect load cả 2 danh sách song song
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, reqsRes] = await Promise.all([
          getAllUsers(),
          getFriendRequests()
        ]);
        setUsers(usersRes.data);
        setRequests(reqsRes.data);
      } catch (e) {
        console.error("Lỗi tải danh sách bạn bè");
      }
    };
    fetchData();
  }, []);

  // Gửi lời mời
  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      alert("Đã gửi lời mời!");
    } catch (e) {
      alert("Lỗi gửi lời mời (Có thể đã gửi rồi)");
    }
  };

  // Chấp nhận lời mời (Dùng request_id theo API)
  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      // Xóa request khỏi list trên UI sau khi accept thành công
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
    } catch (e) {
      alert("Lỗi chấp nhận kết bạn");
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        {/* Cột trái: Lời mời kết bạn */}
        <div className="col-md-6">
          <h4>Lời mời kết bạn ({requests.length})</h4>
          <ul className="list-group">
            {requests.map(req => (
              <li key={req.request_id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{req.from_user?.first_name} muốn kết bạn</span>
                <button className="btn btn-success btn-sm" onClick={() => handleAccept(req.request_id)}>
                  Chấp nhận
                </button>
              </li>
            ))}
            {requests.length === 0 && <p className="text-muted">Không có lời mời nào.</p>}
          </ul>
        </div>

        {/* Cột phải: Gợi ý kết bạn (All Users) */}
        <div className="col-md-6">
          <h4>Gợi ý kết bạn</h4>
          <ul className="list-group">
            {users.map(user => (
              <li key={user.user_id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{user.first_name} {user.last_name}</span>
                <button className="btn btn-outline-primary btn-sm" onClick={() => handleAddFriend(user.user_id)}>
                  Thêm bạn
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}