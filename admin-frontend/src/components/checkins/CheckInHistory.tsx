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
} from '@mui/material';
import { Search } from 'lucide-react';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkOutMember } from '../../services/api';
import { format, subDays } from 'date-fns';
import wsService from '../../services/websocket';

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
  const queryClient = useQueryClient();

  // Handle real-time updates
  useEffect(() => {
    wsService.connect();

    const handleCheckInUpdate = (data: { type: 'check_in' | 'check_out', checkIn: CheckIn }) => {
      queryClient.setQueryData(['checkIns'], (old: CheckIn[] = []) => {
        if (data.type === 'check_in') {
          return [data.checkIn, ...old];
        } else {
          return old.map(item => 
            item.id === data.checkIn.id ? data.checkIn : item
          );
        }
      });
    };

    wsService.subscribe('check_in_update', handleCheckInUpdate);

    return () => {
      wsService.unsubscribe('check_in_update', handleCheckInUpdate);
    };
  }, [queryClient]);

  const handleFilterChange = (key: keyof CheckInFilters, value: any) => {
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

  const handleCheckOut = (checkInId: string) => {
    checkOutMutation.mutate({ checkInId });
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
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
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
          {checkIns.map((checkIn) => (
            <TableRow key={checkIn.id}>
              <TableCell>{checkIn.member.fullName}</TableCell>
              <TableCell>
                {format(new Date(checkIn.checkInTime), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Chip
                  label={checkIn.checkOutTime ? 'Checked Out' : 'In Gym'}
                  color={checkIn.checkOutTime ? 'default' : 'success'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {!checkIn.checkOutTime && (
                  <Tooltip title="Check Out">
                    <IconButton
                      onClick={() => handleCheckOut(checkIn.id)}
                      disabled={checkOutMutation.isPending}
                      color="primary"
                      size="small"
                    >
                      <ExitToAppIcon />
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
    />
    </Box>
  );
};
