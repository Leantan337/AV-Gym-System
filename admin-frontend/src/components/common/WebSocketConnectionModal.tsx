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
  const [userCancelled, setUserCancelled] = useState(false);

  // Show dialog when connection is lost or restored
  useEffect(() => {
    console.debug('useEffect [connectionStatus, userCancelled] triggered', { connectionStatus, open, userCancelled, attempting, disconnectTimerRef: !!disconnectTimerRef.current });
    // Clear any pending timeouts when status changes
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
    }

    if (connectionStatus === 'disconnected' || connectionStatus === 'failed') {
      // If disconnected or failed, show the modal after a delay unless user cancelled
      if (!userCancelled) {
        console.debug('Status is disconnected/failed and not user cancelled, setting disconnect timer...');
        disconnectTimerRef.current = setTimeout(() => {
          console.debug('Disconnect timer fired, setting open(true)');
          setOpen(true);
          setAttempting(false); // Not attempting automatically when first disconnected
          setAttemptCount(0); // Reset attempt count when disconnected
        }, DISCONNECT_MODAL_DELAY);
      } else {
        console.debug('Status is disconnected/failed but user cancelled. Not showing modal.');
      }

    } else if (connectionStatus === 'connected') {
      // If connected, close the modal and reset flags
      console.debug('Status is connected, closing modal if open and resetting flags.', { open, attempting, userCancelled });
      if (open) {
        // Show success message briefly if a reconnect was attempted
        if (attempting) {
          closeTimeoutRef.current = setTimeout(() => {
            setOpen(false);
          }, 1500); // Show success for 1.5 seconds
        } else {
           setOpen(false);
        }
      }
      // Reset attempting and userCancelled flags
      setAttempting(false);
      setUserCancelled(false);
      setAttemptCount(0);

    } else if (connectionStatus === 'connecting') {
       // If connecting, and modal is open (e.g., from a failed state), keep it open but update text
       // If modal is not open, don't open it yet, wait for disconnected/failed
       if (open) {
         setAttempting(true); // Indicate attempt is in progress
       } else {
         // Do nothing, wait for disconnected/failed state to trigger the modal
         setAttempting(false);
       }
    }
  }, [connectionStatus, userCancelled]); // Depend only on connectionStatus and userCancelled

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
    console.debug('handleCancel called', { connectionStatus, open, userCancelled, attempting, attemptCount });
    // Clear any pending disconnect timer if modal is cancelled before it shows
    if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
    }
    
    // Set userCancelled flag to prevent immediate re-opening
    setUserCancelled(true);
    
    // Only close the dialog, don't affect the connection state
    setOpen(false);
    
    // If we're in a connecting state, let it continue
    if (connectionStatus === 'connecting') {
      console.log('Connection attempt in progress, allowing it to continue');
      return;
    }
    
    // If we've been trying for too long, force a reset of the connection
    if (attemptCount > 3) {
      console.log('Too many reconnection attempts, forcing page reload');
      // Small delay to ensure the modal closes first
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // Reset attempt count but don't disconnect
      setAttemptCount(0);
      setAttempting(false);
    }
  };

  const handleReconnect = () => {
    console.debug('handleReconnect called', { connectionStatus, open, userCancelled, attempting, attemptCount });
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
