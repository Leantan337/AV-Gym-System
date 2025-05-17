import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Grid,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle,
  Printer,
  FileText,
  Send,
  Download,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { paymentService, Payment, PaymentMethod } from '../../services/paymentService';
import { invoiceApi } from '../../services/invoiceApi';
import { emailService } from '../../services/emailService';

interface PaymentFormData {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
}

interface PaymentManagerProps {
  invoiceId: string;
  invoiceTotal: number;
  invoiceBalance: number;
  memberId: string;
  onPaymentUpdate?: () => void;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({
  invoiceId,
  invoiceTotal,
  invoiceBalance,
  memberId,
  onPaymentUpdate,
}) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: invoiceBalance.toString(),
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const queryClient = useQueryClient();

  // Get payments for this invoice
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: () => paymentService.getInvoicePayments(invoiceId),
  });

  // Get member's payment methods
  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['paymentMethods', memberId],
    queryFn: () => paymentService.getMemberPaymentMethods(memberId),
  });

  // Mutations
  const recordPaymentMutation = useMutation({
    mutationFn: paymentService.recordManualPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsPaymentDialogOpen(false);
      resetForm();
      if (onPaymentUpdate) onPaymentUpdate();
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount?: number; reason?: string } }) =>
      paymentService.refundPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount('');
      setRefundReason('');
      if (onPaymentUpdate) onPaymentUpdate();
    },
  });

  const sendReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => {
      // This is a placeholder - actual implementation would depend on your API
      return emailService.sendEmail({
        to: 'member@example.com', // Would be dynamically fetched
        subject: 'Payment Receipt',
        bodyHtml: `<h1>Payment Receipt</h1><p>Thank you for your payment of $${selectedPayment?.amount} for invoice #${invoiceId}</p>`,
        bodyText: `Payment Receipt\n\nThank you for your payment of $${selectedPayment?.amount} for invoice #${invoiceId}`,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      amount: invoiceBalance.toString(),
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleOpenPaymentDialog = () => {
    resetForm();
    setIsPaymentDialogOpen(true);
  };

  const handleOpenRefundDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toString());
    setIsRefundDialogOpen(true);
  };

  const handleRecordPayment = () => {
    const paymentData = {
      invoiceId,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      paymentDate: formData.paymentDate,
      notes: formData.notes,
    };

    recordPaymentMutation.mutate(paymentData);
  };

  const handleRefundPayment = () => {
    if (!selectedPayment) return;

    const refundData = {
      amount: refundAmount ? parseFloat(refundAmount) : undefined,
      reason: refundReason || undefined,
    };

    refundPaymentMutation.mutate({
      id: selectedPayment.id,
      data: refundData,
    });
  };

  const handleSendReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    sendReceiptMutation.mutate(payment.id);
  };

  const getPaymentStatusChip = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <Chip icon={<CheckCircle size={16} />} label="Completed" color="success" size="small" />;
      case 'pending':
        return <Chip icon={<AlertCircle size={16} />} label="Pending" color="warning" size="small" />;
      case 'processing':
        return <Chip icon={<RotateCcw size={16} />} label="Processing" color="info" size="small" />;
      case 'failed':
        return <Chip icon={<XCircle size={16} />} label="Failed" color="error" size="small" />;
      case 'refunded':
        return <Chip icon={<RotateCcw size={16} />} label="Refunded" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getTotalPaid = () => {
    if (!payments) return 0;
    return payments
      .filter(p => p.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getTotalRefunded = () => {
    if (!payments) return 0;
    return payments
      .filter(p => p.status === 'refunded')
      .reduce((sum, payment) => sum + (payment.refundAmount || 0), 0);
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Payment Information</Typography>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={handleOpenPaymentDialog}
              disabled={invoiceBalance <= 0}
            >
              Record Payment
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>Total Amount</Typography>
                <Typography variant="h5" color="text.primary">${invoiceTotal.toFixed(2)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>Paid Amount</Typography>
                <Typography variant="h5" color="success.main">${getTotalPaid().toFixed(2)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>Balance Due</Typography>
                <Typography variant="h5" color={invoiceBalance > 0 ? 'error.main' : 'text.primary'}>
                  ${invoiceBalance.toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>Payment History</Typography>
      
      {loadingPayments ? (
        <Typography>Loading payment history...</Typography>
      ) : !payments || payments.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No payments have been recorded for this invoice yet.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(parseISO(payment.paymentDate), 'PPP')}
                  </TableCell>
                  <TableCell>
                    ${payment.amount.toFixed(2)}
                    {payment.refundAmount && (
                      <Typography variant="caption" display="block" color="error">
                        Refunded: ${payment.refundAmount.toFixed(2)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusChip(payment.status)}
                  </TableCell>
                  <TableCell>
                    {payment.notes || '-'}
                    {payment.refundReason && (
                      <Typography variant="caption" display="block">
                        Refund reason: {payment.refundReason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {payment.status === 'completed' && (
                        <>
                          <Tooltip title="Send Receipt">
                            <IconButton size="small" onClick={() => handleSendReceipt(payment)}>
                              <Send size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print Receipt">
                            <IconButton size="small">
                              <Printer size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Refund">
                            <IconButton size="small" onClick={() => handleOpenRefundDialog(payment)}>
                              <RotateCcw size={18} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {payment.status === 'refunded' && (
                        <Tooltip title="Download Refund Receipt">
                          <IconButton size="small">
                            <Download size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <FormControl fullWidth required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="check">Check</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="paypal">PayPal</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Payment Date"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRecordPayment}
            disabled={!formData.amount || parseFloat(formData.amount) <= 0}
            startIcon={<DollarSign />}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onClose={() => setIsRefundDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="info">
                You are about to refund payment of ${selectedPayment.amount.toFixed(2)} made on {format(parseISO(selectedPayment.paymentDate), 'PP')}.
              </Alert>

              <TextField
                label="Refund Amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText={`Maximum refund amount: $${selectedPayment.amount.toFixed(2)}`}
              />

              <TextField
                label="Reason for Refund"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRefundDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRefundPayment}
            disabled={
              Boolean(!refundAmount ||
              parseFloat(refundAmount) <= 0 ||
              (selectedPayment && parseFloat(refundAmount) > selectedPayment.amount))
            }
            startIcon={<RotateCcw />}
          >
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
