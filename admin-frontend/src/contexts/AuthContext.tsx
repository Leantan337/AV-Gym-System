import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
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
  login: (username: string, password: string) => Promise<void>;
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
  login: async () => {},
  logout: () => {},
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

  // Configure axios with token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on mount
  useEffect(() => {
    console.log('Auth mount - Token exists:', !!token);
    const checkToken = async () => {
      if (token) {
        try {
          console.log('Checking auth with token...');
          await checkAuth();
          console.log('Auth check successful');
        } catch (error) {
          console.error('Authentication verification failed', error);
          logout();
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No token found');
        setLoading(false);
      }
    };
    
    checkToken();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<void> => {
    console.log('Login attempt for user:', username);
    setLoading(true);
    setError(null);
    
    try {
      console.log('Sending login request...');
      // First, get the tokens
      const tokenResponse = await api.post('/auth/token/', { username, password });
      console.log('Token response received:', tokenResponse.data);
      
      const { access, refresh } = tokenResponse.data;
      
      // Store tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Set the token in axios defaults
      setToken(access);
      
      // Now fetch the user profile
      console.log('Fetching user profile...');
      const userResponse = await api.get('/auth/me/');
      console.log('User profile received:', userResponse.data);
      
      setUser(userResponse.data);
      setIsAuthenticated(true);
      
      console.log('Login successful, navigating to /dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          const messages = Object.values(err.response.data).flat();
          errorMessage = messages.join(' ');
        }
      }
      
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear any partial auth state
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  // Check authentication status
  const checkAuth = async (): Promise<boolean> => {
    console.log('checkAuth called');
    if (!token) {
      console.log('No token found');
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      // First, try to get user info
      console.log('Attempting to fetch user profile...');
      const userResponse = await api.get('/auth/me/');
      console.log('User profile fetched successfully', userResponse.data);
      
      setUser(userResponse.data);
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      
      // If the error is 401, try to refresh the token
      if (err.response?.status === 401) {
        console.log('Token expired, attempting to refresh...');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          try {
            console.log('Refreshing token...');
            const refreshResponse = await api.post('/auth/token/refresh/', { refresh: refreshToken });
            const { access } = refreshResponse.data;
            
            console.log('Token refreshed, updating storage and retrying...');
            localStorage.setItem('token', access);
            setToken(access);
            
            // Retry getting user info with the new token
            const userResponse = await api.get('/auth/me/');
            setUser(userResponse.data);
            setIsAuthenticated(true);
            return true;
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            logout();
            return false;
          }
        }
      }
      
      // If we get here, either no refresh token or refresh failed
      console.log('No valid refresh token or refresh failed, logging out');
      logout();
      return false;
    }
  };

  // Check if user has required role
  const checkRole = (allowedRoles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admin has access to everything
    if (user.role === UserRole.ADMIN) return true;
    
    // Check if user's role is in the allowed roles
    return allowedRoles.includes(user.role);
  };

  // Auth context value
  const contextValue: AuthState = {
    isAuthenticated,
    user,
    token,
    loading,
    error,
    login,
    logout,
    checkAuth,
    checkRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth context hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
