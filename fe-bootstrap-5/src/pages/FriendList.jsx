import React, { useEffect, useState } from 'react'
import { getFriends, unfriend } from '../services/friendService'
import { DEFAULT_AVATAR } from '../lib/placeholders'

export default function FriendList(){
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    getFriends().then(data=>{ if(mounted) setFriends(data) }).catch(()=>{}).finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  },[])

  const handleUnfriend = async (userId)=>{
    if(!confirm('Unfriend this user?')) return
    try{
      await unfriend(userId)
      setFriends(prev => prev.filter(f => f.user_id !== userId))
    }catch(e){
      alert('Unfriend failed')
    }
  }

  if(loading) return <div>Loading...</div>
  if(friends.length === 0) return <div className="text-muted">You have no friends yet</div>

  return (
    <ul className="list-group">
      {friends.map(f => (
        <li key={f.user_id} className="list-group-item d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <img src={f.avatar_url || DEFAULT_AVATAR} className="rounded-circle me-2" style={{width:40,height:40,objectFit:'cover'}} />
            <div>{f.first_name} {f.last_name}</div>
          </div>
          <div>
            <button className="btn btn-sm btn-outline-danger" onClick={()=>handleUnfriend(f.user_id)}>Unfriend</button>
          </div>
        </li>
      ))}
    </ul>
  )
}
