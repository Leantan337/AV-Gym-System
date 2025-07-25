import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Snackbar, Alert, Chip, 
  Fade, Badge, List, ListItem, ListItemText, ListItemIcon,
  Avatar, Card, CardContent, Divider
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from 'recharts';
import ExpiringMemberships from './notifications/ExpiringMemberships';
import { useWebSocket } from '../contexts/WebSocketContext';
import { CheckInEvent, ActivityNotification, CheckInStats } from '../services/websocket';
import { ConnectionStatusIndicator } from './common/ConnectionStatusIndicator';
import PeopleIcon from '@mui/icons-material/People';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface DashboardStats {
  members: {
    total: number;
    active: number;
    new_today: number;
  };
  subscriptions: {
    active: number;
    expiring_soon: number;
  };
  finance: {
    today_revenue: number;
    pending_payments: number;
  };
  checkins: {
    today: number;
    current: number;
  };
}

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInEvent[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityNotification[]>([]);
  const [liveStats, setLiveStats] = useState<CheckInStats | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', type: 'info' });
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({ 
    queryKey: ['dashboardStats'],
    queryFn: adminApi.getDashboardStats,
    initialData: {
      members: { total: 0, active: 0, new_today: 0 },
      subscriptions: { active: 0, expiring_soon: 0 },
      finance: { today_revenue: 0, pending_payments: 0 },
      checkins: { today: 0, current: 0 }
    }
  });

  // Subscribe to real-time check-in updates
  useEffect(() => {
    // Subscribe to check-in/check-out events
    const unsubscribeCheckIn = subscribe<CheckInEvent>('member_checked_in', (checkInEvent) => {
      // Update recent check-ins list
      setRecentCheckIns(prev => {
        const updatedList = [checkInEvent, ...prev.slice(0, 4)];
        return updatedList;
      });
      
      // Show notification
      setNotification({
        open: true,
        message: `${checkInEvent.member.full_name} checked in`,
        type: 'success'
      });
      
      // Invalidate dashboard stats to get updated counts
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    });

    const unsubscribeCheckOut = subscribe<CheckInEvent>('member_checked_out', (checkOutEvent) => {
      // Show notification
      setNotification({
        open: true,
        message: `${checkOutEvent.member.full_name} checked out`,
        type: 'info'
      });
      
      // Invalidate dashboard stats to get updated counts
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    });

    // Subscribe to live statistics updates
    const unsubscribeStats = subscribe<CheckInStats>('stats_update', (statsUpdate) => {
      setLiveStats(statsUpdate);
      // Also update the cached query data
      queryClient.setQueryData(['dashboardStats'], (oldData: any) => ({
        ...oldData,
        checkins: {
          today: statsUpdate.todayTotal,
          current: statsUpdate.currentlyIn
        }
      }));
    });

    // Subscribe to initial stats
    const unsubscribeInitialStats = subscribe<CheckInStats>('initial_stats', (initialStats) => {
      setLiveStats(initialStats);
    });

    // Subscribe to activity notifications
    const unsubscribeActivity = subscribe<ActivityNotification>('activity_notification', (activity) => {
      setActivityFeed(prev => {
        const updatedFeed = [activity, ...prev.slice(0, 9)]; // Keep last 10 activities
        return updatedFeed;
      });
    });
    
    return () => {
      unsubscribeCheckIn();
      unsubscribeCheckOut();
      unsubscribeStats();
      unsubscribeInitialStats();
      unsubscribeActivity();
    };
  }, [subscribe, queryClient]);
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (!stats) {
    return <Typography>Error loading dashboard stats</Typography>;
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const ActivityFeedCard: React.FC = () => (
    <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Badge badgeContent={activityFeed.length} color="primary" sx={{ mr: 2 }}>
            <PeopleIcon />
          </Badge>
          <Typography variant="h6" component="h3">
            Live Activity Feed
          </Typography>
        </Box>
      </CardContent>
      
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
        {activityFeed.length === 0 ? (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ textAlign: 'center', mt: 4 }}
          >
            No recent activity
          </Typography>
        ) : (
          <List dense>
            {activityFeed.map((activity, index) => (
              <React.Fragment key={`${activity.timestamp}-${index}`}>
                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: activity.activity === 'check_in' ? 'success.main' : 'info.main',
                        fontSize: '0.875rem'
                      }}
                    >
                      {activity.activity === 'check_in' ? (
                        <LoginIcon fontSize="small" />
                      ) : (
                        <LogoutIcon fontSize="small" />
                      )}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.member.full_name}
                        </Typography>
                        <Chip
                          size="small"
                          label={activity.activity === 'check_in' ? 'IN' : 'OUT'}
                          color={activity.activity === 'check_in' ? 'success' : 'info'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {formatActivityTime(activity.timestamp)}
                          </Typography>
                        </Box>
                        {activity.location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {activity.location}
                            </Typography>
                          </Box>
                        )}
                        {activity.duration_minutes && activity.activity === 'check_out' && (
                          <Typography variant="caption" color="text.secondary">
                            Duration: {formatDuration(activity.duration_minutes)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < activityFeed.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Card>
  );

    const StatCard: React.FC<{ title: string; value: number | string; subtitle?: string; realTime?: boolean }> = ({
    title,
    value,
    subtitle,
    realTime = false,
  }) => (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        position: 'relative',
        border: realTime ? '2px solid' : '1px solid',
        borderColor: realTime ? 'success.main' : 'divider',
        backgroundColor: realTime ? 'success.50' : 'background.paper',
      }}
    >
      {realTime && (
        <Chip
          size="small"
          label="LIVE"
          color="success"
          variant="filled"
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            fontSize: '0.625rem',
            height: 20
          }}
        />
      )}
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        {title}
      </Typography>
      <Typography component="p" variant="h4">
        {value}
      </Typography>
      <Typography color="text.secondary" sx={{ flex: 1 }}>
        {subtitle}
      </Typography>
    </Paper>
  );

  const memberData = [
    { name: 'Total', value: stats.members.total },
    { name: 'Active', value: stats.members.active },
    { name: 'New Today', value: stats.members.new_today },
  ];

  const subscriptionData = [
    { name: 'Active', value: stats.subscriptions.active },
    { name: 'Expiring Soon', value: stats.subscriptions.expiring_soon },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Connection Status Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          mb: 2,
          gap: 2
        }}
      >
        <ConnectionStatusIndicator />
      </Box>
      
      <Box display="grid" sx={{ gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}>
        {/* Members Stats */}
        <Box>
          <StatCard
            title="Total Members"
            value={stats.members.total}
            subtitle={`${stats.members.active} active`}
          />
        </Box>
        <Box>
          <StatCard
            title="New Members Today"
            value={stats.members.new_today}
          />
        </Box>
        
        {/* Live Check-in Stats */}
        <Box>
          <StatCard
            title="Currently In Gym"
            value={liveStats?.currentlyIn ?? stats.checkins.current}
            subtitle="members present"
            realTime={liveStats !== null}
          />
        </Box>
        <Box>
          <StatCard
            title="Today's Check-ins"
            value={liveStats?.todayTotal ?? stats.checkins.today}
            subtitle={liveStats ? `Avg: ${liveStats.averageStayMinutes}min` : ''}
            realTime={liveStats !== null}
          />
        </Box>

        {/* Activity Feed - Takes 2 columns */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <ActivityFeedCard />
        </Box>

        {/* Member Chart */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Member Statistics
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Revenue and Subscriptions Stats */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <Box display="grid" sx={{ gap: 2, gridTemplateColumns: '1fr 1fr', height: '100%' }}>
            <StatCard
              title="Active Subscriptions"
              value={stats.subscriptions.active}
              subtitle={`${stats.subscriptions.expiring_soon} expiring soon`}
            />
            <StatCard
              title="Today's Revenue"
              value={`$${stats.finance.today_revenue}`}
              subtitle={`$${stats.finance.pending_payments} pending`}
            />
          </Box>
          
          {/* Subscription Chart */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Subscription Overview
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Recent Check-ins Display */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Recent Check-ins
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              {recentCheckIns.length > 0 ? (
                recentCheckIns.map((checkIn, index) => (
                  <Fade in={true} key={`${checkIn.id}-${index}`}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: checkIn.status === 'checked_in' ? 'success.50' : 'grey.50'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {checkIn.member.full_name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {checkIn.member.full_name}
                        </Typography>
                      </Box>
                      <Chip
                        label={checkIn.status === 'checked_in' ? 'CHECKED IN' : 'CHECKED OUT'}
                        size="small"
                        color={checkIn.status === 'checked_in' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Fade>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No recent check-ins
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
        
        {/* Expiring Memberships */}
        <Box sx={{ gridColumn: '1 / -1', mt: 3 }}>
          <ExpiringMemberships />
        </Box>
      </Box>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.type} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
