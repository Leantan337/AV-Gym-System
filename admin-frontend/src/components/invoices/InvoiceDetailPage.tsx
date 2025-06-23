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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
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
  DollarSign,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format as formatDateFns } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceApi } from '../../services/invoiceApi';
import { Invoice, Payment, PaymentMethod } from '../../types/invoice';

// Format currency helper function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Extend the Payment interface to include additional fields
interface ExtendedPayment extends Payment {
  date?: string;
  reference?: string;
}

// Extend the Invoice interface to include additional fields
interface ExtendedInvoice extends Invoice {
  discount?: number;
  taxRate?: number;
  payments?: ExtendedPayment[];
  member: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    membershipNumber?: string; // Make it optional
  };
}

// Alias for backward compatibility
type InvoiceWithPayments = ExtendedInvoice

// Get status color
const getStatusColor = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
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

const InvoiceDetailPageComponent: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery<InvoiceWithPayments>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoiceById(invoiceId as string) as Promise<InvoiceWithPayments>,
    enabled: !!invoiceId,
  });

  // Calculate total
  const calculateTotal = (items: Invoice['items'] = []): number => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0;
      const unitPrice = Number(item?.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  // Calculate tax
  const calculateTax = (subtotal: number, taxRate = 0): number => {
    const rate = Number(taxRate) || 0;
    if (rate <= 0) return 0;
    return subtotal * (rate / 100);
  };

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.downloadInvoicePdf(id),
    onSuccess: (data) => {
      // Create a blob from the PDF data
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.number || 'unknown'}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error) => {
      console.error('Error downloading PDF:', error);
      // Show error message to user
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
    mutationFn: (id: string) => invoiceApi.markInvoiceAsPaid(id),
    onSuccess: () => {
      // Show success message
      // Refresh the invoice data
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
    onError: (error) => {
      console.error('Error marking as paid:', error);
      // Show error message to user
    },
  });

  const handleBackClick = () => {
    navigate('/invoices');
  };

  const handleDownloadPdf = (): void => {
    if (invoice?.id) {
      downloadPdfMutation.mutate(invoice.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = (email?: string) => {
    if (invoice && email) {
      sendEmailMutation.mutate({ invoiceId: invoice.id, email });
    } else if (invoice) {
      setEmailDialogOpen(true);
    }
  };

  const handleMarkAsPaid = (): void => {
    if (invoice?.status === 'pending' && invoice?.id) {
      markAsPaidMutation.mutate(invoice.id);
    }
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format payment method
  const formatPaymentMethod = (method: PaymentMethod): string => {
    if (!method) return 'N/A';
    return method
      .replace('_', ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'An error occurred while loading the invoice'}
        </Alert>
        <Button startIcon={<ArrowLeft />} onClick={handleBackClick} sx={{ mt: 2 }}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invoice not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBackClick}>
            <ArrowLeft />
          </IconButton>
          <Typography variant="h4">Invoice Details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Printer size={18} />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDown size={18} />}
            onClick={handleDownloadPdf}
            disabled={downloadPdfMutation.isPending}
          >
            {downloadPdfMutation.isPending ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Mail size={18} />}
            onClick={() => handleSendEmail()}
            disabled={sendEmailMutation.isPending}
          >
            {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
          </Button>
          {invoice.status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle size={18} />}
              onClick={handleMarkAsPaid}
              disabled={markAsPaidMutation.isPending}
            >
              {markAsPaidMutation.isPending ? 'Marking as Paid...' : 'Mark as Paid'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Invoice Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="h5">Invoice #{invoice.number}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(invoice.createdAt)}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Chip
                label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                color={getStatusColor(invoice.status)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="h6" gutterBottom>AV Gym System</Typography>
            <Typography variant="body2" color="text.secondary">
              123 Gym Street<br />
              New York, NY 10001<br />
              Phone: (123) 456-7890<br />
              Email: billing@avgym.com
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Bill To</Typography>
            <Typography variant="body1" fontWeight="bold">{invoice.member.fullName}</Typography>
            {invoice.member.membershipNumber && (
              <Typography variant="body2" color="text.secondary">
                Membership: {invoice.member.membershipNumber}
              </Typography>
            )}
            <Typography variant="body2">{invoice.member.email}</Typography>
            <Typography variant="body2">{invoice.member.phone}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {invoice.member.address}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Invoice Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Invoice #</Typography>
                <Typography variant="body1">{invoice.number}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography variant="body1">
                  {formatDate(invoice.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                <Typography variant="body1">
                  {formatDate(invoice.dueDate)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  color={getStatusColor(invoice.status)}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Paper>

      {/* Invoice Items */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
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
                    <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box sx={{ width: '100%', maxWidth: 300 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">
                  {formatCurrency(calculateTotal(invoice.items))}
                </Typography>
              </Box>
              {invoice.discount && invoice.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Discount:</Typography>
                  <Typography variant="body2" color="error">
                    -{formatCurrency(invoice.discount)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">
                  {formatCurrency(calculateTax(calculateTotal(invoice.items), invoice.taxRate || 0))}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formatCurrency(invoice.total)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

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
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PaymentMethodIcon method={payment.method} />
                          {formatPaymentMethod(payment.method)}
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

export default InvoiceDetailPageComponent;