import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  Box,
  Divider,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Memory as MemoryIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import wsService from '../services/websocket';

interface PerformanceMetrics {
  messages: {
    totalReceived: number;
    totalSent: number;
    errorsCount: number;
    lastResetTime: number;
    avgLatency: number;
    latencyMeasurements: number[];
  };
  connectionQuality: {
    score: number;
    factors: {
      latency: number;
      dropRate: number;
      stability: number;
    };
  };
  batcher: {
    totalBatches: number;
    totalMessages: number;
    bytesReduced: number;
    avgBatchSize: number;
    droppedMessages: number;
    queueSize: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    lowPriorityCount: number;
  };
  handlers: {
    totalTypes: number;
    activeHandlers: number;
  };
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const currentMetrics = wsService.getPerformanceMetrics();
        setMetrics(currentMetrics);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      }
    };

    // Initial load
    updateMetrics();

    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleOptimizationToggle = (enabled: boolean) => {
    setIsOptimizationEnabled(enabled);
    wsService.enablePerformanceOptimization(enabled);
  };

  const handleRefresh = () => {
    try {
      const currentMetrics = wsService.getPerformanceMetrics();
      setMetrics(currentMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  };

  if (!metrics) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <SpeedIcon />
            <Typography>Loading performance metrics...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const compressionRatio = metrics.batcher.bytesReduced > 0 
    ? ((metrics.batcher.bytesReduced / (metrics.batcher.totalMessages * 100)) * 100)
    : 0;

  const errorRate = metrics.messages.totalSent > 0 
    ? (metrics.messages.errorsCount / metrics.messages.totalSent) * 100 
    : 0;

  return (
    <Box>
      {/* Header Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" display="flex" alignItems="center" gap={1}>
          <AnalyticsIcon />
          WebSocket Performance Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={isOptimizationEnabled}
                onChange={(e) => handleOptimizationToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Performance Optimization"
          />
          <Tooltip title="Refresh Metrics">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" color="textSecondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Connection Quality */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader
              title="Connection Quality"
              avatar={<NetworkIcon color="primary" />}
              action={
                <Chip
                  label={getQualityLabel(metrics.connectionQuality.score)}
                  color={getQualityColor(metrics.connectionQuality.score) as any}
                  size="small"
                />
              }
            />
            <CardContent>
              <Box mb={2}>
                <Typography variant="h4" color="primary" align="center">
                  {metrics.connectionQuality.score}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.connectionQuality.score}
                  color={getQualityColor(metrics.connectionQuality.score) as any}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Latency</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.connectionQuality.factors.latency}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Drop Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.connectionQuality.factors.dropRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Stability</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.connectionQuality.factors.stability}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Message Statistics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader
              title="Message Statistics"
              avatar={<SpeedIcon color="primary" />}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Total Received</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {metrics.messages.totalReceived.toLocaleString()}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Total Sent</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {metrics.messages.totalSent.toLocaleString()}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Errors</Typography>
                <Typography 
                  variant="body2" 
                  fontWeight="bold" 
                  color={errorRate > 5 ? 'error' : 'textPrimary'}
                >
                  {metrics.messages.errorsCount} ({errorRate.toFixed(1)}%)
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Avg Latency</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {metrics.messages.avgLatency.toFixed(1)}ms
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Message Batching */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader
              title="Message Batching"
              avatar={<MemoryIcon color="primary" />}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Total Batches</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {metrics.batcher.totalBatches.toLocaleString()}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Avg Batch Size</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {metrics.batcher.avgBatchSize.toFixed(1)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Compression Saved</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatBytes(metrics.batcher.bytesReduced)} ({compressionRatio.toFixed(1)}%)
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Queue Size</Typography>
                <Typography 
                  variant="body2" 
                  fontWeight="bold"
                  color={metrics.batcher.queueSize > 50 ? 'warning.main' : 'textPrimary'}
                >
                  {metrics.batcher.queueSize}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Queue */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader
              title="Priority Queue"
              avatar={<SettingsIcon color="primary" />}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">High Priority</Typography>
                <Chip 
                  label={metrics.batcher.highPriorityCount} 
                  color="error" 
                  size="small" 
                />
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Medium Priority</Typography>
                <Chip 
                  label={metrics.batcher.mediumPriorityCount} 
                  color="warning" 
                  size="small" 
                />
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Low Priority</Typography>
                <Chip 
                  label={metrics.batcher.lowPriorityCount} 
                  color="default" 
                  size="small" 
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Dropped Messages</Typography>
                <Typography 
                  variant="body2" 
                  fontWeight="bold"
                  color={metrics.batcher.droppedMessages > 0 ? 'error.main' : 'success.main'}
                >
                  {metrics.batcher.droppedMessages}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Handler Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Handler Statistics"
              avatar={<AnalyticsIcon color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {metrics.handlers.totalTypes}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Message Types
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {metrics.handlers.activeHandlers}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Handlers
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Session Information"
              avatar={<NetworkIcon color="primary" />}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Session Duration</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatDuration(Date.now() - metrics.messages.lastResetTime)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Messages/Min</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {(metrics.messages.totalReceived / Math.max(1, (Date.now() - metrics.messages.lastResetTime) / 60000)).toFixed(1)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Optimization Status</Typography>
                <Chip 
                  label={isOptimizationEnabled ? 'Enabled' : 'Disabled'} 
                  color={isOptimizationEnabled ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warnings */}
      {(errorRate > 5 || metrics.batcher.queueSize > 100 || metrics.batcher.droppedMessages > 0) && (
        <Box mt={3}>
          <Alert severity="warning">
            <Typography variant="body2">
              Performance Warning: 
              {errorRate > 5 && ` High error rate (${errorRate.toFixed(1)}%)`}
              {metrics.batcher.queueSize > 100 && ` Large queue size (${metrics.batcher.queueSize})`}
              {metrics.batcher.droppedMessages > 0 && ` ${metrics.batcher.droppedMessages} messages dropped`}
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default PerformanceDashboard;
