import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { user, isInitializing } = useAuth();

  // Show loading while checking auth
  if (isInitializing) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
  if (!user.is_admin) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <h4 className="alert-heading">
            <i className="bi bi-shield-lock me-2"></i>
            Access Denied
          </h4>
          <p>You need administrator privileges to access this page.</p>
          <hr />
          <a href="/feed" className="btn btn-primary">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Feed
          </a>
        </div>
      </div>
    );
  }

  // User is authenticated and is admin
  return children;
}

