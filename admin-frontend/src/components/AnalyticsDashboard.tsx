import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsEngine, AnalyticsEvent, PerformanceMetrics } from '../services/analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [eventType, setEventType] = useState<string>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      updateData();
    }, 5000); // Update every 5 seconds

    updateData();
    return () => clearInterval(interval);
  }, [timeRange, eventType]);

  const updateData = () => {
    const now = Date.now();
    const timeRanges = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000
    };

    const startTime = now - timeRanges[timeRange];
    
    // Get metrics and events
    const metricsData = analyticsEngine.getMetrics(startTime);
    const eventsData = analyticsEngine.getEvents({
      startTime,
      type: eventType === 'all' ? undefined : eventType as any
    });
    
    const summaryData = analyticsEngine.getAnalyticsSummary();

    setMetrics(metricsData);
    setEvents(eventsData.slice(-100)); // Show last 100 events
    setSummary(summaryData);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon color="error" />;
      case 'down': return <TrendingDownIcon color="success" />;
      case 'stable': return <TrendingFlatIcon color="primary" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodUp = false) => {
    if (trend === 'stable') return 'primary';
    if (isGoodUp) {
      return trend === 'up' ? 'success' : 'error';
    } else {
      return trend === 'up' ? 'error' : 'success';
    }
  };

  // Prepare chart data
  const chartData = metrics.map(m => ({
    time: formatTimestamp(m.timestamp),
    latency: m.avgLatency,
    connections: m.connectionCount,
    errors: m.errorRate,
    health: m.poolHealth,
    memory: m.memoryUsage,
    cpu: m.cpuUsage
  }));

  // Event type distribution
  const eventTypes = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const eventTypeData = Object.entries(eventTypes).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div style={{ padding: 24 }}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  label="Time Range"
                >
                  <MenuItem value="1h">Last Hour</MenuItem>
                  <MenuItem value="6h">Last 6 Hours</MenuItem>
                  <MenuItem value="24h">Last 24 Hours</MenuItem>
                  <MenuItem value="7d">Last 7 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  label="Event Type"
                >
                  <MenuItem value="all">All Events</MenuItem>
                  <MenuItem value="connection">Connection</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="pool">Pool</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={updateData}
                fullWidth
              >
                Refresh Data
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => analyticsEngine.clearData()}
                fullWidth
              >
                Clear Data
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} style={{ marginBottom: 24 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h4">
                  {summary.totalEvents.toLocaleString()}
                </Typography>
                <Typography color="textSecondary">
                  {summary.recentEvents} in last hour
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Error Rate
                </Typography>
                <Typography variant="h4" color={summary.errorRate > 5 ? 'error' : 'primary'}>
                  {summary.errorRate.toFixed(2)}%
                </Typography>
                <Box display="flex" alignItems="center">
                  {getTrendIcon(summary.recentTrends.errorTrend)}
                  <Typography variant="body2" style={{ marginLeft: 4 }}>
                    {summary.recentTrends.errorTrend}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Latency
                </Typography>
                <Typography variant="h4">
                  {summary.avgPerformance.avgLatency?.toFixed(1) || 0}ms
                </Typography>
                <Box display="flex" alignItems="center">
                  {getTrendIcon(summary.recentTrends.latencyTrend)}
                  <Typography variant="body2" style={{ marginLeft: 4 }}>
                    {summary.recentTrends.latencyTrend}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Connections
                </Typography>
                <Typography variant="h4">
                  {summary.avgPerformance.connectionCount || 0}
                </Typography>
                <Box display="flex" alignItems="center">
                  {getTrendIcon(summary.recentTrends.connectionTrend)}
                  <Typography variant="body2" style={{ marginLeft: 4 }}>
                    {summary.recentTrends.connectionTrend}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs for different views */}
      <Card>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="analytics tabs"
        >
          <Tab label="Performance Metrics" />
          <Tab label="Event Analysis" />
          <Tab label="System Health" />
        </Tabs>

        <CardContent>
          {/* Performance Metrics Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Latency & Connections
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#8884d8" name="Latency (ms)" />
                    <Line yAxisId="right" type="monotone" dataKey="connections" stroke="#82ca9d" name="Connections" />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Pool Health & Error Rate
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="health" stackId="1" stroke="#8884d8" fill="#8884d8" name="Pool Health %" />
                    <Area type="monotone" dataKey="errors" stackId="2" stroke="#ff7300" fill="#ff7300" name="Error Rate %" />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  System Resources
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="memory" fill="#8884d8" name="Memory (MB)" />
                    <Bar dataKey="cpu" fill="#82ca9d" name="CPU %" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          )}

          {/* Event Analysis Tab */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Event Type Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Recent Events
                </Typography>
                <TableContainer component={Paper} style={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.slice(-20).reverse().map((event, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatTimestamp(event.timestamp)}</TableCell>
                          <TableCell>
                            <Chip label={event.type} size="small" />
                          </TableCell>
                          <TableCell>{event.category}</TableCell>
                          <TableCell>{event.action}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}

          {/* System Health Tab */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Current System Health
                </Typography>
                {summary && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Latency Trend
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Chip
                              icon={getTrendIcon(summary.recentTrends.latencyTrend)}
                              label={`${summary.recentTrends.latencyTrend.toUpperCase()}`}
                              color={getTrendColor(summary.recentTrends.latencyTrend, false) as any}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Error Trend
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Chip
                              icon={getTrendIcon(summary.recentTrends.errorTrend)}
                              label={`${summary.recentTrends.errorTrend.toUpperCase()}`}
                              color={getTrendColor(summary.recentTrends.errorTrend, false) as any}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Connection Trend
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Chip
                              icon={getTrendIcon(summary.recentTrends.connectionTrend)}
                              label={`${summary.recentTrends.connectionTrend.toUpperCase()}`}
                              color={getTrendColor(summary.recentTrends.connectionTrend, true) as any}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
