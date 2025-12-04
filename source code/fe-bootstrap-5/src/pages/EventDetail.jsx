import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import eventService from '../services/eventService';
import postService from '../services/postService';
import interactionService from '../services/interactionService';
import PostCard from '../components/PostCard';
import Swal from 'sweetalert2';

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [participants, setParticipants] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    start_time: '',
    end_time: '',
    location_text: '',
    privacy_setting: 'PUBLIC',
  });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'participants') {
      loadParticipants();
    } else if (activeTab === 'discussion') {
      loadPosts();
    }
  }, [activeTab]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvent(eventId);
      setEvent(data);
      setFormData({
        event_name: data.event_name,
        description: data.description || '',
        start_time: data.start_time ? data.start_time.slice(0, 16) : '',
        end_time: data.end_time ? data.end_time.slice(0, 16) : '',
        location_text: data.location_text || '',
        privacy_setting: data.privacy_setting,
      });
    } catch (error) {
      console.error('Failed to load event:', error);
      Swal.fire('Error', 'Failed to load event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const data = await eventService.getParticipants(eventId);
      setParticipants(data);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const loadPosts = async () => {
    try {
      // For now, we'll show a message that discussion is coming soon
      // In a full implementation, you'd create EventPost model and endpoints
      setPosts([]);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const handleRSVP = async (status) => {
    try {
      await eventService.rsvpEvent(eventId, status);
      Swal.fire('Success', `You are now ${status.toLowerCase()}!`, 'success');
      // Reload both event data and participants to update counts
      await loadEvent();
      await loadParticipants();
    } catch (error) {
      console.error('Failed to RSVP:', error);
      Swal.fire('Error', 'Failed to update RSVP', 'error');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
      };
      await eventService.updateEvent(eventId, updateData);
      Swal.fire('Success', 'Event updated successfully!', 'success');
      setIsEditing(false);
      loadEvent();
    } catch (error) {
      console.error('Failed to update event:', error);
      Swal.fire('Error', 'Failed to update event', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    const result = await Swal.fire({
      title: 'Delete Event?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await eventService.deleteEvent(eventId);
        Swal.fire('Deleted!', 'Event has been deleted.', 'success');
        navigate('/events');
      } catch (error) {
        console.error('Failed to delete event:', error);
        Swal.fire('Error', 'Failed to delete event', 'error');
      }
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isEventPast = () => {
    if (!event?.start_time) return false;
    return new Date(event.start_time) < new Date();
  };

  const canEdit = () => {
    if (!event || !currentUser) return false;
    return event.host_type === 'USER' && event.host_id === currentUser.user_id;
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">Event not found</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Event Header */}
      <div className="card mb-4">
        <div className="card-body">
          {!isEditing ? (
            <>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h2 className="mb-1">{event.event_name}</h2>
                  {isEventPast() && <span className="badge bg-secondary">Past Event</span>}
                </div>
                {canEdit() && (
                  <div className="btn-group">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditing(true)}>
                      <i className="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleDeleteEvent}>
                      <i className="bi bi-trash me-1"></i>Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="mb-3">
                    <i className="bi bi-calendar-event text-primary me-2"></i>
                    <strong>Start:</strong> {formatDateTime(event.start_time)}
                  </div>
                  {event.end_time && (
                    <div className="mb-3">
                      <i className="bi bi-calendar-check text-primary me-2"></i>
                      <strong>End:</strong> {formatDateTime(event.end_time)}
                    </div>
                  )}
                  {event.location_text && (
                    <div className="mb-3">
                      <i className="bi bi-geo-alt text-primary me-2"></i>
                      <strong>Location:</strong> {event.location_text}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  {/* Host Info */}
                  <div className="mb-3">
                    <strong>Hosted by:</strong>
                    <div className="d-flex align-items-center mt-2">
                      <img
                        src={event.host?.avatar || 'https://ui-avatars.com/api/?name=Host&size=50'}
                        alt={event.host?.name}
                        className="rounded-circle me-2"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div>
                        <div>{event.host?.name}</div>
                        {event.host?.username && (
                          <small className="text-muted">@{event.host.username}</small>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Participant Stats */}
                  <div>
                    <div className="mb-2">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <strong>{event.going_count}</strong> going
                    </div>
                    <div>
                      <i className="bi bi-star text-warning me-2"></i>
                      <strong>{event.interested_count}</strong> interested
                    </div>
                  </div>
                </div>
              </div>

              {/* RSVP Buttons */}
              {!isEventPast() && (
                <div className="d-flex gap-2 mb-3">
                  <button
                    className={`btn ${event.user_rsvp === 'GOING' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => handleRSVP('GOING')}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    {event.user_rsvp === 'GOING' ? 'Going' : 'I\'m Going'}
                  </button>
                  <button
                    className={`btn ${event.user_rsvp === 'INTERESTED' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => handleRSVP('INTERESTED')}
                  >
                    <i className="bi bi-star me-1"></i>
                    {event.user_rsvp === 'INTERESTED' ? 'Interested' : 'Interested'}
                  </button>
                  {event.user_rsvp && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleRSVP('NOT_GOING')}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel RSVP
                    </button>
                  )}
                </div>
              )}

              {event.description && (
                <div className="mt-3">
                  <h5>About</h5>
                  <p className="text-muted">{event.description}</p>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleUpdateEvent}>
              <div className="mb-3">
                <label className="form-label">Event Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Start Time *</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">End Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.location_text}
                  onChange={(e) => setFormData({ ...formData, location_text: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Privacy</label>
                <select
                  className="form-select"
                  value={formData.privacy_setting}
                  onChange={(e) => setFormData({ ...formData, privacy_setting: e.target.value })}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="FRIENDS">Friends Only</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      event_name: event.event_name,
                      description: event.description || '',
                      start_time: event.start_time ? event.start_time.slice(0, 16) : '',
                      end_time: event.end_time ? event.end_time.slice(0, 16) : '',
                      location_text: event.location_text || '',
                      privacy_setting: event.privacy_setting,
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="bi bi-info-circle me-2"></i>
            Details
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            <i className="bi bi-people me-2"></i>
            Participants ({event.going_count + event.interested_count})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'discussion' ? 'active' : ''}`}
            onClick={() => setActiveTab('discussion')}
          >
            <i className="bi bi-chat-dots me-2"></i>
            Discussion
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="card">
            <div className="card-body">
              <h5>Event Information</h5>
              <p className="text-muted">
                All event details are shown above. Use the tabs to view participants or join the discussion.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="card">
            <div className="card-body">
              <h5 className="mb-3">Participants</h5>
              
              {/* Going */}
              <div className="mb-4">
                <h6 className="text-success">
                  <i className="bi bi-check-circle me-2"></i>
                  Going ({participants.filter(p => p.rsvp_status === 'GOING').length})
                </h6>
                <div className="list-group">
                  {participants
                    .filter(p => p.rsvp_status === 'GOING')
                    .map((participant) => (
                      <div key={participant.user_id} className="list-group-item">
                        <div className="d-flex align-items-center">
                          <img
                            src={participant.avatar || 'https://ui-avatars.com/api/?name=User&size=40'}
                            alt={participant.name}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div>
                            <div>{participant.name}</div>
                            <small className="text-muted">
                              RSVP'd {new Date(participant.updated_at).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Interested */}
              <div>
                <h6 className="text-warning">
                  <i className="bi bi-star me-2"></i>
                  Interested ({participants.filter(p => p.rsvp_status === 'INTERESTED').length})
                </h6>
                <div className="list-group">
                  {participants
                    .filter(p => p.rsvp_status === 'INTERESTED')
                    .map((participant) => (
                      <div key={participant.user_id} className="list-group-item">
                        <div className="d-flex align-items-center">
                          <img
                            src={participant.avatar || 'https://ui-avatars.com/api/?name=User&size=40'}
                            alt={participant.name}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div>
                            <div>{participant.name}</div>
                            <small className="text-muted">
                              RSVP'd {new Date(participant.updated_at).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {participants.length === 0 && (
                <p className="text-muted text-center py-4">No participants yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'discussion' && (
          <div className="card">
            <div className="card-body">
              <h5 className="mb-3">Discussion</h5>
              <p className="text-muted text-center py-4">
                <i className="bi bi-chat-dots" style={{ fontSize: '3rem' }}></i>
                <br />
                Discussion feature coming soon!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
