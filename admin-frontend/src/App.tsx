import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { CheckInProvider } from './contexts/CheckInContext';
import { AuthProvider, UserRole, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { WebSocketErrorBoundary } from './components/common/WebSocketErrorBoundary';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { CheckInPage } from './components/checkins/CheckInPage';
import NotificationPage from './components/notifications/NotificationPage';
import ReportPage from './components/reports/ReportPage';
import LoginPage from './components/auth/LoginPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import RoleAuthorization from './components/auth/RoleAuthorization';
import AuthTestPage from './pages/AuthTestPage';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Higher order component to handle WebSocket authentication
const AuthenticatedWebSocket: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { setAuthToken } = useWebSocket();
  
  useEffect(() => {
    // When user or token changes, update WebSocket authentication
    if (user && token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [user, token, setAuthToken]);
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <Router>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/auth-test" element={<AuthTestPage />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <RoleAuthorization allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.MANAGER,
                  UserRole.STAFF,
                  UserRole.TRAINER,
                  UserRole.FRONT_DESK
                ]}>
                  <WebSocketProvider>
                    <AuthenticatedWebSocket>
                      <WebSocketErrorBoundary>
                        <CheckInProvider>
                          <Layout>
                            <Dashboard />
                          </Layout>
                        </CheckInProvider>
                      </WebSocketErrorBoundary>
                    </AuthenticatedWebSocket>
                  </WebSocketProvider>
                </RoleAuthorization>
              } />
              
              {/* Members - accessible by everyone except front desk */}
              <Route path="/members" element={
                <RoleAuthorization allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.MANAGER,
                  UserRole.STAFF,
                  UserRole.TRAINER
                ]}>
                  <WebSocketProvider>
                    <AuthenticatedWebSocket>
                      <WebSocketErrorBoundary>
                        <CheckInProvider>
                          <Layout>
                            <Members />
                          </Layout>
                        </CheckInProvider>
                      </WebSocketErrorBoundary>
                    </AuthenticatedWebSocket>
                  </WebSocketProvider>
                </RoleAuthorization>
              } />
              
              {/* Check-in - accessible by admin, manager, staff, and front desk */}
              <Route path="/check-in" element={
                <RoleAuthorization allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.MANAGER,
                  UserRole.STAFF,
                  UserRole.FRONT_DESK
                ]}>
                  <WebSocketProvider>
                    <AuthenticatedWebSocket>
                      <WebSocketErrorBoundary>
                        <CheckInProvider>
                          <Layout>
                            <CheckInPage />
                          </Layout>
                        </CheckInProvider>
                      </WebSocketErrorBoundary>
                    </AuthenticatedWebSocket>
                  </WebSocketProvider>
                </RoleAuthorization>
              } />
              
              {/* Notifications - accessible by admin and manager only */}
              <Route path="/notifications" element={
                <RoleAuthorization allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.MANAGER
                ]}>
                  <WebSocketProvider>
                    <AuthenticatedWebSocket>
                      <WebSocketErrorBoundary>
                        <Layout>
                          <NotificationPage />
                        </Layout>
                      </WebSocketErrorBoundary>
                    </AuthenticatedWebSocket>
                  </WebSocketProvider>
                </RoleAuthorization>
              } />
              
              {/* Reports - accessible by admin and manager only */}
              <Route path="/reports" element={
                <RoleAuthorization allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.MANAGER
                ]}>
                  <WebSocketProvider>
                    <AuthenticatedWebSocket>
                      <WebSocketErrorBoundary>
                        <Layout>
                          <ReportPage />
                        </Layout>
                      </WebSocketErrorBoundary>
                    </AuthenticatedWebSocket>
                  </WebSocketProvider>
                </RoleAuthorization>
              } />
              
              {/* Redirect to dashboard if logged in, otherwise to login */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
