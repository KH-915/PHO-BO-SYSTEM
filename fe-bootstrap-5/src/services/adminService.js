import api from './api';

export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await api.put(`/admin/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get('/admin/roles');
  return response.data;
};

export const getStats = async (year, minPosts) => {
  const params = {};
  if (year) params.year = year;
  if (minPosts !== undefined) params.min_posts = minPosts;
  
  const response = await api.get('/admin/stats', { params });
  return response.data;
};

export const getPostsSentiment = async ({ year, minScore, maxScore, q, limit } = {}) => {
  const params = {};
  if (year) params.year = year;
  if (minScore !== undefined && minScore !== null) params.min_score = minScore;
  if (maxScore !== undefined && maxScore !== null) params.max_score = maxScore;
  if (q) params.q = q;
  if (limit) params.limit = limit;
  const response = await api.get('/admin/posts-sentiment', { params });
  return response.data;
};
