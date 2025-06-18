import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Container,
  Stack,
  Divider
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // In production, send to your error reporting service
    console.log('Error Report:', errorReport);
    
    // For now, just copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please send this to the development team.');
      })
      .catch(() => {
        alert('Error report generated. Please manually copy the console log and send to the development team.');
      });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Error Header */}
              <Box sx={{ textAlign: 'center' }}>
                <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom color="error.main">
                  Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </Typography>
                {errorId && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Error ID: {errorId}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Error Details (Development Only) */}
              {showDetails && error && (
                <Alert severity="error" icon={<BugReportIcon />}>
                  <AlertTitle>Error Details</AlertTitle>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {error.message}
                  </Typography>
                  {error.stack && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" fontWeight="bold">Stack Trace:</Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '200px',
                          overflow: 'auto',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          mt: 1
                        }}
                      >
                        {error.stack}
                      </Typography>
                    </Box>
                  )}
                  {errorInfo?.componentStack && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" fontWeight="bold">Component Stack:</Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '200px',
                          overflow: 'auto',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          mt: 1
                        }}
                      >
                        {errorInfo.componentStack}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                  size="large"
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  size="large"
                >
                  Go Home
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BugReportIcon />}
                  onClick={this.handleReportBug}
                  size="large"
                >
                  Report Bug
                </Button>
              </Box>

              {/* Help Text */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  If this problem persists, please contact our support team.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return children;
  }
}

export default ErrorBoundary; 