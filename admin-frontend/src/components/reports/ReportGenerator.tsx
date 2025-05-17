import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import axios from 'axios';

// Report type options
const reportTypes = [
  { value: 'MEMBERS', label: 'Members Report' },
  { value: 'CHECKINS', label: 'Check-ins Report' },
  { value: 'REVENUE', label: 'Revenue Report' },
  { value: 'SUBSCRIPTIONS', label: 'Subscriptions Report' },
  { value: 'EXPIRING_MEMBERSHIPS', label: 'Expiring Memberships Report' },
];

// Export format options
const exportFormats = [
  { value: 'PDF', label: 'PDF' },
  { value: 'EXCEL', label: 'Excel' },
  { value: 'CSV', label: 'CSV' },
];

interface ReportJob {
  id: number;
  report_type: string;
  export_format: string;
  parameters: any;
  created_at: string;
  status: string;
  completed_at: string | null;
  file_path: string | null;
  report_type_display: string;
  export_format_display: string;
}

const ReportGenerator: React.FC = () => {
  const [reportType, setReportType] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<string>('PDF');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<ReportJob | null>(null);
  
  // Parameters for different report types
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [memberId, setMemberId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');
  const [days, setDays] = useState<string>('30');

  const handleReportTypeChange = (event: SelectChangeEvent) => {
    setReportType(event.target.value);
    // Reset parameters when report type changes
    setDateFrom(null);
    setDateTo(null);
    setMemberId('');
    setStatus('');
    setPaymentType('');
    setDays('30');
  };

  const handleExportFormatChange = (event: SelectChangeEvent) => {
    setExportFormat(event.target.value);
  };

  const handleSubmit = async () => {
    if (!reportType) {
      setError('Please select a report type');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Build parameters based on report type
      const parameters: any = {};
      
      // Add common date filters
      if (dateFrom) {
        parameters.date_from = format(dateFrom, 'yyyy-MM-dd');
      }
      
      if (dateTo) {
        parameters.date_to = format(dateTo, 'yyyy-MM-dd');
      }
      
      // Add specific parameters
      switch (reportType) {
        case 'MEMBERS':
          if (status) {
            parameters.status = status;
          }
          break;
          
        case 'CHECKINS':
          if (memberId) {
            parameters.member_id = memberId;
          }
          break;
          
        case 'REVENUE':
          if (paymentType) {
            parameters.payment_type = paymentType;
          }
          break;
          
        case 'SUBSCRIPTIONS':
          if (status) {
            parameters.status = status;
          }
          break;
          
        case 'EXPIRING_MEMBERSHIPS':
          if (days) {
            parameters.days = days;
          }
          break;
      }
      
      // Generate report
      const response = await axios.post('/api/reports/generate/', {
        report_type: reportType,
        export_format: exportFormat,
        parameters,
      });
      
      setCurrentJob(response.data);
      setSuccess(`Report generated successfully! Report ID: ${response.data.id}`);
      
      // If report is already completed, poll for status
      if (response.data.status === 'COMPLETED') {
        pollReportStatus(response.data.id);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const pollReportStatus = async (reportId: number) => {
    try {
      const response = await axios.get(`/api/reports/${reportId}/`);
      setCurrentJob(response.data);
      
      if (response.data.status === 'PROCESSING') {
        // Continue polling if still processing
        setTimeout(() => pollReportStatus(reportId), 2000);
      }
    } catch (err) {
      console.error('Error polling report status:', err);
    }
  };
  
  const downloadReport = async () => {
    if (!currentJob || currentJob.status !== 'COMPLETED') {
      setError('Report is not ready for download');
      return;
    }
    
    try {
      // Use the download endpoint to get the file
      window.location.href = `/api/reports/${currentJob.id}/download/`;
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };
  
  const renderParameters = () => {
    switch (reportType) {
      case 'MEMBERS':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Member Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  label="Member Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Join Date From"
                  value={dateFrom}
                  onChange={(date) => setDateFrom(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Join Date To"
                  value={dateTo}
                  onChange={(date) => setDateTo(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </>
        );
        
      case 'CHECKINS':
        return (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                label="Member ID"
                fullWidth
                margin="normal"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Leave blank for all members"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date From"
                  value={dateFrom}
                  onChange={(date) => setDateFrom(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date To"
                  value={dateTo}
                  onChange={(date) => setDateTo(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </>
        );
        
      case 'REVENUE':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  label="Payment Type"
                >
                  <MenuItem value="">All Payment Types</MenuItem>
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date From"
                  value={dateFrom}
                  onChange={(date) => setDateFrom(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date To"
                  value={dateTo}
                  onChange={(date) => setDateTo(date)}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </>
        );
        
      case 'SUBSCRIPTIONS':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Subscription Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  label="Subscription Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );
        
      case 'EXPIRING_MEMBERSHIPS':
        return (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                label="Days Until Expiry"
                fullWidth
                margin="normal"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                type="number"
                InputProps={{ inputProps: { min: 1, max: 365 } }}
                helperText="Show memberships expiring within this many days"
              />
            </Grid>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Report Generator
        </Typography>
        
        <Box component="form" noValidate autoComplete="off">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={handleReportTypeChange}
                  label="Report Type"
                >
                  {reportTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportFormat}
                  onChange={handleExportFormatChange}
                  label="Export Format"
                >
                  {exportFormats.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {reportType && renderParameters()}
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={loading || !reportType}
                sx={{ mt: 2, mr: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
              
              {currentJob && currentJob.status === 'COMPLETED' && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={downloadReport}
                  sx={{ mt: 2 }}
                >
                  Download Report
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
        
        {currentJob && (
          <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Report Status
            </Typography>
            <Typography>
              <strong>Report Type:</strong> {currentJob.report_type_display}
            </Typography>
            <Typography>
              <strong>Format:</strong> {currentJob.export_format_display}
            </Typography>
            <Typography>
              <strong>Status:</strong>{' '}
              {currentJob.status === 'PROCESSING' ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  Processing <CircularProgress size={16} sx={{ ml: 1 }} />
                </Box>
              ) : currentJob.status === 'COMPLETED' ? (
                'Completed'
              ) : (
                'Failed'
              )}
            </Typography>
            <Typography>
              <strong>Created:</strong> {new Date(currentJob.created_at).toLocaleString()}
            </Typography>
            {currentJob.completed_at && (
              <Typography>
                <strong>Completed:</strong> {new Date(currentJob.completed_at).toLocaleString()}
              </Typography>
            )}
          </Paper>
        )}
      </CardContent>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default ReportGenerator;
