import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on mount
  useEffect(() => {
    const checkToken = async () => {
      if (token) {
        try {
          await checkAuth();
        } catch (error) {
          console.error('Authentication verification failed', error);
          logout();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    checkToken();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/auth/token/', { username, password });
      const { access, refresh, user } = response.data;
      
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      
      setToken(access);
      setUser(user);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err: any) {
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
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      // Verify token
      await axios.post('/api/auth/token/verify/', { token });
      
      // Get current user info
      const userResponse = await axios.get('/api/auth/me/');
      setUser(userResponse.data);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Token verification failed', err);
      
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('/api/auth/token/refresh/', { refresh: refreshToken });
          const { access } = refreshResponse.data;
          
          localStorage.setItem('token', access);
          setToken(access);
          
          // Try again with the new token
          const userResponse = await axios.get('/api/auth/me/');
          setUser(userResponse.data);
          setIsAuthenticated(true);
          return true;
        } catch (refreshErr) {
          console.error('Token refresh failed', refreshErr);
          logout();
          return false;
        }
      } else {
        logout();
        return false;
      }
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
