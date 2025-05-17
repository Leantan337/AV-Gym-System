import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface RoleAuthorizationProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectPath?: string;
}

/**
 * Component to handle role-based access control for routes
 * Only allows access to users with specified roles
 */
const RoleAuthorization: React.FC<RoleAuthorizationProps> = ({
  children,
  allowedRoles,
  redirectPath = '/unauthorized',
}) => {
  const { isAuthenticated, user, loading, checkRole } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (!checkRole(allowedRoles)) {
    return <Navigate to={redirectPath} replace />;
  }

  // Render children if user has required role
  return <>{children}</>;
};

export default RoleAuthorization;
