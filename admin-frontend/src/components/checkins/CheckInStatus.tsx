import React, { useEffect } from 'react';
import { Paper, Typography, Box, Skeleton, Alert } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import wsService from '../../services/websocket';

interface CheckInStats {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

export const CheckInStatus: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['checkInStats'],
    queryFn: adminApi.getCheckInStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    // Connect to WebSocket when component mounts
    wsService.connect();

    // Subscribe to check-in updates
    const handleCheckInUpdate = (data: CheckInStats) => {
      queryClient.setQueryData(['checkInStats'], data);
    };

    wsService.subscribe('check_in_update', handleCheckInUpdate);

    // Cleanup on unmount
    return () => {
      wsService.unsubscribe('check_in_update', handleCheckInUpdate);
    };
  }, [queryClient]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading check-in status. Please try again later.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ flex: 1 }}>
              <Skeleton variant="rectangular" height={100} />
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Current Status
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px', textAlign: 'center' }}>
          <Typography variant="h3" color="primary">
            {stats?.currentlyIn || 0}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Currently in Gym
          </Typography>
        </Box>
        <Box sx={{ flex: '1 1 300px', textAlign: 'center' }}>
          <Typography variant="h3" color="primary">
            {stats?.todayTotal || 0}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Total Check-ins Today
          </Typography>
        </Box>
        <Box sx={{ flex: '1 1 300px', textAlign: 'center' }}>
          <Typography variant="h3" color="primary">
            {stats?.averageStayMinutes || 0}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Average Stay (minutes)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};
