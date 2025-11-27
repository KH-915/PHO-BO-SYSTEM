import React, { useEffect, useState } from 'react'
import { getFriendRequests, acceptRequest, rejectRequest } from '../services/friendService'

export default function FriendRequests() {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    // Backend: Query FRIENDSHIPS where status='PENDING' AND user_two_id = current_user
    getFriendRequests().then(data => setRequests(data)).catch(console.error)
  }, [])

  const respond = async (userId, action) => {
    try {
      // Action: 'accept' updates status to 'ACCEPTED', 'reject' deletes row
      if(action === 'accept') await acceptRequest(userId)
      else await rejectRequest(userId)
      setRequests(prev => prev.filter(r => r.user_id !== userId))
    } catch (e) { alert('Action failed') }
  }

  return (
    <div className="container mt-4">
      <h4>Friend Requests</h4>
      <div className="row g-3">
        {requests.map(req => (
          <div key={req.user_id} className="col-12 col-md-4">
            <div className="card">
              <div className="card-body d-flex align-items-center">
                <img src={req.profile_picture_url || 'https://via.placeholder.com/60'} className="rounded-circle me-3" width="60" height="60" />
                <div>
                  <h6 className="card-title mb-1">{req.first_name} {req.last_name}</h6>
                  <div className="d-flex gap-2 mt-2">
                    <button onClick={() => respond(req.user_id, 'accept')} className="btn btn-sm btn-primary">Confirm</button>
                    <button onClick={() => respond(req.user_id, 'reject')} className="btn btn-sm btn-secondary">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {requests.length === 0 && <p className="text-muted">No pending requests.</p>}
      </div>
    </div>
  )
}