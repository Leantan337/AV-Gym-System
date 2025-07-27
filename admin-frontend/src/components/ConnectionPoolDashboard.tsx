import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { connectionPoolManager } from '../services/connectionPool';

interface PoolMetrics {
  poolId: string;
  totalConnections: number;
  healthyConnections: number;
  avgLatency: number;
  avgQuality: number;
  strategy: string;
  metrics: { [key: string]: any };
}

interface SystemHealth {
  totalPools: number;
  healthyPools: number;
  totalConnections: number;
  healthyConnections: number;
  avgQuality: number;
  connectionHealthRatio: number;
  poolHealthRatio: number;
  status: string;
}

const ConnectionPoolDashboard: React.FC = () => {
  const [poolMetrics, setPoolMetrics] = useState<{ [key: string]: PoolMetrics }>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [createPoolDialog, setCreatePoolDialog] = useState(false);
  const [newPoolId, setNewPoolId] = useState('');
  const [newPoolStrategy, setNewPoolStrategy] = useState<'round-robin' | 'least-connections' | 'health-weighted'>('health-weighted');
  const [newPoolMaxConnections, setNewPoolMaxConnections] = useState(5);
  const [addConnectionDialog, setAddConnectionDialog] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [connectionUrl, setConnectionUrl] = useState('ws://localhost:8000/ws/checkins/');

  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics();
    }, 5000); // Update every 5 seconds

    updateMetrics();
    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    const metrics = connectionPoolManager.getAllPoolMetrics();
    const health = connectionPoolManager.getSystemHealth();
    setPoolMetrics(metrics);
    setSystemHealth(health);
  };

  const handleCreatePool = () => {
    try {
      connectionPoolManager.createPool(newPoolId, {
        maxConnections: newPoolMaxConnections,
        loadBalancingStrategy: newPoolStrategy,
        healthCheckInterval: 30000,
        reconnectAttempts: 3
      });
      
      setCreatePoolDialog(false);
      setNewPoolId('');
      setNewPoolMaxConnections(5);
      setNewPoolStrategy('health-weighted');
      updateMetrics();
    } catch (error) {
      console.error('Failed to create pool:', error);
      alert('Failed to create pool: ' + (error as Error).message);
    }
  };

  const handleAddConnection = async () => {
    if (!selectedPool) {
      alert('Please select a pool first');
      return;
    }

    try {
      await connectionPoolManager.addConnectionToPool(selectedPool, connectionId, connectionUrl);
      setAddConnectionDialog(false);
      setConnectionId('');
      updateMetrics();
    } catch (error) {
      console.error('Failed to add connection:', error);
      alert('Failed to add connection: ' + (error as Error).message);
    }
  };

  const handleDestroyPool = (poolId: string) => {
    if (window.confirm(`Are you sure you want to destroy pool "${poolId}"?`)) {
      connectionPoolManager.destroyPool(poolId);
      updateMetrics();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'success';
    if (quality >= 60) return 'warning';
    return 'error';
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography variant="h4" gutterBottom>
        Connection Pool Management
      </Typography>

      {/* System Health Overview */}
      {systemHealth && (
        <Card style={{ marginBottom: 24 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Overall Status
                </Typography>
                <Chip 
                  label={systemHealth.status.toUpperCase()} 
                  color={getStatusColor(systemHealth.status) as any}
                  variant="filled"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pool Health
                </Typography>
                <Typography variant="h6">
                  {systemHealth.healthyPools} / {systemHealth.totalPools}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.poolHealthRatio * 100}
                  color={systemHealth.poolHealthRatio > 0.8 ? 'success' : systemHealth.poolHealthRatio > 0.5 ? 'warning' : 'error'}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Connection Health
                </Typography>
                <Typography variant="h6">
                  {systemHealth.healthyConnections} / {systemHealth.totalConnections}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.connectionHealthRatio * 100}
                  color={systemHealth.connectionHealthRatio > 0.8 ? 'success' : systemHealth.connectionHealthRatio > 0.5 ? 'warning' : 'error'}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Avg Quality Score
                </Typography>
                <Typography variant="h6">
                  {systemHealth.avgQuality.toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.avgQuality}
                  color={getQualityColor(systemHealth.avgQuality)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Pool Controls */}
      <Card style={{ marginBottom: 24 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pool Controls
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Select Pool</InputLabel>
                <Select
                  value={selectedPool}
                  onChange={(e) => setSelectedPool(e.target.value)}
                  label="Select Pool"
                >
                  {Object.keys(poolMetrics).map((poolId) => (
                    <MenuItem key={poolId} value={poolId}>
                      {poolId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setCreatePoolDialog(true)}
                fullWidth
              >
                Create Pool
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setAddConnectionDialog(true)}
                disabled={!selectedPool}
                fullWidth
              >
                Add Connection
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => selectedPool && handleDestroyPool(selectedPool)}
                disabled={!selectedPool}
                fullWidth
              >
                Destroy Pool
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={updateMetrics}
                fullWidth
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pool Metrics Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pool Metrics
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pool ID</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Connections</TableCell>
                  <TableCell>Health</TableCell>
                  <TableCell>Avg Latency</TableCell>
                  <TableCell>Avg Quality</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(poolMetrics).map((pool) => (
                  <TableRow key={pool.poolId}>
                    <TableCell>{pool.poolId}</TableCell>
                    <TableCell>
                      <Chip label={pool.strategy} size="small" />
                    </TableCell>
                    <TableCell>
                      {pool.healthyConnections} / {pool.totalConnections}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box width="100%" mr={1}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(pool.healthyConnections / Math.max(1, pool.totalConnections)) * 100}
                            color={pool.healthyConnections === pool.totalConnections ? 'success' : 'warning'}
                          />
                        </Box>
                        <Box minWidth={35}>
                          <Typography variant="body2" color="textSecondary">
                            {Math.round((pool.healthyConnections / Math.max(1, pool.totalConnections)) * 100)}%
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{pool.avgLatency.toFixed(1)}ms</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${pool.avgQuality.toFixed(1)}%`}
                        color={getQualityColor(pool.avgQuality) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDestroyPool(pool.poolId)}
                      >
                        Destroy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Pool Dialog */}
      <Dialog open={createPoolDialog} onClose={() => setCreatePoolDialog(false)}>
        <DialogTitle>Create New Connection Pool</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Pool ID"
            fullWidth
            variant="outlined"
            value={newPoolId}
            onChange={(e) => setNewPoolId(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <FormControl fullWidth style={{ marginBottom: 16 }}>
            <InputLabel>Load Balancing Strategy</InputLabel>
            <Select
              value={newPoolStrategy}
              onChange={(e) => setNewPoolStrategy(e.target.value as any)}
              label="Load Balancing Strategy"
            >
              <MenuItem value="round-robin">Round Robin</MenuItem>
              <MenuItem value="least-connections">Least Connections</MenuItem>
              <MenuItem value="health-weighted">Health Weighted</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Max Connections"
            type="number"
            fullWidth
            variant="outlined"
            value={newPoolMaxConnections}
            onChange={(e) => setNewPoolMaxConnections(parseInt(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePoolDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePool} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Connection Dialog */}
      <Dialog open={addConnectionDialog} onClose={() => setAddConnectionDialog(false)}>
        <DialogTitle>Add Connection to Pool</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Adding connection to pool: {selectedPool}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Connection ID"
            fullWidth
            variant="outlined"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <TextField
            margin="dense"
            label="WebSocket URL"
            fullWidth
            variant="outlined"
            value={connectionUrl}
            onChange={(e) => setConnectionUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddConnectionDialog(false)}>Cancel</Button>
          <Button onClick={handleAddConnection} variant="contained" color="primary">
            Add Connection
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ConnectionPoolDashboard;
