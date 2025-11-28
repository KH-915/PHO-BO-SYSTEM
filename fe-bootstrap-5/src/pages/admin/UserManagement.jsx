import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, updateUser, getRoles } from '../../services/adminService';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', phone: '', password: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete error
  const [deleteError, setDeleteError] = useState(null);

  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ phone: '', is_active: true, role_id: '' });
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Roles
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const ensureRolesLoaded = async () => {
    if (roles.length > 0) return;
    try {
      setRolesLoading(true);
      setRolesError(null);
      const data = await getRoles();
      setRoles(data || []);
    } catch (err) {
      setRolesError(err.response?.data?.detail || 'Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      await createUser(newUser);
      setShowAddModal(false);
      setNewUser({ email: '', phone: '', password: '' });
      await loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setDeleteError(null);
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete user';
      setDeleteError(errorMessage);
      setTimeout(() => setDeleteError(null), 10000);
    }
  };

  const openEditUser = async (user) => {
    setSelectedUser(user);
    setEditForm({
      phone: user.phone || '',
      is_active: !!user.is_active,
      // Preselect current role if available
      role_id: user.primary_role_id != null ? String(user.primary_role_id) : ''
    });
    setEditError(null);
    setShowEditModal(true);
    await ensureRolesLoaded();
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setEditError(null);
    setEditLoading(true);

    try {
      const payload = {
        phone: editForm.phone,
        is_active: !!editForm.is_active,
        role_id: editForm.role_id === '' ? null : Number(editForm.role_id)
      };
      await updateUser(selectedUser.id, payload);
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone ? String(user.phone).toLowerCase().includes(searchTerm.toLowerCase()) : false)
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>User Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add User
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {deleteError && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          <strong>Delete Failed:</strong> {deleteError}
          <button type="button" className="btn-close" onClick={() => setDeleteError(null)}></button>
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Active</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.phone || '-'}</td>
                <td>{user.roles || '-'}</td>
                <td>
                  {user.is_active ? (
                    <span className="badge bg-success">Active</span>
                  ) : (
                    <span className="badge bg-secondary">Inactive</span>
                  )}
                </td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openEditUser(user)}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormError(null);
                    }}
                  ></button>
                </div>
                <form onSubmit={handleAddUser}>
                  <div className="modal-body">
                    {formError && (
                      <div className="alert alert-danger">{formError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddModal(false);
                        setFormError(null);
                      }}
                      disabled={formLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <>
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit User (ID: {selectedUser.id})</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditError(null);
                      setSelectedUser(null);
                    }}
                  ></button>
                </div>
                <form onSubmit={handleEditUser}>
                  <div className="modal-body">
                    {editError && (
                      <div className="alert alert-danger">{editError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input type="text" className="form-control" value={selectedUser.email} readOnly />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                      <div className="form-text">Leave empty to clear phone number.</div>
                    </div>
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="isActiveSwitch"
                        checked={!!editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="isActiveSwitch">Active</label>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Grant Role (optional)</label>
                      <select
                        className="form-select"
                        value={editForm.role_id}
                        onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                        disabled={rolesLoading}
                      >
                        <option value="">No change</option>
                        {roles.map(r => (
                          <option key={r.role_id} value={r.role_id}>
                            {r.role_name}
                          </option>
                        ))}
                      </select>
                      {rolesLoading && (
                        <div className="form-text">Loading roles...</div>
                      )}
                      {rolesError && (
                        <div className="text-danger small mt-1">{rolesError}</div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditError(null);
                        setSelectedUser(null);
                      }}
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editLoading}>
                      {editLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  );
}
