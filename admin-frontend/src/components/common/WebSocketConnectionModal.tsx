import React, { useState, useEffect, useRef } from 'react';
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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DISCONNECT_MODAL_DELAY = 2000; // 2 seconds delay before showing the modal

  // Show dialog when connection is lost
  useEffect(() => {
    // Clear any existing timeouts
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
    }

    if (connectionStatus === 'disconnected') {
      // Start a timer to show the modal after a delay
      disconnectTimerRef.current = setTimeout(() => {
        setOpen(true);
      }, DISCONNECT_MODAL_DELAY);

    } else if (connectionStatus === 'connected') {
      // Close dialog after successful reconnection and show brief success message
      if (open && attempting) {
        // Show success for 1.5 seconds before closing
        closeTimeoutRef.current = setTimeout(() => {
          setOpen(false);
          setAttempting(false);
          setAttemptCount(0);
        }, 1500);
      } else {
        // Ensure dialog is closed when connected
        setOpen(false);
        setAttempting(false); // Ensure attempting is false if connected without a prior attempt
        setAttemptCount(0);
      }
    } else if (connectionStatus === 'connecting') {
        // If modal is not already open, don't open it immediately, wait for disconnected
        // If modal is open (e.g. from a previous disconnected state), keep it open
        if (!open) {
            // Do nothing, wait for disconnected state to trigger the delayed open
        } else {
             // Keep modal open but maybe show connecting state
             setOpen(true);
        }
    }
  }, [connectionStatus, open, attempting]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
      }
    };
  }, []);

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
    // Clear any pending disconnect timer if modal is cancelled before it shows
    if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
    }
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
        title: 'Connecting...', // Keep 'Connecting...' when in this state
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
      // Use a check for 'open' state here so we don't show 'Connection Lost' 
      // before the delay has passed, even if connectionStatus is 'disconnected'
      if (open) {
           return {
            icon: <WifiOffIcon fontSize="large" style={{ color: '#F44336' }} />,
            title: 'Connection Lost',
            message: 'The real-time connection to the server has been lost. This may cause delays in updates to check-ins and other real-time features.',
            severity: 'warning' as const
          };
      } else {
          // If not open and disconnected, return null or a minimal state
          // The modal will be managed by the open state based on the timer
          return {
            icon: null,
            title: null,
            message: null,
            severity: null
          };
      }
    }
  };

  const content = getDialogContent();

  // Only render the Dialog if content title is not null (meaning open is true and not in a brief connecting state)
  if (!content.title) return null;


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
