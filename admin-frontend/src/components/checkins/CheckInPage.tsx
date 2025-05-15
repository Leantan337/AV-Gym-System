import React, { useState } from 'react';
import { Box, Paper, Typography, Alert, Snackbar } from '@mui/material';
import { BarcodeScanner } from './BarcodeScanner';
import { ManualEntryForm } from './ManualEntryForm';
import { CheckInStatus } from './CheckInStatus';
import { CheckInHistory } from './CheckInHistory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkInMember, getCheckIns, getCheckInHistory } from '../../services/api';

export const CheckInPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: 'today',
    page: 0,
    perPage: 10,
  });

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    open: boolean;
  }>({ message: '', type: 'success', open: false });

  const queryClient = useQueryClient();

  const { data: checkInData, isLoading: isLoadingCheckIns, error: checkInError } = useQuery({
    queryKey: ['checkIns', filters],
    queryFn: () => getCheckInHistory(filters),
  });

  const checkInMutation = useMutation({
    mutationFn: checkInMember,
    onSuccess: () => {
      setNotification({
        message: 'Check-in successful!',
        type: 'success',
        open: true,
      });
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
    },
    onError: (error: Error) => {
      setNotification({
        message: error.message || 'Check-in failed',
        type: 'error',
        open: true,
      });
    },
  });

  const handleCheckIn = async (memberId: string) => {
    checkInMutation.mutate({ memberId });
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
        <Box>
          <CheckInStatus />
        </Box>

        {/* Check-in History */}
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Check-ins
            </Typography>
            <CheckInHistory
              checkIns={checkInData?.checkIns || []}
              isLoading={isLoadingCheckIns}
              error={checkInError}
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
