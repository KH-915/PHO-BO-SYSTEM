import api from './api'

// Group CRUD
export async function getGroups() {
  return api.get('/groups')
}

export async function getGroup(groupId) {
  return api.get(`/groups/${groupId}`)
}

export async function createGroup(data) {
  // data: { group_name, description, privacy_type, is_visible }
  return api.post('/groups', data)
}

export async function updateGroup(groupId, data) {
  return api.put(`/groups/${groupId}`, data)
}

export async function deleteGroup(groupId) {
  return api.delete(`/groups/${groupId}`)
}

// Group Rules
export async function getGroupRules(groupId) {
  return api.get('/group-rules', { params: { group_id: groupId } })
}

export async function createGroupRule(data) {
  // data: { group_id, title, details, display_order }
  return api.post('/group-rules', data)
}

export async function deleteGroupRule(ruleId) {
  return api.delete(`/group-rules/${ruleId}`)
}

// Membership Questions
export async function getMembershipQuestions(groupId) {
  return api.get('/membership-questions', { params: { group_id: groupId } })
}

export async function createMembershipQuestion(data) {
  // data: { group_id, question_text, is_required }
  return api.post('/membership-questions', data)
}

export async function deleteMembershipQuestion(questionId) {
  return api.delete(`/membership-questions/${questionId}`)
}

// Group Membership
export async function getMyGroups() {
  return api.get('/groups/my-groups')
}

export async function getGroupMembers(groupId) {
  return api.get(`/groups/${groupId}/members`)
}

export async function joinGroup(groupId, answers) {
  // answers: [{ question_id, answer_text }]
  return api.post(`/groups/${groupId}/join`, { answers })
}

export async function leaveGroup(groupId) {
  return api.post(`/groups/${groupId}/leave`)
}

export async function getPendingRequests(groupId) {
  return api.get(`/groups/${groupId}/pending-requests`)
}

export async function approveMember(groupId, userId) {
  return api.post(`/groups/${groupId}/members/${userId}/approve`)
}

export async function rejectMember(groupId, userId) {
  return api.post(`/groups/${groupId}/members/${userId}/reject`)
}

export async function banMember(groupId, userId) {
  return api.post(`/groups/${groupId}/members/${userId}/ban`)
}

export async function unbanMember(groupId, userId) {
  return api.post(`/groups/${groupId}/members/${userId}/unban`)
}

export async function updateMemberRole(groupId, userId, role) {
  return api.post(`/groups/${groupId}/members/${userId}/role`, { role })
}

export async function inviteFriend(groupId, userId) {
  return api.post(`/groups/${groupId}/invite/${userId}`)
}

// Group Posts
export async function getGroupPosts(groupId) {
  return api.get(`/groups/${groupId}/posts`)
}

export default {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupRules,
  createGroupRule,
  deleteGroupRule,
  getMembershipQuestions,
  createMembershipQuestion,
  deleteMembershipQuestion,
  getMyGroups,
  getGroupMembers,
  joinGroup,
  leaveGroup,
  getPendingRequests,
  approveMember,
  rejectMember,
  banMember,
  unbanMember,
  updateMemberRole,
  inviteFriend,
  getGroupPosts
}
