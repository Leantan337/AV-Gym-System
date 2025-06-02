import React from 'react';
import { 
  Box, 
  Chip, 
  Button, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  CircularProgress
} from '@mui/material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorIcon from '@mui/icons-material/Error';

export const ConnectionStatusIndicator: React.FC = () => {
  const { connectionStatus, reconnect } = useWebSocket();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  // Status configuration for each connection state
  const statusConfig = {
    connected: {
      label: 'Connected',
      color: 'success' as const,
      icon: <WifiIcon fontSize="small" />,
      tooltip: 'WebSocket connection is established and working properly'
    },
    connecting: {
      label: 'Connecting',
      color: 'warning' as const,
      icon: <CircularProgress size={16} />,
      tooltip: 'Attempting to establish a WebSocket connection'
    },
    disconnected: {
      label: 'Disconnected',
      color: 'error' as const,
      icon: <WifiOffIcon fontSize="small" />,
      tooltip: 'WebSocket connection is lost. Click to reconnect'
    },
    authentication_failed: {
      label: 'Auth Failed',
      color: 'error' as const,
      icon: <ErrorIcon fontSize="small" />,
      tooltip: 'WebSocket authentication failed. Click for details'
    },
    failed: {
      label: 'Connection Failed',
      color: 'error' as const,
      icon: <ErrorIcon fontSize="small" />,
      tooltip: 'WebSocket connection failed after multiple attempts. Click to reconnect'
    }
  };

  const currentStatus = statusConfig[connectionStatus];

  const handleClick = () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'authentication_failed') {
      setOpenDialog(true);
    }
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    
    // Add a delay before closing the dialog to give feedback to the user
    setTimeout(() => {
      setIsReconnecting(false);
      setOpenDialog(false);
    }, 1000);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <>
      <Tooltip title={currentStatus.tooltip}>
        <Chip
          icon={currentStatus.icon}
          label={currentStatus.label}
          color={currentStatus.color}
          size="small"
          onClick={handleClick}
          sx={{ 
            cursor: connectionStatus === 'disconnected' || connectionStatus === 'authentication_failed' 
              ? 'pointer' 
              : 'default',
            '& .MuiChip-label': {
              px: 1
            }
          }}
        />
      </Tooltip>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {connectionStatus === 'authentication_failed' 
            ? 'Authentication Failed' 
            : 'Connection Lost'}
        </DialogTitle>
        <DialogContent>
          {connectionStatus === 'authentication_failed' ? (
            <Typography>
              The WebSocket connection failed due to an authentication error. This may be due to 
              an expired session. Try logging out and logging back in.
            </Typography>
          ) : (
            <Typography>
              The real-time connection to the server has been lost. This may cause delays in 
              updates to check-ins and other real-time features.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleReconnect} 
            variant="contained" 
            color="primary"
            disabled={isReconnecting}
            startIcon={isReconnecting ? <CircularProgress size={16} /> : <SyncIcon />}
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
