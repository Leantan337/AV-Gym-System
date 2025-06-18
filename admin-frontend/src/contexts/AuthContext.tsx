import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// User role types
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  TRAINER = 'TRAINER',
  FRONT_DESK = 'FRONT_DESK'
}

// User information
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  date_joined: string;
}

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  checkRole: (allowedRoles: UserRole[]) => boolean;
}

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null,
  login: async () => false,
  logout: () => {
    // Default implementation - will be overridden by provider
    localStorage.removeItem('token');
  },
  checkAuth: async () => false,
  checkRole: () => false,
};

// Create auth context
const AuthContext = createContext<AuthState>(defaultAuthState);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Force logout - centralized function to handle all logout scenarios including errors
  const forceLogout = useCallback((errorMessage?: string) => {
    // Clear token from state and localStorage
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear any stored tokens
    localStorage.removeItem('token');
    
    // Clear axios default headers
    delete api.defaults.headers.common['Authorization'];
    
    // Set optional error message
    if (errorMessage) {
      setError(errorMessage);
    }
    
    // Redirect to login page
    navigate('/login');
  }, [navigate, setError, setIsAuthenticated, setToken, setUser]);
  
  // Regular logout function that uses forceLogout
  const logout = useCallback(() => {
    forceLogout();
  }, [forceLogout]);

  // Configure axios with token and default settings
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check if user is authenticated
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    
    try {
      console.log('Checking authentication status with token:', token ? '[TOKEN EXISTS]' : 'NO TOKEN');
      // Use consistent endpoint format with /api/ prefix
      const response = await api.get('/api/auth/me/');
      
      if (response.data) {
        console.log('Authentication successful, user role:', response.data.role);
        const normalizedUser = {
          ...response.data,
          role: response.data.role?.toUpperCase(),
        };
        setUser(normalizedUser);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Authentication check failed:', error);
      // More specific error handling
      if (error.message?.includes('Network Error')) {
        forceLogout('Unable to connect to the server. Please check your connection.');
      } else if (error.response?.status === 401) {
        forceLogout('Session expired. Please log in again.');
      } else {
        forceLogout('Authentication failed. Please log in again.');
      }
      return false;
    }
  }, [token, forceLogout]);

  // Check authentication on mount and handle visibility changes
  useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      const storedToken = localStorage.getItem('token');
      console.log('Initial auth check with stored token:', storedToken ? '[TOKEN EXISTS]' : 'NO TOKEN');
      
      if (storedToken) {
        try {
          setToken(storedToken); // Ensure token is set in state
          const success = await checkAuth();
          console.log('Initial auth check result:', success ? 'SUCCESS' : 'FAILED');
        } catch (error) {
          console.error('Token validation failed:', error);
          // Use forceLogout instead of manual cleanup
          forceLogout('Your session has expired. Please log in again.');
        }
      }
      setLoading(false);
    };
    
    verifyToken();
    
    // Add visibility change listener to refresh auth when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        console.log('Tab became visible, refreshing authentication');
        checkAuth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAuth, forceLogout, token]);

  // Login function wrapped in useCallback to prevent recreation on each render
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Attempting login for user: ${username}`);
      console.log('CSP/CORS debug: Sending request to /api/auth/token/ endpoint');
      
      // Use /api/ prefix to match Django URL structure
      const response = await api.post('/api/auth/token/', {
        username,
        password,
      });

      const { access } = response.data;
      console.log('Login successful, received access token');
      
      // Set the token in state (which will trigger the useEffect)
      setToken(access);
      
      // Add a small delay to ensure token is properly set before fetching user data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user data with consistent endpoint format
      console.log('Fetching user profile data');
      const userResponse = await api.get('/api/auth/me/');
      console.log('User data retrieved successfully, role:', userResponse.data.role);
      const normalizedUser = {
        ...userResponse.data,
        role: userResponse.data.role?.toUpperCase(),
      };
      setUser(normalizedUser);
      setIsAuthenticated(true);
      
      navigate('/dashboard');
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      // Provide more specific error messages based on the error type
      if (error.message?.includes('Network Error')) {
        setError('Unable to connect to the server. Please check your connection and try again.');
      } else if (error.response?.status === 401) {
        setError('Invalid username or password');
      } else if (error.response?.status === 403) {
        setError('CSRF verification failed. Please refresh the page and try again.');
      } else {
        setError('Login failed. Please try again later.');
      }
      setIsAuthenticated(false);
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, setError, setIsAuthenticated, setLoading, setToken, setUser]);

  // Check user role
  const checkRole = useCallback((allowedRoles: UserRole[]): boolean => {
    if (!user || !isAuthenticated) {
      console.log('Role check failed: User not defined or not authenticated', { user, isAuthenticated });
      return false;
    }
    
    console.log(`Role check for ${user.username}: has role ${user.role}, checking against allowed roles:`, allowedRoles);
    const hasRole = allowedRoles.includes(user.role);
    console.log('Role check result:', hasRole ? 'AUTHORIZED' : 'UNAUTHORIZED');
    return hasRole;
  }, [user, isAuthenticated]);

  // Context value with proper typing
  const value: AuthState = useMemo(() => ({
    isAuthenticated,
    user,
    token,
    loading,
    error,
    login,  // Use the login function directly since it's now wrapped in useCallback
    logout,
    checkAuth,
    checkRole,
  }), [isAuthenticated, user, token, loading, error, login, logout, checkAuth, checkRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth context hook
export const useAuth = () => useContext(AuthContext);
export default AuthContext;
