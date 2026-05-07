import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredType }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="spinner-wrapper">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredType && user?.account_type !== requiredType) {
    const redirect = user?.account_type === 'CURRENT' ? '/current/dashboard' : '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
