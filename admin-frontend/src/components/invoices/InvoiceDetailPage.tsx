import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { 
  FileDown, 
  Mail, 
  Printer, 
  ArrowLeft, 
  CreditCard, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  DollarSign,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceApi } from '../../services/invoiceApi';
import { Invoice, Payment, PaymentMethod } from '../../types/invoice';

// Payment status colors
const statusColors: Record<Invoice['status'], string> = {
  draft: '#9e9e9e',      // grey
  pending: '#1976d2',    // blue
  paid: '#2e7d32',       // green
  cancelled: '#d32f2f',  // red
};

// Payment method icons
const PaymentMethodIcon: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  switch (method) {
    case 'credit_card':
      return <CreditCard size={18} />;
    case 'cash':
      return <DollarSign size={18} />;
    default:
      return null;
  }
};

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (recipientEmail: string) => void;
  defaultEmail: string;
  isSending: boolean;
}

// Email dialog component for resending invoice emails
const EmailDialog: React.FC<EmailDialogProps> = ({
  open,
  onClose,
  onSend,
  defaultEmail,
  isSending,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    // Simple email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    onSend(email);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Invoice Email</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" sx={{ mb: 2 }}>
          The invoice will be sent to the following email address:
        </Typography>
        <TextField
          fullWidth
          label="Recipient Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="Enter email address"
          disabled={isSending}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={isSending}
          startIcon={isSending ? <CircularProgress size={16} /> : <Mail />}
        >
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const InvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoiceById(invoiceId as string),
    enabled: !!invoiceId,
  });

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: invoiceApi.downloadInvoicePdf,
    onSuccess: (blob) => {
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoice?.number || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: ({ invoiceId, email }: { invoiceId: string; email: string }) =>
      invoiceApi.sendInvoiceEmail(invoiceId, email),
    onSuccess: () => {
      setEmailDialogOpen(false);
      // Refresh invoice data to show updated email status
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: invoiceApi.markInvoiceAsPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] }); // Refresh invoice list
    },
  });

  const handleBackClick = () => {
    navigate('/invoices');
  };

  const handleDownloadPdf = () => {
    if (invoice) {
      downloadPdfMutation.mutate(invoice.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = (email: string) => {
    if (invoice) {
      sendEmailMutation.mutate({ invoiceId: invoice.id, email });
    }
  };

  const handleMarkAsPaid = () => {
    if (invoice && invoice.status === 'pending') {
      markAsPaidMutation.mutate(invoice.id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ? `Error loading invoice: ${(error as Error).message}` : 'Invoice not found'}
        </Alert>
        <Button startIcon={<ArrowLeft />} onClick={handleBackClick}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowLeft />} onClick={handleBackClick}>
          Back to Invoices
        </Button>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDown />}
            onClick={handleDownloadPdf}
            disabled={downloadPdfMutation.isPending}
          >
            {downloadPdfMutation.isPending ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Printer />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<Mail />}
            onClick={() => setEmailDialogOpen(true)}
            disabled={sendEmailMutation.isPending}
          >
            Email
          </Button>
          {invoice.status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleMarkAsPaid}
              disabled={markAsPaidMutation.isPending}
            >
              Mark as Paid
            </Button>
          )}
        </Stack>
      </Box>

      {/* Invoice Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Invoice header */}
          <Grid item xs={12} display="flex" justifyContent="space-between" flexWrap="wrap">
            <Box>
              <Typography variant="h5">Invoice #{invoice.number}</Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(invoice.createdAt), 'MMMM d, yyyy')}
              </Typography>
            </Box>
            <Chip
              label={invoice.status}
              sx={{
                bgcolor: `${statusColors[invoice.status]}16`,
                color: statusColors[invoice.status],
                fontWeight: 'bold',
                borderColor: `${statusColors[invoice.status]}32`,
                border: '1px solid',
              }}
            />
          </Grid>

          {/* Business and client info */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>From</Typography>
            <Typography variant="body1">AV Gym</Typography>
            <Typography variant="body2" color="text.secondary">
              123 Fitness Street<br />
              Workout City, WO 12345<br />
              Phone: (123) 456-7890<br />
              Email: billing@avgym.com
            </Typography>
          </Grid>

          <Grid item xs={12} md={6} textAlign={{ xs: 'left', md: 'right' }}>
            <Typography variant="subtitle2" gutterBottom>Bill To</Typography>
            <Typography variant="body1">{invoice.member.fullName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Member ID: {invoice.member.membershipNumber || 'N/A'}<br />
              Email: {invoice.member.email || 'N/A'}<br />
              Phone: {invoice.member.phone || 'N/A'}
            </Typography>
          </Grid>

          {/* Invoice meta info */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Issue Date</Typography>
                <Typography variant="body2">
                  {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography variant="body2">
                  {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Amount Due</Typography>
                <Typography variant="body2" fontWeight="bold">
                  ${invoice.total.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoice Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Invoice Items</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Invoice Summary */}
          <Box sx={{ mt: 2, textAlign: 'right', p: 2 }}>
            <Grid container spacing={1} justifyContent="flex-end">
              <Grid item xs={12} sm={4} md={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">${invoice.subtotal.toFixed(2)}</Typography>
                </Box>
                {invoice.tax > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body2">Tax:</Typography>
                    <Typography variant="body2">${invoice.tax.toFixed(2)}</Typography>
                  </Box>
                )}
                {invoice.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body2">Discount:</Typography>
                    <Typography variant="body2">-${invoice.discount.toFixed(2)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography variant="subtitle2">Total:</Typography>
                  <Typography variant="subtitle2">${invoice.total.toFixed(2)}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TableContainer>
      </Paper>

      {/* Payment Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Payment Information</Typography>
        
        {invoice.payments && invoice.payments.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PaymentMethodIcon method={payment.method} />
                          {payment.method.replace('_', ' ')}
                        </Box>
                      </TableCell>
                      <TableCell>{payment.reference || 'N/A'}</TableCell>
                      <TableCell align="right">${payment.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Card sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 300 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Amount:</Typography>
                    <Typography variant="body2">${invoice.total.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Amount Paid:</Typography>
                    <Typography variant="body2" color="success.main">
                      ${invoice.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">Balance:</Typography>
                    <Typography 
                      variant="subtitle2"
                      color={invoice.status === 'paid' ? 'success.main' : 'error.main'}
                    >
                      ${(invoice.total - invoice.payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {invoice.status === 'paid' ? (
              <Alert severity="success" icon={<CheckCircle />}>
                This invoice has been marked as paid, but no payment details are recorded.
              </Alert>
            ) : invoice.status === 'cancelled' ? (
              <Alert severity="error" icon={<X />}>
                This invoice has been cancelled.
              </Alert>
            ) : (
              <Alert severity="info" icon={<Clock />}>
                No payments have been recorded for this invoice.
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Notes */}
      {invoice.notes && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Notes</Typography>
          <Typography variant="body2">{invoice.notes}</Typography>
        </Paper>
      )}

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        onSend={handleSendEmail}
        defaultEmail={invoice.member.email || ''}
        isSending={sendEmailMutation.isPending}
      />
    </Box>
  );
};
