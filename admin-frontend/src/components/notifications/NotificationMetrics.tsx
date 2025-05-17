import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Dashboard as DashboardIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import axios from 'axios';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import GridItem from '../common/GridItem';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#45B39D'];

interface MetricSummary {
  total_notifications: number;
  email_sent_count: number;
  dashboard_count: number;
  total_members_notified: number;
  notification_types: Record<string, number>;
  delivery_percentage: number;
  open_rate_percentage: number;
}

interface TypeMetrics {
  notification_type: string;
  count: number;
  email_sent_count: number;
  dashboard_count: number;
}

interface DailyMetrics {
  date: string;
  count: number;
  email_count: number;
  dashboard_count: number;
}

interface NotificationLog {
  id: string;
  notification_type: string;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  sent_at: string;
  is_email_sent: boolean;
}

const NotificationMetrics: React.FC = () => {
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [typeMetrics, setTypeMetrics] = useState<TypeMetrics[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('week');
  const [tabValue, setTabValue] = useState<number>(0);

  // Fetch metrics on component mount and when time range changes
  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch notification metrics from the API
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would be a dedicated API endpoint
      // For now, we'll fetch logs and calculate metrics on the client side
      const response = await axios.get('/api/notifications/logs/', {
        params: { time_range: timeRange }
      });

      const logs = response.data;
      processMetrics(logs);
      setRecentLogs(logs.slice(0, 10)); // Get 10 most recent logs
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load notification metrics');
      setLoading(false);
      
      // Use mock data for demonstration
      generateMockData();
    }
  };

  // Process the notification logs to calculate metrics
  const processMetrics = (logs: NotificationLog[]) => {
    // This would typically be done server-side
    // For now, we'll calculate simple metrics client-side
    
    // For demonstration until the real API is implemented
    generateMockData();
  };

  // Generate mock data for demonstration
  const generateMockData = () => {
    // Mock summary data
    const mockSummary: MetricSummary = {
      total_notifications: 287,
      email_sent_count: 245,
      dashboard_count: 287,
      total_members_notified: 125,
      notification_types: {
        MEMBERSHIP_EXPIRY: 163,
        PAYMENT_DUE: 86,
        GENERAL: 38
      },
      delivery_percentage: 94.2,
      open_rate_percentage: 78.5
    };

    // Mock type metrics
    const mockTypeMetrics: TypeMetrics[] = [
      { notification_type: 'Membership Expiry', count: 163, email_sent_count: 152, dashboard_count: 163 },
      { notification_type: 'Payment Due', count: 86, email_sent_count: 73, dashboard_count: 86 },
      { notification_type: 'General', count: 38, email_sent_count: 20, dashboard_count: 38 }
    ];

    // Mock daily metrics for the last 7 days
    const today = new Date();
    const mockDailyMetrics: DailyMetrics[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Generate some random but sensible numbers
      const count = Math.floor(Math.random() * 20) + 10;
      const emailCount = Math.floor(count * (0.8 + Math.random() * 0.2));
      
      mockDailyMetrics.push({
        date: dateString,
        count,
        email_count: emailCount,
        dashboard_count: count
      });
    }

    // Mock recent logs
    const notificationTypes = ['MEMBERSHIP_EXPIRY', 'PAYMENT_DUE', 'GENERAL'];
    const mockLogs: NotificationLog[] = [];
    
    for (let i = 0; i < 10; i++) {
      const date = subDays(today, Math.floor(Math.random() * 7));
      const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      
      mockLogs.push({
        id: `log-${i}`,
        notification_type: notificationType,
        member: {
          id: `member-${Math.floor(Math.random() * 100)}`,
          first_name: ['John', 'Jane', 'Michael', 'Emily', 'David'][Math.floor(Math.random() * 5)],
          last_name: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][Math.floor(Math.random() * 5)],
          email: 'member@example.com'
        },
        subject: notificationType === 'MEMBERSHIP_EXPIRY' ? 'Your membership is expiring soon' : 
                notificationType === 'PAYMENT_DUE' ? 'Payment reminder' : 'AV Gym Notification',
        sent_at: date.toISOString(),
        is_email_sent: Math.random() > 0.1 // 90% success rate
      });
    }

    setSummary(mockSummary);
    setTypeMetrics(mockTypeMetrics);
    setDailyMetrics(mockDailyMetrics);
    setRecentLogs(mockLogs);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Format date for charts
  const formatChartDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <AnalyticsIcon fontSize="large" sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">Notification Metrics</Typography>
          </Box>
          
          <Box display="flex" alignItems="center">
            <FormControl sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as string)}
                label="Time Range"
                size="small"
              >
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
            
            <IconButton onClick={fetchMetrics} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <GridItem item xs={12} sm={6} md={3}>
                <Card elevation={1} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">Total Notifications</Typography>
                        <Typography variant="h4">{summary?.total_notifications || 0}</Typography>
                      </Box>
                      <Box bgcolor="primary.main" p={1} borderRadius={1}>
                        <DashboardIcon sx={{ color: 'white' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" mt={1}>
                      <TrendingUpIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="success.main">
                        +12% from previous period
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem item xs={12} sm={6} md={3}>
                <Card elevation={1} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">Email Delivered</Typography>
                        <Typography variant="h4">{summary?.email_sent_count || 0}</Typography>
                      </Box>
                      <Box bgcolor="info.main" p={1} borderRadius={1}>
                        <EmailIcon sx={{ color: 'white' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="body2">
                        {summary?.delivery_percentage || 0}% delivery rate
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem item xs={12} sm={6} md={3}>
                <Card elevation={1} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">Open Rate</Typography>
                        <Typography variant="h4">{summary?.open_rate_percentage || 0}%</Typography>
                      </Box>
                      <Box bgcolor="success.main" p={1} borderRadius={1}>
                        <CheckCircleIcon sx={{ color: 'white' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" mt={1}>
                      <TrendingUpIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="success.main">
                        +5.2% from previous period
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </GridItem>

              <GridItem item xs={12} sm={6} md={3}>
                <Card elevation={1} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">Members Notified</Typography>
                        <Typography variant="h4">{summary?.total_members_notified || 0}</Typography>
                      </Box>
                      <Box bgcolor="warning.main" p={1} borderRadius={1}>
                        <DashboardIcon sx={{ color: 'white' }} />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="body2">
                        Across {Object.keys(summary?.notification_types || {}).length || 0} notification types
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </GridItem>
            </Grid>

            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab label="Overview" />
              <Tab label="By Type" />
              <Tab label="Daily Trends" />
              <Tab label="Recent Activity" />
            </Tabs>

            {/* Tab 1: Overview */}
            {tabValue === 0 && (
              <Grid container spacing={3}>
                <GridItem item xs={12} md={6}>
                  <Card elevation={1}>
                    <CardHeader title="Notification Distribution" />
                    <Divider />
                    <CardContent>
                      <Box height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={typeMetrics}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="notification_type"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {typeMetrics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </GridItem>

                <GridItem item xs={12} md={6}>
                  <Card elevation={1}>
                    <CardHeader title="Delivery Methods" />
                    <Divider />
                    <CardContent>
                      <Box height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={typeMetrics}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="notification_type" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="email_sent_count" name="Email" fill="#0088FE" />
                            <Bar dataKey="dashboard_count" name="Dashboard" fill="#00C49F" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </GridItem>
              </Grid>
            )}

            {/* Tab 2: By Type */}
            {tabValue === 1 && (
              <Card elevation={1}>
                <CardHeader title="Metrics by Notification Type" />
                <Divider />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Notification Type</TableCell>
                          <TableCell align="right">Total Count</TableCell>
                          <TableCell align="right">Email Count</TableCell>
                          <TableCell align="right">Dashboard Count</TableCell>
                          <TableCell align="right">Email %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {typeMetrics.map((row) => (
                          <TableRow key={row.notification_type}>
                            <TableCell component="th" scope="row">
                              {row.notification_type}
                            </TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right">{row.email_sent_count}</TableCell>
                            <TableCell align="right">{row.dashboard_count}</TableCell>
                            <TableCell align="right">
                              {row.count > 0 ? ((row.email_sent_count / row.count) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Tab 3: Daily Trends */}
            {tabValue === 2 && (
              <Card elevation={1}>
                <CardHeader title="Daily Notification Trends" />
                <Divider />
                <CardContent>
                  <Box height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dailyMetrics}
                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatChartDate}
                        />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [value, name === 'count' ? 'Total' : name === 'email_count' ? 'Email' : 'Dashboard']}
                          labelFormatter={(label) => formatChartDate(label as string)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" name="Total" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="email_count" name="Email" stroke="#0088FE" />
                        <Line type="monotone" dataKey="dashboard_count" name="Dashboard" stroke="#00C49F" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Tab 4: Recent Activity */}
            {tabValue === 3 && (
              <Card elevation={1}>
                <CardHeader title="Recent Notification Activity" />
                <Divider />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell>Subject</TableCell>
                          <TableCell align="center">Email Sent</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{formatDate(log.sent_at)}</TableCell>
                            <TableCell>
                              {log.notification_type === 'MEMBERSHIP_EXPIRY' ? 'Membership Expiry' :
                               log.notification_type === 'PAYMENT_DUE' ? 'Payment Due' : 'General'}
                            </TableCell>
                            <TableCell>{`${log.member.first_name} ${log.member.last_name}`}</TableCell>
                            <TableCell>{log.subject}</TableCell>
                            <TableCell align="center">
                              {log.is_email_sent ? 
                                <CheckCircleIcon color="success" /> : 
                                <ErrorIcon color="error" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default NotificationMetrics;
