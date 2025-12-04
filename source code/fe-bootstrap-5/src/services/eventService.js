import api from './api';

const eventService = {
  // Get all events or filtered by type
  getAllEvents: async (type = null) => {
    const params = type ? { type } : {};
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get my hosting events
  getHostingEvents: async () => {
    const response = await api.get('/events', { params: { type: 'HOSTING' } });
    return response.data;
  },

  // Get events I'm going to or interested in
  getGoingEvents: async () => {
    const response = await api.get('/events', { params: { type: 'GOING' } });
    return response.data;
  },

  // Get single event details
  getEvent: async (eventId) => {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },

  // Create new event
  createEvent: async (eventData) => {
    const response = await api.post('/events', eventData);
    return response.data;
  },

  // Update event
  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/events/${eventId}`, eventData);
    return response.data;
  },

  // Delete event
  deleteEvent: async (eventId) => {
    await api.delete(`/events/${eventId}`);
  },

  // RSVP to event
  rsvpEvent: async (eventId, status) => {
    const response = await api.post(`/events/${eventId}/rsvp`, { status });
    return response.data;
  },

  // Get event participants
  getParticipants: async (eventId, statusFilter = null) => {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    const response = await api.get(`/events/${eventId}/participants`, { params });
    return response.data;
  },
};

export default eventService;
