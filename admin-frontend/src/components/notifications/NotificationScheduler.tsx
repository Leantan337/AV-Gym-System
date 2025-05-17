import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Grid,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  AlertTitle,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format, parseISO, addDays } from 'date-fns';

interface NotificationType {
  value: string;
  label: string;
  description: string;
}

interface NotificationSchedule {
  id: string;
  notification_type: string;
  days_before_event: number;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

const notificationTypes: NotificationType[] = [
  { 
    value: 'MEMBERSHIP_EXPIRY', 
    label: 'Membership Expiry', 
    description: 'Sent to members when their membership is about to expire'
  },
  { 
    value: 'PAYMENT_DUE', 
    label: 'Payment Due', 
    description: 'Sent to members when they have a payment due'
  },
  { 
    value: 'GENERAL', 
    label: 'General', 
    description: 'General notifications that can be sent to all or specific members'
  }
];

const NotificationScheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<NotificationSchedule | null>(null);
  const [formData, setFormData] = useState<Partial<NotificationSchedule>>({
    notification_type: 'MEMBERSHIP_EXPIRY',
    days_before_event: 7,
    is_active: true,
  });
  const [processingNotification, setProcessingNotification] = useState<boolean>(false);
  
  useEffect(() => {
    fetchSchedules();
  }, []);
  
  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      
      const mockSchedules: NotificationSchedule[] = [
        {
          id: '1',
          notification_type: 'MEMBERSHIP_EXPIRY',
          days_before_event: 30,
          is_active: true,
          last_run: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          notification_type: 'MEMBERSHIP_EXPIRY',
          days_before_event: 15,
          is_active: true,
          last_run: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          notification_type: 'MEMBERSHIP_EXPIRY',
          days_before_event: 7,
          is_active: true,
          last_run: null,
          next_run: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          notification_type: 'MEMBERSHIP_EXPIRY',
          days_before_event: 3,
          is_active: false,
          last_run: null,
          next_run: null,
        },
        {
          id: '5',
          notification_type: 'MEMBERSHIP_EXPIRY',
          days_before_event: 1,
          is_active: true,
          last_run: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          next_run: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      setSchedules(mockSchedules);
    } catch (err) {
      console.error('Error fetching notification schedules:', err);
      setError('Failed to load notification schedules');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (schedule?: NotificationSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        notification_type: schedule.notification_type,
        days_before_event: schedule.days_before_event,
        is_active: schedule.is_active,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        notification_type: 'MEMBERSHIP_EXPIRY',
        days_before_event: 7,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSchedule(null);
  };
  
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    try {
      // In a real implementation, this would save to the API
      // For now, we'll just update our local state
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      
      if (editingSchedule) {
        // Update existing schedule
        const updatedSchedules = schedules.map(schedule => 
          schedule.id === editingSchedule.id 
            ? { 
                ...schedule, 
                ...formData,
                next_run: formData.is_active 
                  ? addDays(new Date(), Math.floor(Math.random() * 7) + 1).toISOString()
                  : null
              } 
            : schedule
        );
        setSchedules(updatedSchedules);
        setSuccess(`Schedule for ${formData.days_before_event} days before expiry updated successfully`);
      } else {
        // Create new schedule
        const newSchedule: NotificationSchedule = {
          id: String(Date.now()),
          notification_type: formData.notification_type!,
          days_before_event: formData.days_before_event!,
          is_active: formData.is_active!,
          last_run: null,
          next_run: formData.is_active 
            ? addDays(new Date(), Math.floor(Math.random() * 7) + 1).toISOString()
            : null,
        };
        setSchedules([...schedules, newSchedule]);
        setSuccess(`New schedule for ${formData.days_before_event} days before expiry created successfully`);
      }
      
      handleCloseDialog();
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error saving notification schedule:', err);
      setError('Failed to save notification schedule');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  const handleDeleteSchedule = async (id: string) => {
    try {
      // In a real implementation, this would delete from the API
      // For now, we'll just update our local state
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      const updatedSchedules = schedules.filter(schedule => schedule.id !== id);
      setSchedules(updatedSchedules);
      setSuccess('Schedule deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error deleting notification schedule:', err);
      setError('Failed to delete notification schedule');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // In a real implementation, this would update the API
      // For now, we'll just update our local state
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      
      const updatedSchedules = schedules.map(schedule => 
        schedule.id === id 
          ? { 
              ...schedule, 
              is_active: !currentStatus,
              next_run: !currentStatus 
                ? addDays(new Date(), Math.floor(Math.random() * 7) + 1).toISOString()
                : null
            } 
          : schedule
      );
      setSchedules(updatedSchedules);
      
    } catch (err) {
      console.error('Error updating notification schedule:', err);
      setError('Failed to update notification schedule status');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  const handleRunNotificationsNow = async () => {
    setProcessingNotification(true);
    setError(null);
    
    try {
      // In a real implementation, this would trigger the notification processing
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setSuccess('Notification processing initiated! Check logs for details.');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error running notifications:', err);
      setError('Failed to run notification processing');
      setTimeout(() => setError(null), 3000);
    } finally {
      setProcessingNotification(false);
    }
  };
  
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not scheduled';
    try {
      return format(parseISO(dateString), 'PPp');
    } catch {
      return dateString;
    }
  };
  
  const getTypeLabel = (type: string): string => {
    const foundType = notificationTypes.find(t => t.value === type);
    return foundType?.label || type;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" color="primary">Notification Schedule Manager</Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSchedules}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
            onClick={() => handleOpenDialog()}
          >
            Add Schedule
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Success</AlertTitle>
          {success}
        </Alert>
      )}
      
      <Box mb={4}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" gutterBottom>Manual Processing</Typography>
                <Typography variant="body2" color="text.secondary">
                  Run notification processing immediately to send all pending notifications.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                startIcon={processingNotification ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
                onClick={handleRunNotificationsNow}
                disabled={processingNotification}
              >
                {processingNotification ? 'Processing...' : 'Process Notifications Now'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>Scheduled Notifications</Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : schedules.length === 0 ? (
        <Alert severity="info" sx={{ my: 3 }}>
          No notification schedules found. Create a new schedule to get started.
        </Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Days Before</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell>Next Run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>{getTypeLabel(schedule.notification_type)}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${schedule.days_before_event} days`}
                      size="small"
                      color={
                        schedule.days_before_event <= 3 ? 'error' :
                        schedule.days_before_event <= 7 ? 'warning' :
                        schedule.days_before_event <= 15 ? 'info' : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={schedule.is_active}
                          onChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                          size="small"
                        />
                      }
                      label={schedule.is_active ? 'Active' : 'Inactive'}
                      sx={{ ml: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    {schedule.last_run ? formatDate(schedule.last_run) : 'Never'}
                  </TableCell>
                  <TableCell>
                    {schedule.is_active ? formatDate(schedule.next_run) : 'Disabled'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(schedule)}
                      title="Edit Schedule"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      title="Delete Schedule"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Add/Edit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingSchedule ? 'Edit Notification Schedule' : 'Add Notification Schedule'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Notification Type</InputLabel>
                <Select
                  value={formData.notification_type || 'MEMBERSHIP_EXPIRY'}
                  onChange={(e) => handleFormChange('notification_type', e.target.value)}
                  label="Notification Type"
                >
                  {notificationTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {notificationTypes.find(t => t.value === formData.notification_type)?.description}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Days Before Event"
                type="number"
                value={formData.days_before_event || 7}
                onChange={(e) => handleFormChange('days_before_event', parseInt(e.target.value, 10))}
                InputProps={{
                  inputProps: { min: 1, max: 90 }
                }}
                helperText="Number of days before the event to send the notification"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active ?? true}
                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                    color="primary"
                  />
                }
                label="Active"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Inactive schedules will not send notifications
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingSchedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NotificationScheduler;
