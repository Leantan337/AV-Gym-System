import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Snackbar, Alert, Chip, 
  Fade, Badge, Tabs, Tab
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from 'recharts';
import ExpiringMemberships from './notifications/ExpiringMemberships';
import { useWebSocket } from '../contexts/WebSocketContext';
import { CheckInEvent } from '../services/websocket';
import { ConnectionStatusIndicator } from './common/ConnectionStatusIndicator';
import PerformanceDashboard from './PerformanceDashboard';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SpeedIcon from '@mui/icons-material/Speed';

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
  const [activeTab, setActiveTab] = useState(0);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInEvent[]>([]);
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
    const unsubscribe = subscribe<CheckInEvent>('check_in_update', (checkInEvent) => {
      // Update recent check-ins list
      setRecentCheckIns(prev => {
        const updatedList = [checkInEvent, ...prev.slice(0, 4)];
        return updatedList;
      });
      
      // Show notification
      const action = checkInEvent.status === 'checked_in' ? 'checked in' : 'checked out';
      setNotification({
        open: true,
        message: `${checkInEvent.member.full_name} has ${action}`,
        type: 'info'
      });
      
      // Invalidate dashboard stats to get updated counts
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    });
    
    return () => unsubscribe();
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

  const StatCard: React.FC<{ title: string; value: number | string; subtitle?: string }> = ({
    title,
    value,
    subtitle,
  }) => (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
      }}
    >
      <Typography color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography component="h2" variant="h3">
        {value}
      </Typography>
      {subtitle && (
        <Typography color="textSecondary" sx={{ flex: 1 }}>
          {subtitle}
        </Typography>
      )}
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
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          gap: 2
        }}
      >
        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="dashboard tabs"
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="Overview" 
            iconPosition="start"
          />
          <Tab 
            icon={<SpeedIcon />} 
            label="Performance" 
            iconPosition="start"
          />
        </Tabs>
        
        <ConnectionStatusIndicator />
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
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
        <Box>
          <StatCard
            title="Active Subscriptions"
            value={stats.subscriptions.active}
            subtitle={`${stats.subscriptions.expiring_soon} expiring soon`}
          />
        </Box>
        <Box>
          <StatCard
            title="Today's Revenue"
            value={`$${stats.finance.today_revenue}`}
            subtitle={`$${stats.finance.pending_payments} pending`}
          />
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

        {/* Subscription Chart */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Subscription Overview
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
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

        {/* Check-ins */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Check-ins Today: {stats.checkins.today}
                </Typography>
                <Typography color="textSecondary">
                  Currently in gym: {' '}
                  <Badge 
                    badgeContent={stats.checkins.current} 
                    color="primary" 
                    max={99}
                    showZero
                  >
                    <PeopleIcon color="action" />
                  </Badge>
                </Typography>
              </Box>
              
              {/* Recent Check-ins */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Activity
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentCheckIns.length > 0 ? (
                    recentCheckIns.map((checkIn, index) => (
                      <Fade in={true} key={`${checkIn.id}-${index}`}>
                        <Chip
                          label={`${checkIn.member.full_name} ${checkIn.status === 'checked_in' ? 'in' : 'out'}`}
                          size="small"
                          color={checkIn.status === 'checked_in' ? 'success' : 'default'}
                          sx={{ mb: 0.5 }}
                        />
                      </Fade>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No recent activity
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
        
        {/* Expiring Memberships */}
        <Box sx={{ gridColumn: '1 / -1', mt: 3 }}>
          <ExpiringMemberships />
        </Box>
      </Box>
      )}

      {/* Performance Dashboard Tab */}
      {activeTab === 1 && (
        <PerformanceDashboard />
      )}
      
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
