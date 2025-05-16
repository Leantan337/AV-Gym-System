import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CheckInProvider } from './contexts/CheckInContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { CheckInPage } from './components/checkins/CheckInPage';

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

function App() {
  // TODO: Re-enable authentication check
  // const isAuthenticated = !!localStorage.getItem('token');
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <WebSocketProvider>
          <CheckInProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/check-in" element={<CheckInPage />} />
                </Routes>
              </Layout>
            </Router>
          </CheckInProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
