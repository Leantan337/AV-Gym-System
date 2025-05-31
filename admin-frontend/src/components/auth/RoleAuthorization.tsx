import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface RoleAuthorizationProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectPath?: string;
  /**
   * If true, only ADMIN role can access the route regardless of allowedRoles
   * Use for extra sensitive operations like user management, system settings
   */
  adminOnly?: boolean;
  /**
   * Optional callback executed on unauthorized access attempts
   * Useful for security logging
   */
  onUnauthorized?: (attemptedPath: string, userRole?: UserRole) => void;
}

/**
 * Component to handle role-based access control for routes
 * Only allows access to users with specified roles
 */
const RoleAuthorization: React.FC<RoleAuthorizationProps> = ({
  children,
  allowedRoles,
  redirectPath = '/unauthorized',
  adminOnly = false,
  onUnauthorized,
}) => {
  const { isAuthenticated, user, loading, checkRole } = useAuth();
  const location = useLocation();
  
  // Security audit logging
  useEffect(() => {
    // Log access attempts to sensitive routes
    const isSensitiveRoute = 
      location.pathname.includes('/admin') ||
      location.pathname.includes('/settings') ||
      adminOnly;
      
    if (isSensitiveRoute) {
      console.info(
        `[Security] ${user?.username || 'Unauthenticated user'} attempting to access sensitive route: ${location.pathname}`
      );
    }
  }, [location, user, adminOnly]);

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
    if (onUnauthorized) {
      onUnauthorized(location.pathname);
    }
    
    console.warn(`[Security] Unauthenticated access attempt to: ${location.pathname}`);
    return <Navigate to="/login" replace />;
  }
  
  // Admin-only route check (overrides allowedRoles)
  if (adminOnly && user?.role !== UserRole.ADMIN) {
    if (onUnauthorized) {
      onUnauthorized(location.pathname, user?.role);
    }
    
    console.warn(
      `[Security] Unauthorized admin-only access attempt by ${user?.username} (${user?.role}) to: ${location.pathname}`
    );
    return <Navigate to={redirectPath} replace />;
  }

  // Check if user has required role
  if (!checkRole(allowedRoles)) {
    if (onUnauthorized) {
      onUnauthorized(location.pathname, user?.role);
    }
    
    console.warn(
      `[Security] Unauthorized access attempt by ${user?.username} (${user?.role}) to: ${location.pathname}`
    );
    return <Navigate to={redirectPath} replace />;
  }

  // Render children if user has required role
  return <>{children}</>;

};

export default RoleAuthorization;
