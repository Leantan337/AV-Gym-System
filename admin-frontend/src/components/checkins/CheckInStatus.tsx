import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, Skeleton, Alert, Chip, CircularProgress, LinearProgress } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import wsService from '../../services/websocket';
import { UserCheck, Users, Clock } from 'lucide-react';

interface CheckInStats {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

export const CheckInStatus: React.FC = () => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealtime, setIsRealtime] = useState<boolean>(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['checkInStats'],
    queryFn: adminApi.getCheckInStats,
    refetchInterval: isRealtime ? 30000 : false, // Refresh every 30 seconds if realtime enabled
  });

  useEffect(() => {
    // Connect to WebSocket when component mounts
    try {
      wsService.connect();
      setRealtimeStatus('connecting');
      
      // Set up connection status monitoring
      const connectionMonitor = setInterval(() => {
        const status = wsService.getConnectionStatus();
        setRealtimeStatus(status);
      }, 1000);

      // Subscribe to check-in updates
      const handleCheckInUpdate = (data: CheckInStats) => {
        queryClient.setQueryData(['checkInStats'], data);
        setLastUpdate(new Date());
      };

      // Subscribe to connection status updates
      const handleConnectionStatus = (status: 'connected' | 'disconnected' | 'connecting') => {
        setRealtimeStatus(status);
        if (status === 'connected') {
          // Force a refetch when we reconnect
          refetch();
        }
      };

      wsService.subscribe('check_in_update', handleCheckInUpdate);
      wsService.subscribe('connection_status', handleConnectionStatus);

      // Cleanup on unmount
      return () => {
        wsService.unsubscribe('check_in_update', handleCheckInUpdate);
        wsService.unsubscribe('connection_status', handleConnectionStatus);
        clearInterval(connectionMonitor);
      };
    } catch (err) {
      console.error('Failed to connect to WebSocket', err);
      setRealtimeStatus('disconnected');
      setIsRealtime(false);
    }
  }, [queryClient, refetch]);

  // Format time since last update
  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - lastUpdate.getTime()) / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    return `${Math.floor(diffSeconds / 3600)} hours ago`;
  };

  const handleManualRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

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
        <LinearProgress />
        <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
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
    <Paper sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
      {/* Status bar at the top */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          p: 0.5, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: realtimeStatus === 'connected' ? 'rgba(46, 125, 50, 0.08)' : 
                        realtimeStatus === 'connecting' ? 'rgba(237, 108, 2, 0.08)' : 
                        'rgba(211, 47, 47, 0.08)',
          borderBottom: realtimeStatus === 'connected' ? '1px solid rgba(46, 125, 50, 0.2)' : 
                        realtimeStatus === 'connecting' ? '1px solid rgba(237, 108, 2, 0.2)' : 
                        '1px solid rgba(211, 47, 47, 0.2)',
        }}
      >
        <Chip 
          size="small" 
          label={realtimeStatus === 'connected' ? 'Real-time Connected' : 
                realtimeStatus === 'connecting' ? 'Connecting...' : 
                'Disconnected - Using Polling'} 
          color={realtimeStatus === 'connected' ? 'success' : 
                realtimeStatus === 'connecting' ? 'warning' : 
                'error'}
          variant="outlined"
          icon={realtimeStatus === 'connecting' ? <CircularProgress size={12} /> : undefined}
        />
        <Typography variant="caption" color="text.secondary">
          Last updated: {getTimeSinceUpdate()}
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <UserCheck size={24} />
          <Typography variant="h6">
            Current Status
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 3, 
            flexWrap: 'wrap',
            mt: 3,
            mb: 1
          }}
        >
          <Paper 
            elevation={1} 
            sx={{ 
              flex: '1 1 300px', 
              textAlign: 'center', 
              p: 2, 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: 'primary.main',
              }
            }}
          >
            <UserCheck size={20} />
            <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
              {stats?.currentlyIn || 0}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Currently in Gym
            </Typography>
          </Paper>
          
          <Paper 
            elevation={1} 
            sx={{ 
              flex: '1 1 300px', 
              textAlign: 'center', 
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: 'success.main',
              }
            }}
          >
            <Users size={20} />
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
              {stats?.todayTotal || 0}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Total Check-ins Today
            </Typography>
          </Paper>
          
          <Paper 
            elevation={1} 
            sx={{ 
              flex: '1 1 300px', 
              textAlign: 'center', 
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: 'info.main',
              }
            }}
          >
            <Clock size={20} />
            <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>
              {stats?.averageStayMinutes || 0}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Average Stay (minutes)
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Paper>
  );
};
