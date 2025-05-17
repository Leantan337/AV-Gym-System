import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Displayed when a user attempts to access a resource they don't have permission for
 */
const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-md">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        
        <p className="mb-4 text-gray-600">
          You don't have permission to access this resource. This area requires elevated privileges.
        </p>
        
        {user && (
          <p className="mb-6 text-gray-500">
            You are signed in as <span className="font-semibold">{user.first_name} {user.last_name}</span> with role <span className="font-semibold">{user.role}</span>.
          </p>
        )}
        
        <div className="flex justify-center space-x-4">
          <Link 
            to="/dashboard" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </Link>
          
          <Link 
            to="/login" 
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            Sign in with Different Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
