import React, { useEffect, useState } from 'react'
import { getFriendRequests, acceptRequest, rejectRequest } from '../services/friendService'
import { DEFAULT_THUMB } from '../lib/placeholders'

export default function FriendRequests(){
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    getFriendRequests().then(data => { if(mounted) setRequests(data) }).catch(()=>{}).finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  },[])

  const handleAccept = async (userId)=>{
    try{
      await acceptRequest(userId)
      setRequests(prev => prev.filter(r => r.user_id !== userId))
    }catch(e){
      alert('Accept failed')
    }
  }

  const handleReject = async (userId)=>{
    try{
      await rejectRequest(userId)
      setRequests(prev => prev.filter(r => r.user_id !== userId))
    }catch(e){
      alert('Reject failed')
    }
  }

  if(loading) return <div>Loading...</div>
  if(requests.length === 0) return (
    <div className="text-center text-muted">No friend requests</div>
  )

  return (
    <div className="row row-cols-1 row-cols-md-3 g-4">
      {requests.map(r=> (
        <div key={r.user_id} className="col">
          <div className="card h-100">
            <img src={r.avatar_url || DEFAULT_THUMB} className="card-img-top" alt="avatar" style={{height:180, objectFit:'cover'}} />
            <div className="card-body text-center">
              <h5 className="card-title">{r.first_name} {r.last_name}</h5>
              <p className="text-muted small">5 mutual friends</p>
            </div>
            <div className="card-footer d-grid gap-2">
              <button className="btn btn-primary w-100" onClick={()=>handleAccept(r.user_id)}>Confirm</button>
              <button className="btn btn-secondary w-100" onClick={()=>handleReject(r.user_id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
