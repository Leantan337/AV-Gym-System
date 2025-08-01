import React, { Component, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box, Typography } from '@mui/material';
import { Refresh, WifiOff } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

class WebSocketErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: error.stack || null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WebSocket Error Boundary caught an error:', error, errorInfo);
    
    // Log to external error reporting service if available
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Force a page reload as last resort
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box p={2}>
          <Alert 
            severity="error" 
            icon={<WifiOff />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Reload Page
              </Button>
            }
          >
            <AlertTitle>Connection Error</AlertTitle>
            <Typography variant="body2" gutterBottom>
              Something went wrong with the real-time connection. This usually resolves itself with a page refresh.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Error:</strong> {this.state.error.message}
                </Typography>
                {this.state.errorInfo && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    component="pre"
                    sx={{ 
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '200px',
                      mt: 1,
                      p: 1,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: 1,
                    }}
                  >
                    {this.state.errorInfo}
                  </Typography>
                )}
              </Box>
            )}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default WebSocketErrorBoundary;
