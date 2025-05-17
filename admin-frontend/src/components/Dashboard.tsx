import React from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from 'recharts';
import ExpiringMemberships from './notifications/ExpiringMemberships';

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
            <Typography variant="h6" gutterBottom>
              Check-ins Today: {stats.checkins.today}
            </Typography>
            <Typography color="textSecondary">
              Currently in gym: {stats.checkins.current}
            </Typography>
          </Paper>
        </Box>
        
        {/* Expiring Memberships */}
        <Box sx={{ gridColumn: '1 / -1', mt: 3 }}>
          <ExpiringMemberships />
        </Box>
      </Box>
    </Box>
  );
};
