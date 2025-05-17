import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit, X, UserCheck, Download, FileText, Activity, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { adminApi } from '../../services/api';
import { PhotoUploadComponent } from './PhotoUploadComponent';

interface MemberDetailDialogProps {
  open: boolean;
  onClose: () => void;
  memberId: string | null;
  onEdit?: (memberId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

export const MemberDetailDialog: React.FC<MemberDetailDialogProps> = ({
  open,
  onClose,
  memberId,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  // Fetch member details
  const {
    data: member,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => (memberId ? adminApi.getMemberById(memberId) : null),
    enabled: !!memberId && open,
  });

  // Fetch member's check-in history
  const { data: checkIns } = useQuery({
    queryKey: ['memberCheckIns', memberId],
    queryFn: () => (memberId ? adminApi.getMemberCheckIns(memberId) : null),
    enabled: !!memberId && open && activeTab === 1,
  });

  // Fetch member's payment history
  const { data: payments } = useQuery({
    queryKey: ['memberPayments', memberId],
    queryFn: () => (memberId ? adminApi.getMemberPayments(memberId) : null),
    enabled: !!memberId && open && activeTab === 2,
  });

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle edit button click
  const handleEdit = () => {
    if (memberId && onEdit) {
      onEdit(memberId);
      onClose();
    }
  };

  // Handle ID card download
  const handleDownloadIdCard = async () => {
    if (!memberId) return;
    try {
      await adminApi.downloadIdCard(memberId);
    } catch (error) {
      console.error('Failed to download ID card:', error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Member Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (error || !member) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {error ? `Failed to load member details: ${(error as Error).message}` : 'Member not found'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: { overflow: 'visible' }
      }}
    >
      {/* Custom dialog header with close button */}
      <Box sx={{ position: 'relative', px: 3, pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            Member Profile
          </Typography>
          <Box>
            <IconButton onClick={onClose} aria-label="close" sx={{ ml: 2 }}>
              <X />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'visible' }}>
        {/* Member profile header */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Grid container spacing={3}>
            {/* Photo column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PhotoUploadComponent 
                  memberId={memberId} 
                  currentPhotoUrl={member.photoUrl}
                />
              </Box>
            </Grid>

            {/* Details column */}
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4">{member.fullName}</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Member ID: {member.membershipNumber || 'Not assigned'}
                  </Typography>
                </Box>
                <Chip
                  label={member.status}
                  color={member.status === 'active' ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{member.email || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{member.phone || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">{member.address || 'Not provided'}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<Download />}
                  onClick={handleDownloadIdCard}
                >
                  Download ID Card
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<Edit />}
                  onClick={handleEdit}
                >
                  Edit Profile
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* Tabs section */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="member detail tabs">
              <Tab icon={<CreditCard fontSize="small" />} label="Membership" />
              <Tab icon={<UserCheck fontSize="small" />} label="Check-ins" />
              <Tab icon={<FileText fontSize="small" />} label="Payments" />
              <Tab icon={<Activity fontSize="small" />} label="Activity" />
            </Tabs>
          </Box>

          {/* Membership Tab */}
          <TabPanel value={activeTab} index={0}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Membership Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Plan</Typography>
                  <Typography variant="body1">{member.membership?.plan || 'No active plan'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={member.membership?.status || 'Inactive'} 
                    color={member.membership?.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Start Date</Typography>
                  <Typography variant="body1">
                    {member.membership?.startDate 
                      ? format(new Date(member.membership.startDate), 'MMM d, yyyy')
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">End Date</Typography>
                  <Typography variant="body1">
                    {member.membership?.endDate 
                      ? format(new Date(member.membership.endDate), 'MMM d, yyyy')
                      : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Access Privileges
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {member.accessPrivileges?.map((privilege) => (
                  <Chip 
                    key={privilege.name}
                    label={privilege.name} 
                    size="small"
                    color={privilege.active ? 'primary' : 'default'} 
                  />
                )) || (
                  <Typography variant="body2" color="text.secondary">
                    No special access privileges assigned
                  </Typography>
                )}
              </Box>
            </Paper>
          </TabPanel>

          {/* Check-ins Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Recent Check-ins
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time In</TableCell>
                    <TableCell>Time Out</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checkIns?.length ? (
                    checkIns.map((checkIn) => (
                      <TableRow key={checkIn.id}>
                        <TableCell>
                          {format(new Date(checkIn.checkInTime), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(checkIn.checkInTime), 'h:mm a')}
                        </TableCell>
                        <TableCell>
                          {checkIn.checkOutTime 
                            ? format(new Date(checkIn.checkOutTime), 'h:mm a')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {checkIn.duration || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No check-in history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Payments Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Payment History
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments?.length ? (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.invoiceNumber}</TableCell>
                        <TableCell>
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={payment.status} 
                            size="small"
                            color={payment.status === 'paid' ? 'success' : 
                                  payment.status === 'pending' ? 'warning' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {member.recentActivity?.length ? (
                  member.recentActivity.map((activity, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        mt: 1, 
                      }} />
                      <Box>
                        <Typography variant="body2">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(activity.timestamp), 'MMM d, yyyy, h:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recent activity found
                  </Typography>
                )}
              </Box>
            </Paper>
          </TabPanel>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
