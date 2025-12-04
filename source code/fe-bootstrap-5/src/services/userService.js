import api from './api';

const userService = {
  getUserProfile: (userId) => api.get(`/users/${userId}`),
  getUserPosts: (userId, limit = 20, offset = 0) => 
    api.get(`/users/${userId}/posts`, { params: { limit, offset } }),
  updateProfile: (data) => api.put('/users/me', data),
};

export default userService;
