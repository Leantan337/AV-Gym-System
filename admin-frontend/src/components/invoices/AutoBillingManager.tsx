import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarClock, CreditCard, AlertTriangle, TicketCheck, CheckCircle2 } from 'lucide-react';
import { membershipService } from '../../services/membershipService';

export const AutoBillingManager: React.FC = () => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [runningManualBilling, setRunningManualBilling] = useState(false);
  const queryClient = useQueryClient();

  // Get auto-billing status
  const { data: billingStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['autoBillingStatus'],
    queryFn: membershipService.getAutoBillingStatus,
  });

  // Get expiring subscriptions
  const { data: expiringSubscriptions, isLoading: loadingExpiring } = useQuery({
    queryKey: ['expiringSubscriptions'],
    queryFn: () => membershipService.getExpiringSubscriptions(7),
  });

  // Toggle auto-billing mutation
  const toggleBillingMutation = useMutation({
    mutationFn: (enabled: boolean) => membershipService.toggleAutoBilling(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoBillingStatus'] });
    },
  });

  // Manual billing generation mutation
  const generateInvoicesMutation = useMutation({
    mutationFn: membershipService.generateInvoicesForDueSubscriptions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setRunningManualBilling(false);
      // Show success alert
      alert(`Successfully generated ${data.count} invoices`);
    },
    onError: (error) => {
      setRunningManualBilling(false);
      // Show error alert
      alert(`Error generating invoices: ${error}`);
    },
  });

  const handleToggleAutoBilling = () => {
    if (billingStatus?.enabled) {
      // If turning off, show confirmation dialog
      setConfirmDialogOpen(true);
    } else {
      // If turning on, just do it
      toggleBillingMutation.mutate(true);
    }
  };

  const confirmDisableAutoBilling = () => {
    toggleBillingMutation.mutate(false);
    setConfirmDialogOpen(false);
  };

  const handleManualBillingRun = () => {
    setRunningManualBilling(true);
    generateInvoicesMutation.mutate();
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Automated Billing Management</Typography>
      
      {/* Auto Billing Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CalendarClock size={32} />
            <Box>
              <Typography variant="h6">Automatic Billing</Typography>
              <Typography variant="body2" color="text.secondary">
                {billingStatus?.enabled 
                  ? 'Invoices are automatically generated for due subscriptions.' 
                  : 'Automatic billing is currently disabled.'}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              {loadingStatus ? (
                <CircularProgress size={24} />
              ) : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={billingStatus?.enabled || false}
                      onChange={handleToggleAutoBilling}
                      color="primary"
                    />
                  }
                  label={billingStatus?.enabled ? 'Enabled' : 'Disabled'}
                />
              )}
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            {billingStatus && (
              <Box>
                <Typography variant="subtitle2">Last run:</Typography>
                <Typography>
                  {billingStatus.lastRun 
                    ? format(parseISO(billingStatus.lastRun), 'PPP p') 
                    : 'Not run yet'}
                </Typography>
              </Box>
            )}
            {billingStatus && (
              <Box>
                <Typography variant="subtitle2">Next scheduled run:</Typography>
                <Typography>
                  {billingStatus.nextRun 
                    ? format(parseISO(billingStatus.nextRun), 'PPP p') 
                    : 'Not scheduled'}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              onClick={handleManualBillingRun}
              disabled={runningManualBilling}
              startIcon={runningManualBilling ? <CircularProgress size={20} /> : <CreditCard />}
            >
              {runningManualBilling ? 'Generating Invoices...' : 'Run Billing Now'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Expiring Subscriptions */}
      <Typography variant="h6" gutterBottom>Subscriptions Expiring Soon</Typography>
      {loadingExpiring ? (
        <CircularProgress />
      ) : expiringSubscriptions?.length === 0 ? (
        <Alert severity="info">No subscriptions expiring in the next 7 days.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Auto-Renew</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expiringSubscriptions?.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>{subscription.memberName}</TableCell>
                  <TableCell>{subscription.planName}</TableCell>
                  <TableCell>
                    {format(parseISO(subscription.endDate), 'PP')}
                    <Typography variant="caption" display="block" color="error">
                      {`Expires in ${Math.ceil(Math.max(0, (new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={subscription.autoRenew ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      label={subscription.autoRenew ? 'Yes' : 'No'}
                      color={subscription.autoRenew ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined"
                      startIcon={<TicketCheck size={16} />}
                      onClick={() => {
                        // Manually create invoice for this subscription
                        // Implementation would depend on your API
                      }}
                    >
                      Generate Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Disable Automatic Billing?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Disabling automatic billing will prevent the system from automatically generating
            invoices for due subscriptions. You will need to manually generate invoices.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDisableAutoBilling} color="error">
            Disable Auto-Billing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
