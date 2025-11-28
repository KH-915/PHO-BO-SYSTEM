import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import eventService from '../services/eventService';
import Swal from 'sweetalert2';

export default function EventList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    start_time: '',
    end_time: '',
    location_text: '',
    privacy_setting: 'PUBLIC',
  });

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'discover') {
        data = await eventService.getAllEvents();
      } else if (activeTab === 'hosting') {
        data = await eventService.getHostingEvents();
      } else if (activeTab === 'going') {
        data = await eventService.getGoingEvents();
      }
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
      Swal.fire('Error', 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        host_id: currentUser.user_id,
        host_type: 'USER',
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
      };

      await eventService.createEvent(eventData);
      Swal.fire('Success', 'Event created successfully!', 'success');
      setShowCreateModal(false);
      setFormData({
        event_name: '',
        description: '',
        start_time: '',
        end_time: '',
        location_text: '',
        privacy_setting: 'PUBLIC',
      });
      loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
      Swal.fire('Error', 'Failed to create event', 'error');
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isEventPast = (startTime) => {
    return new Date(startTime) < new Date();
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Events</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create Event
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <i className="bi bi-compass me-2"></i>
            Discover
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'hosting' ? 'active' : ''}`}
            onClick={() => setActiveTab('hosting')}
          >
            <i className="bi bi-calendar-event me-2"></i>
            Hosting
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'going' ? 'active' : ''}`}
            onClick={() => setActiveTab('going')}
          >
            <i className="bi bi-check-circle me-2"></i>
            Going
          </button>
        </li>
      </ul>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          <p className="text-muted mt-3">No events found</p>
        </div>
      ) : (
        <div className="row g-4">
          {events.map((event) => (
            <div key={event.event_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm hover-shadow" style={{ cursor: 'pointer' }}>
                <div className="card-body" onClick={() => navigate(`/events/${event.event_id}`)}>
                  {/* Event Date Badge */}
                  <div className="d-flex align-items-start mb-3">
                    <div className="bg-primary text-white rounded p-2 text-center me-3" style={{ minWidth: '60px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                        {new Date(event.start_time).getDate()}
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        {new Date(event.start_time).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="card-title mb-1">{event.event_name}</h5>
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {formatDateTime(event.start_time)}
                      </small>
                    </div>
                  </div>

                  {/* Location */}
                  {event.location_text && (
                    <div className="mb-2">
                      <small className="text-muted">
                        <i className="bi bi-geo-alt me-1"></i>
                        {event.location_text}
                      </small>
                    </div>
                  )}

                  {/* Host Info */}
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={event.host?.avatar || 'https://ui-avatars.com/api/?name=User&size=40'}
                      alt={event.host?.name}
                      className="rounded-circle me-2"
                      style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                    />
                    <small className="text-muted">
                      Hosted by <strong>{event.host?.name}</strong>
                    </small>
                  </div>

                  {/* Participant Counts */}
                  <div className="d-flex gap-3 mb-3">
                    <small className="text-muted">
                      <i className="bi bi-check-circle me-1"></i>
                      {event.going_count} going
                    </small>
                    <small className="text-muted">
                      <i className="bi bi-star me-1"></i>
                      {event.interested_count} interested
                    </small>
                  </div>

                  {/* RSVP Status Badge */}
                  {event.user_rsvp && (
                    <span
                      className={`badge ${
                        event.user_rsvp === 'GOING'
                          ? 'bg-success'
                          : event.user_rsvp === 'INTERESTED'
                          ? 'bg-warning'
                          : 'bg-secondary'
                      }`}
                    >
                      {event.user_rsvp === 'GOING' ? 'Going' : event.user_rsvp === 'INTERESTED' ? 'Interested' : 'Not Going'}
                    </span>
                  )}

                  {/* Past Event Badge */}
                  {isEventPast(event.start_time) && (
                    <span className="badge bg-secondary ms-2">Past Event</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Event</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateEvent}>
                <div className="modal-body">
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

                  <div className="mb-3">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter event location"
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
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-shadow {
          transition: box-shadow 0.3s ease;
        }
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
