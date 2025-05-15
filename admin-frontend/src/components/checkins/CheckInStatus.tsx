import React from 'react';
import { Paper, Typography, Box, Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

interface CheckInStats {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

export const CheckInStatus: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['checkInStats'],
    queryFn: adminApi.getCheckInStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
