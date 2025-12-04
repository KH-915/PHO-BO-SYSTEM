import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import groupService from '../services/groupService'
import friendService from '../services/friendService'
import postService from '../services/postService'
import interactionService from '../services/interactionService'
import Swal from 'sweetalert2'
import { useAuth } from '../contexts/AuthContext'
import CreatePostWidget from '../components/CreatePostWidget'
import MediaModal from '../components/MediaModal'

export default function GroupDetail() {
  const { groupId } = useParams()
  const [group, setGroup] = useState(null)
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [rules, setRules] = useState([])
  const [questions, setQuestions] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [activeTab, setActiveTab] = useState('discussion') // discussion, members, about
  const [loading, setLoading] = useState(true)
  const [zoomedMedia, setZoomedMedia] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    setLoading(true)
    try {
      const groupRes = await groupService.getGroup(groupId)
      setGroup(groupRes.data)
      
      // Load posts if member
      if (groupRes.data.my_status === 'JOINED') {
        const postsRes = await groupService.getGroupPosts(groupId)
        setPosts(postsRes.data || [])
        
        const membersRes = await groupService.getGroupMembers(groupId)
        setMembers(membersRes.data || [])
      }
      
      // Load rules and questions
      const [rulesRes, questionsRes] = await Promise.all([
        groupService.getGroupRules(groupId),
        groupService.getMembershipQuestions(groupId)
      ])
      setRules(rulesRes.data || [])
      setQuestions(questionsRes.data || [])
      
      // Load pending requests if admin/moderator
      if (groupRes.data.my_role === 'ADMIN' || groupRes.data.my_role === 'MODERATOR') {
        const pendingRes = await groupService.getPendingRequests(groupId)
        setPendingRequests(pendingRes.data || [])
      }
    } catch (error) {
      console.error('Load group error:', error)
      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: error.response.data.detail || 'You are banned from this group'
        })
        navigate('/groups')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    // Show questions dialog
    const hasRequired = questions.some(q => q.is_required)
    
    if (questions.length > 0) {
      let questionHTML = '<div class="text-start">'
      questions.forEach((q, idx) => {
        questionHTML += `
          <div class="mb-3">
            <label class="form-label fw-bold">${q.question_text}${q.is_required ? ' *' : ''}</label>
            <textarea id="answer-${q.question_id}" class="form-control" rows="2" ${q.is_required ? 'required' : ''}></textarea>
          </div>
        `
      })
      questionHTML += '</div>'
      
      const { value: confirm } = await Swal.fire({
        title: 'Join Group',
        html: questionHTML,
        showCancelButton: true,
        confirmButtonText: 'Submit',
        confirmButtonColor: '#0d6efd',
        width: '600px',
        preConfirm: () => {
          const answers = []
          for (const q of questions) {
            const answer = document.getElementById(`answer-${q.question_id}`).value.trim()
            if (q.is_required && !answer) {
              Swal.showValidationMessage(`Please answer: ${q.question_text}`)
              return false
            }
            if (answer) {
              answers.push({
                question_id: q.question_id,
                answer_text: answer
              })
            }
          }
          return answers
        }
      })
      
      if (!confirm) return
      
      try {
        const res = await groupService.joinGroup(groupId, confirm)
        await Swal.fire({
          icon: 'success',
          title: res.data.status === 'PENDING' ? 'Request Sent!' : 'Joined!',
          text: res.data.message,
          timer: 2000
        })
        loadGroupData()
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: error.response?.data?.detail || 'Failed to join group'
        })
      }
    } else {
      // No questions, join directly
      try {
        const res = await groupService.joinGroup(groupId, [])
        await Swal.fire({
          icon: 'success',
          title: 'Joined!',
          text: res.data.message,
          timer: 2000
        })
        loadGroupData()
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: error.response?.data?.detail || 'Failed to join group'
        })
      }
    }
  }

  const handleLeave = async () => {
    const confirm = await Swal.fire({
      title: 'Leave Group?',
      text: 'Are you sure you want to leave this group?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, leave'
    })
    
    if (confirm.isConfirmed) {
      try {
        await groupService.leaveGroup(groupId)
        await Swal.fire({
          icon: 'success',
          title: 'Left Group',
          timer: 1500
        })
        navigate('/groups')
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Failed to leave group'
        })
      }
    }
  }

  const handleInviteFriends = async () => {
    try {
      // Get friends list
      const friendsRes = await friendService.getFriends()
      const friends = friendsRes.data || []
      
      if (friends.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Friends',
          text: 'You have no friends to invite yet.'
        })
        return
      }
      
      // Get current member IDs to filter out
      const memberIds = members.map(m => m.user_id)
      const availableFriends = friends.filter(f => !memberIds.includes(f.user_id))
      
      if (availableFriends.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Friends to Invite',
          text: 'All your friends are already members of this group.'
        })
        return
      }
      
      // Create HTML for friends selection
      let friendsHTML = '<div class="text-start" style="max-height: 400px; overflow-y: auto;">'
      availableFriends.forEach(friend => {
        const avatarUrl = friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'Friend')}`
        friendsHTML += `
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" value="${friend.user_id}" id="friend-${friend.user_id}">
            <label class="form-check-label d-flex align-items-center" for="friend-${friend.user_id}">
              <img src="${avatarUrl}" class="rounded-circle me-2" width="40" height="40" alt="avatar" style="object-fit: cover;">
              <span class="fw-bold">${friend.name || 'Friend'}</span>
            </label>
          </div>
        `
      })
      friendsHTML += '</div>'
      
      const { value: confirm } = await Swal.fire({
        title: 'Invite Friends to Group',
        html: friendsHTML,
        showCancelButton: true,
        confirmButtonText: 'Send Invites',
        confirmButtonColor: '#0d6efd',
        width: '600px',
        preConfirm: () => {
          const selectedIds = []
          availableFriends.forEach(friend => {
            const checkbox = document.getElementById(`friend-${friend.user_id}`)
            if (checkbox && checkbox.checked) {
              selectedIds.push(friend.user_id)
            }
          })
          if (selectedIds.length === 0) {
            Swal.showValidationMessage('Please select at least one friend to invite')
            return false
          }
          return selectedIds
        }
      })
      
      if (confirm) {
        // Send invites
        let successCount = 0
        let failCount = 0
        
        for (const userId of confirm) {
          try {
            await groupService.inviteFriend(groupId, userId)
            successCount++
          } catch (err) {
            console.error(`Failed to invite user ${userId}:`, err)
            failCount++
          }
        }
        
        // Show result
        if (successCount > 0) {
          await Swal.fire({
            icon: 'success',
            title: 'Invites Sent!',
            text: `Successfully invited ${successCount} friend${successCount > 1 ? 's' : ''} to the group.${failCount > 0 ? ` (${failCount} failed)` : ''}`,
            timer: 2000
          })
          loadGroupData() // Reload to show new members
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: 'Failed to send invites. Please try again.'
          })
        }
      }
    } catch (error) {
      console.error('Invite friends error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load friends list'
      })
    }
  }

  const handleApprove = async (userId) => {
    try {
      await groupService.approveMember(groupId, userId)
      loadGroupData()
      Swal.fire({ icon: 'success', title: 'Member approved', timer: 1500 })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Error approving member' })
    }
  }

  const handleReject = async (userId) => {
    try {
      await groupService.rejectMember(groupId, userId)
      loadGroupData()
      Swal.fire({ icon: 'success', title: 'Request rejected', timer: 1500 })
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Error rejecting member' })
    }
  }

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Group not found</div>
      </div>
    )
  }

  const isJoined = group.my_status === 'JOINED'
  const isPending = group.my_status === 'PENDING'
  const isAdmin = group.my_role === 'ADMIN' || group.my_role === 'MODERATOR'

  return (
    <div className="container mt-4">
      {/* Group Header */}
      <div className="card mb-4">
        {group.cover_photo_url ? (
          <img 
            src={group.cover_photo_url} 
            className="card-img-top" 
            alt="cover"
            style={{height: '250px', objectFit: 'cover'}}
          />
        ) : (
          <div 
            className="card-img-top" 
            style={{height: '250px', backgroundColor: '#dee2e6'}}
          ></div>
        )}
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2>{group.group_name}</h2>
              <div className="text-muted mb-2">
                <span className="badge bg-secondary me-2">{group.privacy_type}</span>
                <i className="bi bi-people me-1"></i>{group.member_count} members
              </div>
              <p className="text-muted">{group.description}</p>
            </div>
            <div>
              {!isJoined && !isPending && (
                <button className="btn btn-primary" onClick={handleJoin}>
                  <i className="bi bi-plus-circle me-2"></i>Join Group
                </button>
              )}
              {isPending && (
                <button className="btn btn-warning" disabled>
                  <i className="bi bi-clock me-2"></i>Pending Approval
                </button>
              )}
              {isJoined && (
                <div>
                  {isAdmin && (
                    <button className="btn btn-primary me-2" onClick={handleInviteFriends}>
                      <i className="bi bi-person-plus me-2"></i>Invite Friends
                    </button>
                  )}
                  <button className="btn btn-outline-danger" onClick={handleLeave}>
                    Leave Group
                  </button>
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
            className={`nav-link ${activeTab === 'discussion' ? 'active' : ''}`}
            onClick={() => setActiveTab('discussion')}
            disabled={!isJoined}
          >
            Discussion
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
            disabled={!isJoined}
          >
            Members
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </li>
        {isAdmin && pendingRequests.length > 0 && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending ({pendingRequests.length})
            </button>
          </li>
        )}
      </ul>

      {/* Discussion Tab */}
      {activeTab === 'discussion' && isJoined && (
        <div>
          {/* Create Post Widget */}
          <CreatePostWidget 
            onPostCreated={loadGroupData} 
            groupId={groupId}
            groupPrivacy={group.privacy_type}
          />

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="alert alert-info">No posts yet. Be the first to post!</div>
          ) : (
            posts.map(post => (
              <div key={post.post_id} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    {post.author_avatar ? (
                      <img 
                        src={post.author_avatar} 
                        className="rounded-circle me-2" 
                        width="40" 
                        height="40"
                        alt="avatar"
                      />
                    ) : (
                      <div 
                        className="rounded-circle me-2 bg-secondary d-flex align-items-center justify-content-center text-white"
                        style={{width: '40px', height: '40px', fontSize: '16px'}}
                      >
                        {post.author_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="fw-bold">{post.author_name}</div>
                      <small className="text-muted">{new Date(post.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                  <p>{post.text_content}</p>
                  
                  {/* Display files if any */}
                  {post.files && post.files.length > 0 && (
                    <div className="mt-2">
                      {post.files.map((file, idx) => (
                        <div key={idx} className="mb-2">
                          {file.file_type?.startsWith('image/') ? (
                            <img 
                              src={file.file_url} 
                              alt="post" 
                              className="img-fluid rounded"
                              style={{maxHeight: '400px', cursor: 'pointer'}}
                              onClick={() => setZoomedMedia({ url: file.file_url, type: file.file_type })}
                            />
                          ) : file.file_type?.startsWith('video/') ? (
                            <video 
                              src={file.file_url} 
                              controls 
                              className="w-100 rounded"
                              style={{maxHeight: '400px', cursor: 'pointer'}}
                              onClick={() => setZoomedMedia({ url: file.file_url, type: file.file_type })}
                            />
                          ) : (
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary">
                              📎 {file.file_url.split('/').pop()}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && isJoined && (
        <div>
          {members.filter(m => m.status === 'JOINED').map(member => (
            <div key={member.user_id} className="card mb-2">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div className="fw-bold">{member.user_id}</div>
                    <span className="badge bg-secondary">{member.role}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="card">
          <div className="card-body">
            <h5>About This Group</h5>
            <p>{group.description || 'No description provided'}</p>
            
            {rules.length > 0 && (
              <>
                <h6 className="mt-4">Group Rules</h6>
                <ol>
                  {rules.map((rule, idx) => (
                    <li key={rule.rule_id}>
                      <strong>{rule.title}</strong>
                      {rule.details && <p className="mb-0 text-muted">{rule.details}</p>}
                    </li>
                  ))}
                </ol>
              </>
            )}
            
            <div className="mt-4 text-muted">
              <div><strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}</div>
              <div><strong>Created by:</strong> {group.creator_name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && isAdmin && (
        <div>
          {pendingRequests.map(req => (
            <div key={req.user_id} className="card mb-3">
              <div className="card-body">
                <div className="d-flex align-items-start">
                  <img 
                    src={req.user_avatar || 'https://via.placeholder.com/50'} 
                    className="rounded-circle me-3" 
                    width="50" 
                    height="50"
                    alt="avatar"
                  />
                  <div className="flex-grow-1">
                    <div className="fw-bold">{req.user_name}</div>
                    <small className="text-muted">Requested {new Date(req.joined_at).toLocaleString()}</small>
                    
                    {req.answers.length > 0 && (
                      <div className="mt-2">
                        <strong>Answers:</strong>
                        {req.answers.map(ans => {
                          const question = questions.find(q => q.question_id === ans.question_id)
                          return (
                            <div key={ans.question_id} className="ms-3 mt-1">
                              <div className="small text-muted">{question?.question_text}</div>
                              <div>{ans.answer_text}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <button 
                      className="btn btn-success btn-sm me-2"
                      onClick={() => handleApprove(req.user_id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(req.user_id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
  )
}
