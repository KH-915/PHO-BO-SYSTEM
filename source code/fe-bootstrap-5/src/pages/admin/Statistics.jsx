import { useState, useEffect } from 'react';
import { getStats, getPostsSentiment } from '../../services/adminService';

export default function Statistics() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [minPosts, setMinPosts] = useState(0);

  // Posts + Sentiment state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [postYear, setPostYear] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(200);

  useEffect(() => {
    loadStats();
    loadPosts();
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

  const loadPosts = async () => {
    try {
      setPostsLoading(true);
      setPostsError(null);
      const data = await getPostsSentiment({
        year: postYear || undefined,
        minScore: minScore === '' ? undefined : Number(minScore),
        maxScore: maxScore === '' ? undefined : Number(maxScore),
        q: keyword || undefined,
        limit: limit || undefined,
      });
      setPosts(data || []);
    } catch (err) {
      setPostsError(err.response?.data?.detail || 'Failed to load posts sentiment');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    loadStats();
  };

  const handlePostsFilter = (e) => {
    e.preventDefault();
    loadPosts();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const truncate = (txt, n = 80) => {
    if (!txt) return '';
    return txt.length > n ? txt.slice(0, n) + '…' : txt;
  };

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
        <div className="card mb-5">
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

      {/* Posts Sentiment Section */}
      <h2 className="mb-3">Post Sentiment Explorer</h2>

      {postsError && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {postsError}
          <button type="button" className="btn-close" onClick={() => setPostsError(null)}></button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Filters</h5>
          <form onSubmit={handlePostsFilter} className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={postYear}
                onChange={(e) => setPostYear(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Min Score</label>
              <input
                type="number"
                className="form-control"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Max Score</label>
              <input
                type="number"
                className="form-control"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Keyword</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search in text..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Limit</label>
              <input
                type="number"
                className="form-control"
                value={limit}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : 200)}
                min="1"
                max="5000"
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button type="submit" className="btn btn-primary" disabled={postsLoading}>
                {postsLoading ? (
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

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Posts & Sentiment</h5>
          {postsLoading && posts.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Post ID</th>
                    <th>Author ID</th>
                    <th>Created At</th>
                    <th>Sentiment</th>
                    <th>Text</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.post_id}>
                      <td>{p.post_id}</td>
                      <td>{p.author_id}</td>
                      <td>{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                      <td>
                        <span className={
                          p.sentiment_score > 0
                            ? 'badge bg-success'
                            : p.sentiment_score < 0
                              ? 'badge bg-danger'
                              : 'badge bg-secondary'
                        }>
                          {p.sentiment_score}
                        </span>
                      </td>
                      <td style={{ maxWidth: 500 }}>{truncate(p.text_content, 120)}</td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No posts match the filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
