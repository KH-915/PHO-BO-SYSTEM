import React, { useEffect, useState } from 'react'
import { getSuggestions, sendFriendRequest } from '../services/friendService'
import { DEFAULT_AVATAR } from '../lib/placeholders'

export default function RightSidebar(){
  const [suggestions, setSuggestions] = useState([])
  const [sending, setSending] = useState({})

  useEffect(() => {
    let mounted = true
    getSuggestions()
      .then(data => { if(mounted) setSuggestions(data) })
      .catch(err => { /* ignore for now */ })
    return () => { mounted = false }
  }, [])

  const handleAdd = async (userId, idx) => {
    setSending(s => ({ ...s, [userId]: 'loading' }))
    try{
      await sendFriendRequest(userId)
      setSending(s => ({ ...s, [userId]: 'sent' }))
      // Optionally update suggestions to reflect change
      setSuggestions(prev => prev.map((it, i) => i === idx ? { ...it, requested: true } : it))
    }catch(e){
      setSending(s => ({ ...s, [userId]: 'error' }))
    }
  }

  if(!suggestions || suggestions.length === 0) return (
    <div className="p-3">
      <h6>Suggestions</h6>
      <div className="text-muted small">No suggestions yet</div>
    </div>
  )

  return (
    <div className="p-3">
      <h6>Suggestions</h6>
      <ul className="list-group">
        {suggestions.map((s, idx) => (
          <li key={s.user_id} className="list-group-item d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={s.avatar_url || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:40,height:40,objectFit:'cover'}} />
              <div>
                <div className="fw-bold">{s.first_name} {s.last_name}</div>
                <div className="small text-muted">@{s.user_id}</div>
              </div>
            </div>
            <div>
              { (s.requested || sending[s.user_id] === 'sent') ? (
                <button className="btn btn-sm btn-secondary" disabled>Sent</button>
              ) : (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleAdd(s.user_id, idx)}
                  disabled={sending[s.user_id] === 'loading'}
                >
                  {sending[s.user_id] === 'loading' ? 'Sending...' : 'Add Friend'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
