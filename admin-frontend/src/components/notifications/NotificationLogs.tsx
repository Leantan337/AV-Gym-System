import React, { useState, useEffect } from 'react';
// In your imports, add Grid from @mui/material
import { Grid } from '@mui/material';
import { GridItem } from '../common/GridItem';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

interface Member {
  id: string;
  name: string;
}

interface NotificationType {
  value: string;
  label: string;
}

interface NotificationLog {
  id: string;
  notification_type: string;
  member: Member;
  subject: string;
  content: string;
  content_html?: string;
  status: string;
  sent_at: string;
  error_message?: string;
}

interface NotificationLogResponse {
  count: number;
  results: NotificationLog[];
  next: string | null;
  previous: string | null;
}

const notificationTypes: NotificationType[] = [
  { value: 'MEMBERSHIP_EXPIRY', label: 'Membership Expiry' },
  { value: 'PAYMENT_DUE', label: 'Payment Due' },
  { value: 'GENERAL', label: 'General' }
];

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  'sent': 'success',
  'failed': 'error',
  'pending': 'warning'
};

const NotificationLogs: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Details dialog
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [detailsTab, setDetailsTab] = useState<number>(0);
  
  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, searchQuery, selectedType, startDate, endDate]);
  
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      let params = new URLSearchParams();
      params.append('page', String(page + 1)); // API uses 1-indexed pages
      params.append('page_size', String(rowsPerPage));
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (selectedType) {
        params.append('type', selectedType);
      }
      
      if (startDate) {
        params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      }
      
      if (endDate) {
        params.append('end_date', format(endDate, 'yyyy-MM-dd'));
      }
      
      const response = await axios.get<NotificationLogResponse>(`/api/notifications/logs/?${params.toString()}`);
      setLogs(response.data.results);
      setTotalCount(response.data.count);
    } catch (err) {
      console.error('Error fetching notification logs:', err);
      setError('Failed to load notification logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };
  
  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedType(event.target.value as string);
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };
  
  const handleViewDetails = (log: NotificationLog) => {
    setSelectedLog(log);
    setDetailsTab(0);
  };
  
  const handleCloseDetails = () => {
    setSelectedLog(null);
  };
  
  const getNotificationTypeLabel = (type: string): string => {
    const foundType = notificationTypes.find(t => t.value === type);
    return foundType ? foundType.label : type;
  };
  
  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" color="primary">Notification History</Typography>
        
        <Box>
          <IconButton 
            color={showFilters ? "primary" : "default"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Search and Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="flex-end">
          <GridItem xs={12} md={showFilters ? 6 : 12}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by member name, subject, or content..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </GridItem>
          
          {showFilters && (
            <>
              <GridItem xs={12} md={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Notification Type</InputLabel>
                  <Select
                    value={selectedType}
                    onChange={handleTypeChange}
                    label="Notification Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {notificationTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <GridItem xs={12} sm={6}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
                  />
                </GridItem>
                
                <GridItem xs={12} sm={6}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }}
                    minDate={startDate || undefined}
                  />
                </GridItem>
              </LocalizationProvider>
              
              <GridItem xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button 
                    variant="outlined" 
                    startIcon={<ClearIcon />}
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </GridItem>
            </>
          )}
        </Grid>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      {/* Notification Logs Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Member</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    No notification logs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      {formatDate(log.sent_at)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getNotificationTypeLabel(log.notification_type)}
                  </TableCell>
                  <TableCell>{log.member.name}</TableCell>
                  <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.subject}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      color={statusColors[log.status.toLowerCase()] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(log)}
                      title="View Details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      
      {/* Notification Details Dialog */}
      <Dialog 
        open={Boolean(selectedLog)} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedLog && (
          <>
            <DialogTitle>
              Notification Details
              <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                <Chip 
                  label={selectedLog.status} 
                  color={statusColors[selectedLog.status.toLowerCase()] || 'default'}
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <GridItem xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Sent At</Typography>
                  <Typography variant="body1">{formatDate(selectedLog.sent_at)}</Typography>
                </GridItem>
                <GridItem xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                  <Typography variant="body1">{getNotificationTypeLabel(selectedLog.notification_type)}</Typography>
                </GridItem>
                <GridItem xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Member</Typography>
                  <Typography variant="body1">{selectedLog.member.name}</Typography>
                </GridItem>
                <GridItem xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Member ID</Typography>
                  <Typography variant="body1">{selectedLog.member.id}</Typography>
                </GridItem>
                <GridItem xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Subject</Typography>
                  <Typography variant="body1">{selectedLog.subject}</Typography>
                </GridItem>
                
                {selectedLog.error_message && (
                  <GridItem xs={12}>
                    <Alert severity="error">
                      <Typography variant="subtitle2">Error Message:</Typography>
                      <Typography variant="body2">{selectedLog.error_message}</Typography>
                    </Alert>
                  </GridItem>
                )}
                
                <GridItem xs={12}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs 
                      value={detailsTab} 
                      onChange={(e, newValue) => setDetailsTab(newValue)}
                    >
                      <Tab label="Text Content" />
                      {selectedLog.content_html && <Tab label="HTML Content" />}
                    </Tabs>
                  </Box>
                  
                  {detailsTab === 0 && (
                    <Box sx={{ 
                      p: 2, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      whiteSpace: 'pre-line', 
                      minHeight: '200px',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}>
                      <Typography>{selectedLog.content}</Typography>
                    </Box>
                  )}
                  
                  {detailsTab === 1 && selectedLog.content_html && (
                    <Box sx={{ 
                      p: 2, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      minHeight: '200px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      '& a': { color: 'primary.main' },
                      '& img': { maxWidth: '100%' }
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: selectedLog.content_html }} />
                    </Box>
                  )}
                </GridItem>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails} color="primary">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default NotificationLogs;
