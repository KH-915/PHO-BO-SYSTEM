import { useState, useEffect } from 'react';
import { getStats } from '../../services/adminService';

export default function Statistics() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [minPosts, setMinPosts] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStats(year || undefined, minPosts || undefined);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    loadStats();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div>
      <h2 className="mb-4">User Activity Statistics</h2>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Filters</h5>
          <form onSubmit={handleFilter} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={year}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Minimum Posts</label>
              <input
                type="number"
                className="form-control"
                value={minPosts}
                onChange={(e) => setMinPosts(e.target.value ? parseInt(e.target.value) : 0)}
                min="0"
              />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-funnel me-2"></i>
                    Apply Filters
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading && stats.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Activity Leaderboard</h5>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Total Posts</th>
                    <th>Activity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((user, idx) => (
                    <tr key={user.user_id}>
                      <td>
                        {idx === 0 && <i className="bi bi-trophy-fill text-warning me-2"></i>}
                        {idx === 1 && <i className="bi bi-trophy-fill text-secondary me-2"></i>}
                        {idx === 2 && <i className="bi bi-trophy-fill text-danger me-2"></i>}
                        {idx + 1}
                      </td>
                      <td>{user.user_id}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge bg-primary">{user.total_posts}</span>
                      </td>
                      <td>
                        <strong>{user.activity_score}</strong>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No data available for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {stats.length > 0 && (
              <div className="mt-3 text-muted">
                <small>
                  <i className="bi bi-info-circle me-1"></i>
                  Showing {stats.length} active user{stats.length !== 1 ? 's' : ''}
                  {year && ` for year ${year}`}
                  {minPosts > 0 && ` with at least ${minPosts} post${minPosts !== 1 ? 's' : ''}`}
                </small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
