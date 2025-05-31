import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  CircularProgress,
  Box,
  Alert
} from '@mui/material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';

const WebSocketConnectionModal: React.FC = () => {
  const { connectionStatus, reconnect, isConnected } = useWebSocket();
  const [open, setOpen] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Show dialog when connection is lost
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setOpen(true);
    } else if (connectionStatus === 'connected') {
      // Close dialog after successful reconnection and show brief success message
      if (open && attempting) {
        // Show success for 1.5 seconds before closing
        setTimeout(() => {
          setOpen(false);
          setAttempting(false);
          setAttemptCount(0);
        }, 1500);
      } else {
        // Ensure dialog is closed when connected
        setOpen(false);
      }
    }
  }, [connectionStatus, open, attempting]);
  
  // Force ability to close the dialog if it's been open too long
  useEffect(() => {
    if (open) {
      // Allow closing the dialog after 30 seconds no matter what
      const forceCloseTimer = setTimeout(() => {
        if (open) {
          console.log('Forcing WebSocket dialog close after timeout');
          setOpen(false);
          setAttempting(false);
        }
      }, 30000);
      
      return () => clearTimeout(forceCloseTimer);
    }
  }, [open]);

  const handleCancel = () => {
    console.log('Dialog cancel requested');
    setOpen(false);
    setAttempting(false);
    setAttemptCount(0);
    
    // If we've been trying for too long, force a reset of the connection
    if (attemptCount > 3) {
      // Small delay to ensure the modal closes first
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleReconnect = () => {
    setAttempting(true);
    setAttemptCount(prev => prev + 1);
    reconnect();
  };

  // Show appropriate title and content based on connection status
  const getDialogContent = () => {
    if (connectionStatus === 'connected' && attempting) {
      return {
        icon: <WifiIcon fontSize="large" style={{ color: '#4CAF50' }} />,
        title: 'Connection Restored',
        message: 'The real-time connection has been successfully restored.',
        severity: 'success' as const
      };
    } else if (connectionStatus === 'connecting') {
      return {
        icon: <CircularProgress size={30} />,
        title: 'Connecting...',
        message: 'Attempting to establish a real-time connection to the server.',
        severity: 'info' as const
      };
    } else if (connectionStatus === 'authentication_failed') {
      return {
        icon: <WifiOffIcon fontSize="large" style={{ color: '#F44336' }} />,
        title: 'Authentication Failed',
        message: 'Your session may have expired. Please try refreshing the page or signing in again.',
        severity: 'error' as const
      };
    } else {
      return {
        icon: <WifiOffIcon fontSize="large" style={{ color: '#F44336' }} />,
        title: 'Connection Lost',
        message: 'The real-time connection to the server has been lost. This may cause delays in updates to check-ins and other real-time features.',
        severity: 'warning' as const
      };
    }
  };

  const content = getDialogContent();

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      aria-labelledby="websocket-connection-dialog-title"
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={false}
      disablePortal={false}
      keepMounted
    >
      <DialogTitle id="websocket-connection-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          {content.icon}
          <Typography variant="h6">{content.title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity={content.severity} sx={{ mb: 2 }}>
          {content.message}
        </Alert>
        
        {connectionStatus === 'disconnected' && (
          <Typography variant="body2" color="textSecondary">
            {attemptCount > 0 
              ? `Reconnection attempt ${attemptCount} failed. Please try again or continue without real-time updates.`
              : 'You can try reconnecting or continue working with delayed updates.'}
          </Typography>
        )}
        
        {connectionStatus === 'authentication_failed' && (
          <Typography variant="body2" color="textSecondary">
            For your security, you may need to log in again to restore the connection.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCancel} 
          color="inherit"
        >
          {connectionStatus === 'connected' ? 'Close' : 'Cancel'}
        </Button>
        
        {connectionStatus !== 'connected' && (
          <Button 
            onClick={handleReconnect} 
            color="primary" 
            variant="contained"
            startIcon={<SyncIcon />}
            disabled={connectionStatus === 'connecting'}
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'RECONNECT NOW'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WebSocketConnectionModal;
