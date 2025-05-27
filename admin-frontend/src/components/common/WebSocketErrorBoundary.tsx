import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert, Button, Typography } from '@mui/material';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface WebSocketErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface WebSocketErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Helper component to access context hooks inside class component
const WebSocketErrorBoundaryWithHooks: React.FC<WebSocketErrorBoundaryProps> = (props) => {
  const { reconnect } = useWebSocket();
  
  return (
    <WebSocketErrorBoundaryClass
      {...props}
      reconnect={reconnect}
    />
  );
};

class WebSocketErrorBoundaryClass extends Component<
  WebSocketErrorBoundaryProps & { reconnect: () => void },
  WebSocketErrorBoundaryState
> {
  constructor(props: WebSocketErrorBoundaryProps & { reconnect: () => void }) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): WebSocketErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('WebSocket component error:', error, errorInfo);
  }

  handleRetry = (): void => {
    // Try to reconnect WebSocket
    this.props.reconnect();
    
    // Reset the error state
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <Box 
          sx={{
            p: 3,
            border: '1px solid #f0f0f0',
            borderRadius: 1,
            backgroundColor: '#fafafa'
          }}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Real-time connection error
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {this.state.error?.message || 'An unexpected error occurred in the real-time connection component.'}
            </Typography>
          </Alert>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleRetry}
            >
              Reconnect
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Export the component with hooks
export const WebSocketErrorBoundary = WebSocketErrorBoundaryWithHooks;
