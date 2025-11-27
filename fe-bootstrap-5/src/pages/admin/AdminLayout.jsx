import { Link, Outlet, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <nav className="col-md-3 col-lg-2 d-md-block bg-light sidebar vh-100 position-sticky top-0 pt-3">
          <div className="position-sticky pt-3">
            <h5 className="px-3 mb-3 text-muted">Admin Dashboard</h5>
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link
                  className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
                  to="/admin/users"
                >
                  <i className="bi bi-people me-2"></i>
                  User Management
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className={`nav-link ${location.pathname === '/admin/stats' ? 'active' : ''}`}
                  to="/admin/stats"
                >
                  <i className="bi bi-graph-up me-2"></i>
                  Statistics
                </Link>
              </li>
              <li className="nav-item mt-3">
                <Link className="nav-link text-muted" to="/feed">
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Feed
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="pt-3">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
