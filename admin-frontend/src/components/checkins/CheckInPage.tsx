import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Alert, Snackbar } from '@mui/material';
import { BarcodeScanner } from './BarcodeScanner';
import { ManualEntryForm } from './ManualEntryForm';
import { CheckInStatus } from './CheckInStatus';
import { CheckInHistory } from './CheckInHistory';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCheckInHistory, CheckInFilters } from '../../services/api';
import { useCheckIn } from '../../contexts/CheckInContext';

export const CheckInPage: React.FC = () => {
  const [filters, setFilters] = useState<CheckInFilters>({
    search: '',
    status: 'all',
    dateRange: 'today',
    page: 0,
    perPage: 10,
  });

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    open: boolean;
  }>({ message: '', type: 'info', open: false });

  const queryClient = useQueryClient();
  const { checkIn, latestCheckIn, error: checkInError } = useCheckIn();

  // Fetch check-in history
  const { data: checkInData, isLoading: isLoadingCheckIns } = useQuery({
    queryKey: ['checkIns', filters],
    queryFn: () => getCheckInHistory(filters),
  });

  // Handle WebSocket check-in updates
  useEffect(() => {
    if (latestCheckIn) {
      setNotification({
        message: `Member ${latestCheckIn.member.full_name} checked ${latestCheckIn.status === 'checked_in' ? 'in' : 'out'}`,
        type: 'success',
        open: true,
      });
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
    }
  }, [latestCheckIn, queryClient]);

  // Handle WebSocket errors
  useEffect(() => {
    if (checkInError) {
      setNotification({
        message: typeof checkInError === 'string' ? checkInError : 'An error occurred',
        type: 'error',
        open: true,
      });
    }
  }, [checkInError]);

  const handleCheckIn = async (memberId: string) => {
    try {
      await checkIn(memberId);
      // Success notification is handled by the WebSocket listener
    } catch (error) {
      console.error('Check-in error:', error);
      setNotification({
        message: 'Failed to process check-in. Please try again.',
        type: 'error',
        open: true,
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Member Check-In
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Top Section - Barcode and Manual Entry */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {/* Barcode Scanner */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Scan Member Card
              </Typography>
              <BarcodeScanner onScan={handleCheckIn} />
            </Paper>
          </Box>

          {/* Manual Entry */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Manual Check-In
              </Typography>
              <ManualEntryForm onSubmit={handleCheckIn} />
            </Paper>
          </Box>
        </Box>

        {/* Current Status */}
        <CheckInStatus />

        {/* Check-in History */}
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Check-ins
            </Typography>
            <CheckInHistory
              checkIns={checkInData?.checkIns || []}
              isLoading={isLoadingCheckIns}
              error={checkInError ? new Error(String(checkInError)) : undefined}
              totalCount={checkInData?.totalCount || 0}
              onFilter={setFilters}
            />
          </Paper>
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.type} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
