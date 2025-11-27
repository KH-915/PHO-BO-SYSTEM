import api from './api';

export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const getStats = async (year, minPosts) => {
  const params = {};
  if (year) params.year = year;
  if (minPosts !== undefined) params.min_posts = minPosts;
  
  const response = await api.get('/admin/stats', { params });
  return response.data;
};
