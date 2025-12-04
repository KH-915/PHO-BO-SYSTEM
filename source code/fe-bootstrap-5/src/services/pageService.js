import api from './api'

// Get all pages (discover)
export async function getAllPages() {
  return api.get('/pages')
}

// Get my pages (where I have a role)
export async function getMyPages() {
  return api.get('/me/pages')
}

// Get page details
export async function getPage(pageId) {
  return api.get(`/pages/${pageId}`)
}

// Create new page
export async function createPage(data) {
  return api.post('/pages', data)
}

// Update page
export async function updatePage(pageId, data) {
  return api.put(`/pages/${pageId}`, data)
}

// Delete page
export async function deletePage(pageId) {
  return api.delete(`/pages/${pageId}`)
}

// Follow/unfollow page
export async function followPage(pageId) {
  return api.post(`/pages/${pageId}/follow`)
}

export async function unfollowPage(pageId) {
  return api.delete(`/pages/${pageId}/follow`)
}

// Get page posts
export async function getPagePosts(pageId, limit = 10, lastPostId = null) {
  const params = { limit }
  if (lastPostId) params.last_post_id = lastPostId
  return api.get(`/pages/${pageId}/posts`, { params })
}

// Get page roles (admin only)
export async function getPageRoles(pageId) {
  return api.get(`/pages/${pageId}/roles`)
}

// Assign role to user (admin only)
export async function assignPageRole(pageId, email, role) {
  return api.post(`/pages/${pageId}/roles`, { email, role })
}

// Remove user role (admin only)
export async function removePageRole(pageId, userId) {
  return api.delete(`/pages/${pageId}/roles/${userId}`)
}

export default {
  getAllPages,
  getMyPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  followPage,
  unfollowPage,
  getPagePosts,
  getPageRoles,
  assignPageRole,
  removePageRole,
}
