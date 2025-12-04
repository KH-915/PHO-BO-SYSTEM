import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import groupService from '../services/groupService'
import Swal from 'sweetalert2'

export default function GroupList() {
  const [myGroups, setMyGroups] = useState([])
  const [allGroups, setAllGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-groups') // 'my-groups' or 'discover'
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [myRes, allRes] = await Promise.all([
        groupService.getMyGroups(),
        groupService.getGroups()
      ])
      setMyGroups(myRes.data || [])
      setAllGroups(allRes.data || [])
    } catch (error) {
      console.error('Error loading groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Group',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label fw-bold">Group Name *</label>
            <input id="group-name" class="form-control" placeholder="Enter group name" required>
          </div>
          
          <div class="mb-3">
            <label class="form-label fw-bold">Description</label>
            <textarea id="group-desc" class="form-control" rows="3" placeholder="What's this group about?"></textarea>
          </div>
          
          <div class="mb-3">
            <label class="form-label fw-bold">Privacy</label>
            <select id="group-privacy" class="form-select">
              <option value="PUBLIC">Public - Anyone can see and join</option>
              <option value="PRIVATE">Private - Requires approval to join</option>
            </select>
          </div>
          
          <div class="mb-3">
            <label class="form-label fw-bold">Group Rules (one per line)</label>
            <textarea id="group-rules" class="form-control" rows="3" placeholder="Be respectful\nNo spam\nStay on topic"></textarea>
          </div>
          
          <div class="mb-3">
            <label class="form-label fw-bold">Membership Questions (one per line, prefix with * for required)</label>
            <textarea id="group-questions" class="form-control" rows="3" placeholder="*Why do you want to join?\nWhat are your interests?"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Group',
      confirmButtonColor: '#0d6efd',
      width: '600px',
      preConfirm: () => {
        const name = document.getElementById('group-name').value.trim()
        const desc = document.getElementById('group-desc').value.trim()
        const privacy = document.getElementById('group-privacy').value
        const rulesText = document.getElementById('group-rules').value.trim()
        const questionsText = document.getElementById('group-questions').value.trim()
        
        if (!name) {
          Swal.showValidationMessage('Group name is required')
          return false
        }
        
        // Parse rules
        const rules = rulesText.split('\n').filter(r => r.trim()).map(title => ({
          title: title.trim(),
          details: null
        }))
        
        // Parse questions
        const questions = questionsText.split('\n').filter(q => q.trim()).map(q => {
          const isRequired = q.startsWith('*')
          return {
            question_text: isRequired ? q.substring(1).trim() : q.trim(),
            is_required: isRequired
          }
        })
        
        return { name, desc, privacy, rules, questions }
      }
    })

    if (formValues) {
      try {
        await groupService.createGroup({
          group_name: formValues.name,
          description: formValues.desc || null,
          privacy_type: formValues.privacy,
          is_visible: true,
          rules: formValues.rules,
          questions: formValues.questions
        })
        
        await Swal.fire({
          icon: 'success',
          title: 'Group Created!',
          text: 'Your group has been created successfully.',
          timer: 2000,
          showConfirmButton: false
        })
        
        loadData()
      } catch (error) {
        console.error('Create group error:', error)
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: error.response?.data?.detail || 'Failed to create group'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Groups</h2>
        <button className="btn btn-primary" onClick={handleCreateGroup}>
          <i className="bi bi-plus-circle me-2"></i>
          Create Group
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'my-groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-groups')}
          >
            My Groups ({myGroups.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover
          </button>
        </li>
      </ul>

      {/* My Groups Tab */}
      {activeTab === 'my-groups' && (
        <div>
          {myGroups.length === 0 ? (
            <div className="alert alert-info">
              You haven't joined any groups yet. Discover groups to join!
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {myGroups.map(group => (
                <div key={group.group_id} className="col">
                  <Link to={`/groups/${group.group_id}`} className="text-decoration-none">
                    <div className="card h-100 hover-shadow">
                      {group.cover_photo_url ? (
                        <img 
                          src={group.cover_photo_url} 
                          className="card-img-top" 
                          alt="cover"
                          style={{height: '150px', objectFit: 'cover'}}
                        />
                      ) : (
                        <div 
                          className="card-img-top" 
                          style={{height: '150px', backgroundColor: '#dee2e6'}}
                        ></div>
                      )}
                      <div className="card-body">
                        <h5 className="card-title text-dark">{group.group_name}</h5>
                        <p className="card-text small text-muted" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {group.description || 'No description'}
                        </p>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="badge bg-secondary">{group.privacy_type}</span>
                          <small className="text-muted">
                            <i className="bi bi-people me-1"></i>
                            {group.member_count} members
                          </small>
                        </div>
                        {group.my_status === 'PENDING' && (
                          <span className="badge bg-warning mt-2">Pending Approval</span>
                        )}
                        {group.my_role === 'ADMIN' && (
                          <span className="badge bg-primary mt-2">Admin</span>
                        )}
                        {group.my_role === 'MODERATOR' && (
                          <span className="badge bg-info mt-2">Moderator</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <div>
          {allGroups.length === 0 ? (
            <div className="alert alert-info">
              No public groups available yet. Be the first to create one!
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {allGroups.filter(g => !myGroups.find(mg => mg.group_id === g.group_id)).map(group => (
                <div key={group.group_id} className="col">
                  <Link to={`/groups/${group.group_id}`} className="text-decoration-none">
                    <div className="card h-100 hover-shadow">
                      {group.cover_photo_url ? (
                        <img 
                          src={group.cover_photo_url} 
                          className="card-img-top" 
                          alt="cover"
                          style={{height: '150px', objectFit: 'cover'}}
                        />
                      ) : (
                        <div 
                          className="card-img-top" 
                          style={{height: '150px', backgroundColor: '#dee2e6'}}
                        ></div>
                      )}
                      <div className="card-body">
                        <h5 className="card-title text-dark">{group.group_name}</h5>
                        <p className="card-text small text-muted" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {group.description || 'No description'}
                        </p>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="badge bg-secondary">{group.privacy_type}</span>
                          <small className="text-muted">
                            <i className="bi bi-people me-1"></i>
                            {group.member_count} members
                          </small>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <style jsx="true">{`
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
          transition: box-shadow 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
