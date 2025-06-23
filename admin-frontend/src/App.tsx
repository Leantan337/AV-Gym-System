import React, { useEffect } from 'react';
import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { CheckInProvider } from './contexts/CheckInContext';
import { AuthProvider, UserRole, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { WebSocketErrorBoundary } from './components/common/WebSocketErrorBoundary';
import WebSocketConnectionModal from './components/common/WebSocketConnectionModal';
import SecurityHeadersProvider from './components/common/SecurityHeadersProvider';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { CheckInPage } from './components/checkins/CheckInPage';
import NotificationPage from './components/notifications/NotificationPage';
import EmailTemplatesPage from './components/email/EmailTemplatesPage';
import ReportPage from './components/reports/ReportPage';
import LoginPage from './components/auth/LoginPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import RoleAuthorization from './components/auth/RoleAuthorization';
import AuthTestPage from './pages/AuthTestPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationSystem from './components/common/NotificationSystem';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'light',
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
  
  return (
    <>
      {/* Re-enable WebSocketConnectionModal for better user feedback */}
      <WebSocketConnectionModal />
      {children}
    </>
  );
};

// Global emergency dialog escape function - press ESC 3 times to force refresh the page
// This helps recover from any stuck modal dialogs
function setupEmergencyEscape() {
  let escCount = 0;
  let escTimer: ReturnType<typeof setTimeout> | null = null;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      escCount++;
      
      if (escCount === 1) {
        // Reset counter after 2 seconds if not pressed again
        escTimer = setTimeout(() => {
          escCount = 0;
        }, 2000);
      }
      
      if (escCount >= 3) {
        console.log('Emergency escape triggered - refreshing page');
        if (escTimer !== null) clearTimeout(escTimer);
        window.location.reload();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    if (escTimer !== null) clearTimeout(escTimer);
  };
}

function App() {
  // Setup emergency escape handler
  useEffect(() => {
    const cleanup = setupEmergencyEscape();
    return cleanup;
  }, []);
  
  return (
    <ErrorBoundary>
      <SecurityHeadersProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <NotificationProvider>
              <Router>
                <AuthProvider>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/auth-test" element={<AuthTestPage />} />
                    
                    {/* Protected routes */}
                    <Route path="/" element={
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER,
                          UserRole.STAFF,
                          UserRole.TRAINER,
                          UserRole.FRONT_DESK
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                        }}
                      >
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
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER,
                          UserRole.STAFF,
                          UserRole.TRAINER
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                          // Could add server-side logging here in the future
                        }}
                      >
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
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER,
                          UserRole.STAFF,
                          UserRole.FRONT_DESK
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                        }}
                      >
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
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                        }}
                      >
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
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                        }}
                      >
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
                    
                    {/* Email Templates - accessible by admin and manager only */}
                    <Route path="/email-templates" element={
                      <RoleAuthorization 
                        allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.MANAGER
                        ]}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized access to ${path} by role ${role}`);
                        }}
                      >
                        <WebSocketProvider>
                          <AuthenticatedWebSocket>
                            <WebSocketErrorBoundary>
                              <Layout>
                                <EmailTemplatesPage />
                              </Layout>
                            </WebSocketErrorBoundary>
                          </AuthenticatedWebSocket>
                        </WebSocketProvider>
                      </RoleAuthorization>
                    } />
                    
                    {/* Admin-only routes */}
                    <Route path="/dashboard" element={
                      <RoleAuthorization 
                        allowedRoles={[UserRole.ADMIN]}
                        adminOnly={true}
                        onUnauthorized={(path, role) => {
                          console.error(`Unauthorized admin access to ${path} by role ${role}`);
                        }}
                      >
                        <WebSocketProvider>
                          <AuthenticatedWebSocket>
                            <WebSocketErrorBoundary>
                              <Layout>
                                <DashboardPage />
                              </Layout>
                            </WebSocketErrorBoundary>
                          </AuthenticatedWebSocket>
                        </WebSocketProvider>
                      </RoleAuthorization>
                    } />
                  </Routes>
                  
                  {/* Global Notification System */}
                  <NotificationSystem position="top-right" maxNotifications={5} />
                </AuthProvider>
              </Router>
            </NotificationProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SecurityHeadersProvider>
    </ErrorBoundary>
  );
}

export default App;
