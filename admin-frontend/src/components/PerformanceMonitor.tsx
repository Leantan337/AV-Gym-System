import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
  Button,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Speed,
  NetworkCheck,
  Memory,
  TrendingUp,
  Error,
  CheckCircle
} from '@mui/icons-material';
import wsService from '../services/websocket';

interface PerformanceMetrics {
  messages: {
    totalReceived: number;
    totalSent: number;
    errorsCount: number;
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
    avgBatchSize: number;
    bytesReduced: number;
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

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const currentMetrics = wsService.getPerformanceMetrics();
        setMetrics(currentMetrics);
      } catch (error) {
        console.error('Error getting performance metrics:', error);
      }
    };

    updateMetrics();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const getConnectionQualityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'success';
    if (latency < 300) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!metrics) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Performance Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Loading metrics...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <Speed color="primary" />
            WebSocket Performance
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant={autoRefresh ? "contained" : "outlined"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto Refresh
            </Button>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {metrics.connectionQuality.score}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connection Quality
              </Typography>
              <Chip
                size="small"
                color={getConnectionQualityColor(metrics.connectionQuality.score)}
                label={
                  metrics.connectionQuality.score >= 80 ? 'Excellent' :
                  metrics.connectionQuality.score >= 60 ? 'Good' : 'Poor'
                }
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="secondary">
                {metrics.messages.avgLatency.toFixed(0)}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Latency
              </Typography>
              <Chip
                size="small"
                color={getLatencyColor(metrics.messages.avgLatency)}
                icon={<NetworkCheck />}
                label={
                  metrics.messages.avgLatency < 100 ? 'Fast' :
                  metrics.messages.avgLatency < 300 ? 'Normal' : 'Slow'
                }
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {metrics.batcher.totalBatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Batches Sent
              </Typography>
              <Typography variant="caption" display="block">
                {metrics.batcher.avgBatchSize.toFixed(1)} avg size
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {formatBytes(metrics.batcher.bytesReduced)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bytes Saved
              </Typography>
              <Typography variant="caption" display="block">
                via compression
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Collapse in={expanded}>
          <Grid container spacing={3}>
            {/* Message Statistics */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <TrendingUp />
                  Message Statistics
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Received</TableCell>
                        <TableCell align="right">{metrics.messages.totalReceived.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Sent</TableCell>
                        <TableCell align="right">{metrics.messages.totalSent.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Errors</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                            {metrics.messages.errorsCount > 0 ? (
                              <Error color="error" fontSize="small" />
                            ) : (
                              <CheckCircle color="success" fontSize="small" />
                            )}
                            {metrics.messages.errorsCount}
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Error Rate</TableCell>
                        <TableCell align="right">
                          {((metrics.messages.errorsCount / Math.max(1, metrics.messages.totalSent)) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Connection Quality Breakdown */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <NetworkCheck />
                  Connection Quality
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Latency ({metrics.connectionQuality.factors.latency}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.connectionQuality.factors.latency}
                    color={metrics.connectionQuality.factors.latency >= 80 ? 'success' : 
                           metrics.connectionQuality.factors.latency >= 60 ? 'warning' : 'error'}
                  />
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Drop Rate ({metrics.connectionQuality.factors.dropRate}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.connectionQuality.factors.dropRate}
                    color={metrics.connectionQuality.factors.dropRate >= 80 ? 'success' : 
                           metrics.connectionQuality.factors.dropRate >= 60 ? 'warning' : 'error'}
                  />
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Stability ({metrics.connectionQuality.factors.stability}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.connectionQuality.factors.stability}
                    color={metrics.connectionQuality.factors.stability >= 80 ? 'success' : 
                           metrics.connectionQuality.factors.stability >= 60 ? 'warning' : 'error'}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Batching Performance */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <Memory />
                  Message Batching
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Queue Size</TableCell>
                        <TableCell align="right">{metrics.batcher.queueSize}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>High Priority</TableCell>
                        <TableCell align="right">{metrics.batcher.highPriorityCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Medium Priority</TableCell>
                        <TableCell align="right">{metrics.batcher.mediumPriorityCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Low Priority</TableCell>
                        <TableCell align="right">{metrics.batcher.lowPriorityCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Dropped Messages</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                            {metrics.batcher.droppedMessages > 0 ? (
                              <Error color="warning" fontSize="small" />
                            ) : (
                              <CheckCircle color="success" fontSize="small" />
                            )}
                            {metrics.batcher.droppedMessages}
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Handler Information */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Message Handlers
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Handler Types</TableCell>
                        <TableCell align="right">{metrics.handlers.totalTypes}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Active Handlers</TableCell>
                        <TableCell align="right">{metrics.handlers.activeHandlers}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Avg Handlers per Type</TableCell>
                        <TableCell align="right">
                          {metrics.handlers.totalTypes > 0 
                            ? (metrics.handlers.activeHandlers / metrics.handlers.totalTypes).toFixed(1)
                            : '0'
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;
