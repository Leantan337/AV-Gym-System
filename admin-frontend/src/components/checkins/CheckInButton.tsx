import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useCheckIn } from '../../contexts/CheckInContext';

interface CheckInButtonProps {
  memberId: string;
  isCheckedIn: boolean;
  checkInId?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  memberId,
  isCheckedIn,
  checkInId,
  variant = 'contained',
  size = 'medium',
}) => {
  const { checkIn, checkOut, loading, error } = useCheckIn();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleClick = async () => {
    try {
      if (isCheckedIn && checkInId) {
        await checkOut(checkInId);
        // We don't need to set the snackbar message here as the WebSocket notification will handle it
      } else {
        await checkIn(memberId);
        // We don't need to set the snackbar message here as the WebSocket notification will handle it
      }
    } catch (err) {
      // Only show errors that weren't already caught by the WebSocket handler
      if (!error) {
        setSnackbarMessage('Connection error. Please try again.');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <>
      <Button
        variant={variant}
        color={isCheckedIn ? 'secondary' : 'primary'}
        onClick={handleClick}
        disabled={loading}
        size={size}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? (
          'Processing...'
        ) : isCheckedIn ? (
          'Check Out'
        ) : (
          'Check In'
        )}
      </Button>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
