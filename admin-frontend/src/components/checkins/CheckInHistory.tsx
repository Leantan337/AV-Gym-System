import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Skeleton,
  Tooltip,
  TablePagination,
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
} from '@mui/material';
import { Search, LogOut, User, Clock, AlertTriangle, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkOutMember } from '../../services/api';
import { format, formatDistance } from 'date-fns';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { CheckInWebSocketEvent } from '../../services/websocket';

interface CheckIn {
  id: string;
  member: {
    id: string;
    fullName: string;
  };
  checkInTime: string;
  checkOutTime: string | null;
}

interface CheckInHistoryProps {
  checkIns: CheckIn[];
  isLoading: boolean;
  onFilter?: (filters: CheckInFilters) => void;
  totalCount?: number;
  error?: Error | null;
}

interface CheckInFilters {
  search: string;
  status: 'all' | 'in' | 'out';
  dateRange: 'today' | 'yesterday' | 'week' | 'all';
  page: number;
  perPage: number;
}

export const CheckInHistory: React.FC<CheckInHistoryProps> = ({
  checkIns,
  isLoading,
  onFilter,
  totalCount = 0,
  error,
}) => {
  const [filters, setFilters] = useState<CheckInFilters>({
    search: '',
    status: 'all',
    dateRange: 'today',
    page: 0,
    perPage: 10,
  });
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [realtimeActive, setRealtimeActive] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const { sendMessage, subscribe } = useWebSocket();

  // Handle real-time updates
  useEffect(() => {
    const unsubscribe = subscribe<CheckInWebSocketEvent>('check_in_update', (event) => {
      queryClient.setQueryData(['checkIns'], (old: CheckIn[] = []) => {
        if (event.type === 'check_in') {
          return [event.checkIn, ...old];
        } else {
          return old.map(item => 
            item.id === event.checkIn.id ? event.checkIn : item
          );
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, subscribe]);

  const handleFilterChange = (key: keyof CheckInFilters, value: unknown) => {
    const newFilters = { ...filters, [key]: value };
    if (key !== 'page') {
      newFilters.page = 0; // Reset page when filters change
    }
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  const checkOutMutation = useMutation({
    mutationFn: checkOutMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
      queryClient.invalidateQueries({ queryKey: ['checkInStats'] });
    },
  });

  const openCheckOutDialog = (checkIn: CheckIn) => {
    setSelectedCheckIn(checkIn);
    setCheckOutDialogOpen(true);
  };

  const handleCheckOutConfirm = () => {
    if (selectedCheckIn) {
      checkOutMutation.mutate({ checkInId: selectedCheckIn.id });
      setCheckOutDialogOpen(false);
    }
  };

  const handleCheckOutCancel = () => {
    setCheckOutDialogOpen(false);
    setSelectedCheckIn(null);
  };
  
  // Calculate duration of stay
  const calculateDuration = (checkIn: CheckIn) => {
    if (!checkIn.checkOutTime) {
      const now = new Date();
      const checkInDate = new Date(checkIn.checkInTime);
      return formatDistance(checkInDate, now, { addSuffix: false });
    }
    
    const checkInDate = new Date(checkIn.checkInTime);
    const checkOutDate = new Date(checkIn.checkOutTime);
    return formatDistance(checkInDate, checkOutDate, { addSuffix: false });
  };

  // Toggle realtime updates
  const toggleRealtime = () => {
    setRealtimeActive(!realtimeActive);
    if (!realtimeActive) {
      // Reconnect WebSocket
      sendMessage('reconnect');
    }
  };

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            onClick={() => onFilter && onFilter(filters)}
          >
            Retry
          </Button>
        }
      >
        Error loading check-in history: {error.message}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Check-in Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Filter controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search members..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <Search size={20} style={{ marginRight: 8 }} />,
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="in">In Gym</MenuItem>
              <MenuItem value="out">Checked Out</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.dateRange}
              label="Date Range"
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Box>
          <Chip
            label={realtimeActive ? "Real-time Updates On" : "Real-time Updates Off"}
            color={realtimeActive ? "success" : "default"}
            onClick={toggleRealtime}
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      {/* Loading indicator */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Member</TableCell>
            <TableCell>Time Details</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {checkIns.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <AlertTriangle size={24} color="#757575" />
                  <Typography color="text.secondary">No check-ins found with the current filters</Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          
          {checkIns.map((checkIn) => (
            <TableRow 
              key={checkIn.id}
              sx={{
                backgroundColor: !checkIn.checkOutTime ? 'rgba(46, 125, 50, 0.04)' : 'inherit',
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: !checkIn.checkOutTime ? 'success.main' : 'grey.400' 
                    }}
                  >
                    {checkIn.member.fullName.charAt(0)}
                  </Avatar>
                  <Typography variant="body2">{checkIn.member.fullName}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Badge color="success" variant="dot" sx={{ marginTop: '2px' }} />
                    <Typography variant="caption">In: {format(new Date(checkIn.checkInTime), 'MMM d, yyyy HH:mm')}</Typography>
                  </Box>
                  {checkIn.checkOutTime && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Badge color="error" variant="dot" sx={{ marginTop: '2px' }} />
                      <Typography variant="caption">Out: {format(new Date(checkIn.checkOutTime), 'MMM d, yyyy HH:mm')}</Typography>
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Tooltip title={checkIn.checkOutTime ? "Time spent" : "Currently in gym for"}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={16} />
                    <Typography variant="body2">{calculateDuration(checkIn)}</Typography>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip
                  icon={checkIn.checkOutTime ? <Check size={14} /> : <User size={14} />}
                  label={checkIn.checkOutTime ? 'Checked Out' : 'In Gym'}
                  color={checkIn.checkOutTime ? 'default' : 'success'}
                  size="small"
                  variant={checkIn.checkOutTime ? 'outlined' : 'filled'}
                />
              </TableCell>
              <TableCell align="center">
                {!checkIn.checkOutTime && (
                  <Tooltip title="Check Out Member">
                    <IconButton
                      onClick={() => openCheckOutDialog(checkIn)}
                      disabled={checkOutMutation.isPending}
                      color="primary"
                      size="small"
                    >
                      <LogOut size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

    <TablePagination
      component="div"
      count={totalCount}
      page={filters.page}
      onPageChange={(_, newPage) => handleFilterChange('page', newPage)}
      rowsPerPage={filters.perPage}
      onRowsPerPageChange={(e) => 
        handleFilterChange('perPage', parseInt(e.target.value, 10))
      }
      rowsPerPageOptions={[5, 10, 25, 50]}
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
    />
    
    {/* Check Out Confirmation Dialog */}
    <Dialog
      open={checkOutDialogOpen}
      onClose={handleCheckOutCancel}
      aria-labelledby="check-out-dialog-title"
    >
      <DialogTitle id="check-out-dialog-title">
        Check Out Member
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {selectedCheckIn && (
            <>
              Are you sure you want to check out <strong>{selectedCheckIn.member.fullName}</strong>? 
              <br /><br />
              They have been in the gym for <strong>{calculateDuration(selectedCheckIn)}</strong>.
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCheckOutCancel} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleCheckOutConfirm} 
          color="primary" 
          variant="contained"
          disabled={checkOutMutation.isPending}
        >
          {checkOutMutation.isPending ? 'Processing...' : 'Check Out'}
        </Button>
      </DialogActions>
    </Dialog>
    </Box>
  );
};
