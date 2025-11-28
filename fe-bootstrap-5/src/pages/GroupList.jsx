import React, { useEffect, useState } from 'react'

export default function GroupList() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Adjust this to your actual backend URL
  const API_BASE_URL = 'http://localhost:8000' 

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Backend: Query GROUPS joined with GROUP_MEMBERSHIPS to check status
        const response = await fetch(`${API_BASE_URL}/groups`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups')
        }

        const data = await response.json()
        setGroups(data)
      } catch (error) {
        console.error('Error loading groups:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  const handleJoin = async (groupId) => {
    try {
      // POST request to insert into GROUP_MEMBERSHIPS
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If using JWT/Auth, add headers here:
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      })

      if (!response.ok) {
        throw new Error('Failed to join group')
      }

      // Update UI state to reflect change immediately (Optimistic update)
      // Note: Logic assumes status becomes 'PENDING' by default; adjust if public groups allow immediate 'JOINED'
      setGroups(prev => prev.map(g => 
        g.group_id === groupId ? {...g, membership_status: 'PENDING'} : g
      ))
    } catch (e) { 
      console.error(e)
      alert('Error joining group') 
    }
  }

  if (loading) return <div>Loading groups...</div>

  return (
    <div className="container mt-4">
      <h4 className="mb-3">Suggested Groups</h4>
      <div className="row row-cols-1 row-cols-md-3 g-4">
        {groups.map(group => (
          <div key={group.group_id} className="col">
            <div className="card h-100">
              <img 
                src={group.cover_photo_url || 'https://via.placeholder.com/300x150'} 
                className="card-img-top" 
                alt="cover" 
                style={{height: '120px', objectFit: 'cover'}}
              />
              <div className="card-body">
                <h5 className="card-title">{group.group_name}</h5>
                <p className="card-text small text-muted text-truncate">{group.description}</p>
                <span className="badge bg-secondary mb-2">{group.privacy_type}</span>
              </div>
              <div className="card-footer bg-white border-top-0">
                {group.membership_status ? (
                  <button className="btn btn-outline-secondary w-100" disabled>
                    {group.membership_status === 'JOINED' ? 'Joined' : 'Pending'}
                  </button>
                ) : (
                  <button className="btn btn-primary w-100" onClick={() => handleJoin(group.group_id)}>
                    Join Group
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}