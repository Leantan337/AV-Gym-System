import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Typography,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { NotificationType } from '../../hooks/useNotification';
import { useNotificationContext } from '../../contexts/NotificationContext';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    default:
      return <InfoIcon />;
  }
};

const getNotificationSeverity = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
};

interface NotificationSystemProps {
  maxNotifications?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 5,
  position = 'top-right'
}) => {
  const { notifications, removeNotification } = useNotificationContext();

  // Limit the number of notifications displayed
  const displayNotifications = notifications.slice(-maxNotifications);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return { top: 16, right: 16 };
      case 'top-left':
        return { top: 16, left: 16 };
      case 'bottom-right':
        return { bottom: 16, right: 16 };
      case 'bottom-left':
        return { bottom: 16, left: 16 };
      case 'top-center':
        return { top: 16, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return { bottom: 16, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { top: 16, right: 16 };
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 9999,
        ...getPositionStyles(),
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400,
        width: '100%'
      }}
    >
      {displayNotifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{
            vertical: position.includes('top') ? 'top' : 'bottom',
            horizontal: position.includes('right') ? 'right' : position.includes('left') ? 'left' : 'center'
          }}
          sx={{
            position: 'static',
            transform: 'none',
            maxWidth: 400
          }}
        >
          <Alert
            severity={getNotificationSeverity(notification.type)}
            icon={getNotificationIcon(notification.type)}
            onClose={() => removeNotification(notification.id)}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {notification.action && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={notification.action.onClick}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    {notification.action.label}
                  </Button>
                )}
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => removeNotification(notification.id)}
                  sx={{ p: 0.5 }}
                  aria-label="close"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              width: '100%',
              boxShadow: 3,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Box>
              <AlertTitle sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {notification.title}
              </AlertTitle>
              <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                {notification.message}
              </Typography>
              {notification.timestamp && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    opacity: 0.7,
                    fontSize: '0.7rem'
                  }}
                >
                  {notification.timestamp.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default NotificationSystem; 