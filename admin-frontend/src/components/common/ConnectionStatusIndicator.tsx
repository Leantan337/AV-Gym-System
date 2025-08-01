import React, { useState } from 'react';
import { Alert, AlertTitle, Collapse, IconButton, Typography, Box, Chip } from '@mui/material';
import { ExpandMore, ExpandLess, Wifi, WifiOff, Warning, Refresh } from '@mui/icons-material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { WebSocketErrorType } from '../../services/websocket';

const ConnectionStatusIndicator: React.FC = () => {
  const { connectionStatus, lastError, isFallbackMode, reconnect } = useWebSocket();
  const [expanded, setExpanded] = useState(false);

  // Don't show indicator when connected and no errors
  if (connectionStatus === 'connected' && !lastError && !isFallbackMode) {
    return null;
  }

  const getStatusInfo = () => {
    if (connectionStatus === 'authentication_failed') {
      return {
        severity: 'error' as const,
        icon: <WifiOff />,
        title: 'Authentication Failed',
        message: 'Please refresh the page to re-authenticate',
        showRetry: false,
      };
    }

    if (connectionStatus === 'failed') {
      return {
        severity: 'error' as const,
        icon: <WifiOff />,
        title: 'Connection Failed',
        message: 'Unable to connect to the server',
        showRetry: true,
      };
    }

    if (isFallbackMode) {
      return {
        severity: 'warning' as const,
        icon: <Warning />,
        title: 'Using Backup Mode',
        message: 'Real-time updates are limited. Data refreshes every 10 seconds.',
        showRetry: true,
      };
    }

    if (connectionStatus === 'connecting') {
      return {
        severity: 'info' as const,
        icon: <Wifi />,
        title: 'Connecting...',
        message: 'Establishing connection to the server',
        showRetry: false,
      };
    }

    if (connectionStatus === 'disconnected' && lastError) {
      return {
        severity: 'warning' as const,
        icon: <WifiOff />,
        title: 'Connection Lost',
        message: 'Attempting to reconnect...',
        showRetry: true,
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const formatErrorType = (type: WebSocketErrorType): string => {
    switch (type) {
      case WebSocketErrorType.AUTHENTICATION_ERROR:
        return 'Authentication';
      case WebSocketErrorType.NETWORK_ERROR:
        return 'Network';
      case WebSocketErrorType.SERVER_ERROR:
        return 'Server';
      case WebSocketErrorType.CONNECTION_TIMEOUT:
        return 'Timeout';
      case WebSocketErrorType.HEARTBEAT_TIMEOUT:
        return 'Connection Lost';
      case WebSocketErrorType.MESSAGE_ERROR:
        return 'Message';
      default:
        return 'Unknown';
    }
  };

  const getRetryLabel = (): string => {
    if (isFallbackMode) return 'Try Real-time';
    if (connectionStatus === 'failed') return 'Retry Connection';
    return 'Reconnect';
  };

  return (
    <Alert 
      severity={statusInfo.severity}
      icon={statusInfo.icon}
      sx={{ mb: 2 }}
      action={
        <Box display="flex" alignItems="center" gap={1}>
          {statusInfo.showRetry && (
            <IconButton
              size="small"
              onClick={reconnect}
              color="inherit"
              title={getRetryLabel()}
            >
              <Refresh />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            color="inherit"
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      }
    >
      <AlertTitle>{statusInfo.title}</AlertTitle>
      <Typography variant="body2">{statusInfo.message}</Typography>
      
      {isFallbackMode && (
        <Box mt={1}>
          <Chip 
            label="Backup Mode" 
            size="small" 
            color="warning" 
            variant="outlined"
          />
        </Box>
      )}

      <Collapse in={expanded}>
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            <strong>Connection Status:</strong> {connectionStatus}
          </Typography>
          
          {lastError && (
            <>
              <Typography variant="body2" color="text.secondary" mt={1}>
                <strong>Error Type:</strong> {formatErrorType(lastError.type)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Error Message:</strong> {lastError.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Time:</strong> {new Date(lastError.timestamp).toLocaleTimeString()}
              </Typography>
              {lastError.retryable !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Retryable:</strong> {lastError.retryable ? 'Yes' : 'No'}
                </Typography>
              )}
            </>
          )}

          {isFallbackMode && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              <strong>Fallback Mode:</strong> Polling for updates every 10 seconds
            </Typography>
          )}
        </Box>
      </Collapse>
    </Alert>
  );
};

export default ConnectionStatusIndicator;
