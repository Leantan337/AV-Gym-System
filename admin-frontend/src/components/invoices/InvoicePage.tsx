import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Eye as PreviewIcon,
  FileText as PdfIcon,
  Copy as DuplicateIcon,
  Mail as EmailIcon,
  Search as SearchIcon,
  BarChart as BarChartIcon,
  CreditCard as CreditCardIcon,
  Clock as ClockIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Plus as PlusIcon,
  Download as DownloadIcon
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '../../services/invoiceApi';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceTemplate } from './InvoiceTemplate';
import { Invoice, CreateInvoiceData, InvoiceFilters, InvoiceListResponse } from '../../types/invoice';
import { EmailTemplateManager } from './EmailTemplateManager';
import { AutoBillingManager } from './AutoBillingManager';
import { PaymentManager } from './PaymentManager';
import { InvoiceDashboard } from './InvoiceDashboard';
import { InvoiceList } from './InvoiceList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const InvoicePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: invoiceApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleCloseForm();
    },
  });

  // Update invoice mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateInvoiceData }) =>
      invoiceApi.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleCloseForm();
    },
  });

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: invoiceApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: invoiceApi.generatePdf,
    onSuccess: (pdfUrl) => {
      window.open(pdfUrl, '_blank');
      setPdfLoading(null);
    },
    onError: (error) => {
      console.error('Error generating PDF:', error);
      setPdfLoading(null);
    }
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({invoiceIds, status}: {invoiceIds: string[], status: Invoice['status']}) => 
      invoiceApi.bulkUpdateStatus(invoiceIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  // Bulk generate PDF mutation
  const bulkGeneratePdfMutation = useMutation({
    mutationFn: invoiceApi.bulkGeneratePdf,
    onSuccess: (zipUrl) => {
      window.open(zipUrl, '_blank');
    }
  });

  // Handle tab change
  const handleCreateNew = () => {
    setEditingInvoice(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsCreateDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsCreateDialogOpen(false);
    setEditingInvoice(null);
  };

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  // Handle form submit
  const handleSubmit = (data: CreateInvoiceData) => {
    if (selectedInvoice) {
      updateMutation.mutate({
        id: selectedInvoice.id,
        data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle delete click
  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsConfirmDeleteOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (selectedInvoice) {
      deleteMutation.mutate(selectedInvoice.id);
      setIsConfirmDeleteOpen(false);
      setSelectedInvoice(null);
    }
  };

  // Handle generate PDF
  const handleGeneratePdf = (invoice: Invoice) => {
    setPdfLoading(invoice.id);
    generatePdfMutation.mutate(invoice.id);
  };

  // Handle bulk update status
  const handleBulkUpdateStatus = (invoiceIds: string[], status: Invoice['status']) => {
    bulkUpdateStatusMutation.mutate({invoiceIds, status});
  };

  // Handle bulk generate PDF
  const handleBulkGeneratePdf = (invoiceIds: string[]) => {
    bulkGeneratePdfMutation.mutate(invoiceIds);
  };

  // Handle view PDF
  const handleViewPdf = async (invoice: Invoice) => {
    try {
      setPdfLoading(invoice.id);
      const blob = await invoiceApi.generatePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setPdfLoading(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      setPdfLoading(null);
    }
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    try {
      const blob = await invoiceApi.bulkGeneratePdf([]);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      alert('Error generating PDFs. Please try again.');
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h5">Invoice Management System</Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Export All">
            <IconButton onClick={handleBulkExport}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={handleCreateNew}
          >
            Create Invoice
          </Button>
        </Stack>
      </Stack>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
          <Tab icon={<PdfIcon size={18} />} iconPosition="start" label="Invoices" />
          <Tab icon={<CreditCardIcon size={18} />} iconPosition="start" label="Payments" />
          <Tab icon={<BarChartIcon size={18} />} iconPosition="start" label="Dashboard" />
          <Tab icon={<PdfIcon size={18} />} iconPosition="start" label="Templates" />
          <Tab icon={<EmailIcon size={18} />} iconPosition="start" label="Email Templates" />
          <Tab icon={<ClockIcon size={18} />} iconPosition="start" label="Auto-Billing" />
          <Tab icon={<SettingsIcon size={18} />} iconPosition="start" label="Settings" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <InvoiceList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewPdf={handleViewPdf}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {selectedInvoice ? (
          <PaymentManager
            invoiceId={selectedInvoice.id}
            invoiceTotal={selectedInvoice.total}
            invoiceBalance={selectedInvoice.total}
            memberId={selectedInvoice.memberId}
            onPaymentUpdate={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please select an invoice from the Invoices tab to manage payments.
          </Alert>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <InvoiceDashboard />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <InvoiceTemplate />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <EmailTemplateManager />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <AutoBillingManager />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Invoice System Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          <Alert severity="info">
            This section will contain settings for the invoice system, such as:
            <ul>
              <li>Default tax rates</li>
              <li>Invoice numbering format</li>
              <li>Payment processor configuration</li>
              <li>Email notification settings</li>
              <li>PDF generation options</li>
            </ul>
          </Alert>
        </Box>
      </TabPanel>

      {/* Invoice Form Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        </DialogTitle>
        <DialogContent>
          <InvoiceForm
            invoice={editingInvoice || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this invoice? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={isPreviewDialogOpen}
        onClose={() => setIsPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Invoice Preview</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mt: 2, p: 2, border: '1px solid #eee' }}>
              <Typography variant="h6" gutterBottom>
                Invoice #{selectedInvoice.number}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2">Member:</Typography>
                  <Typography>{selectedInvoice.member.fullName}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Date:</Typography>
                  <Typography>{new Date(selectedInvoice.createdAt).toLocaleDateString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Due Date:</Typography>
                  <Typography>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Items</Typography>
                {selectedInvoice.items.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>{item.description} (x{item.quantity})</Typography>
                    <Typography>${item.total.toFixed(2)}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>${selectedInvoice.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tax:</Typography>
                  <Typography>${selectedInvoice.tax.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <Typography>Total:</Typography>
                  <Typography>${selectedInvoice.total.toFixed(2)}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={() => {
              setIsPreviewDialogOpen(false);
              if (selectedInvoice) handleViewPdf(selectedInvoice);
            }}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EmailIcon />}
            onClick={() => {
              setIsPreviewDialogOpen(false);
              setIsEmailDialogOpen(true);
            }}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog
        open={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Invoice Email</DialogTitle>
        <DialogContent>
          {selectedInvoice ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                An email with the invoice will be sent to {selectedInvoice.member.email}
              </Alert>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Subject:</Typography>
                <Typography>Invoice #{selectedInvoice.number} from AV Gym</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Message:</Typography>
                <Typography>
                  Dear {selectedInvoice.member.fullName},<br /><br />
                  Please find attached your invoice #{selectedInvoice.number} for the amount of ${selectedInvoice.total.toFixed(2)}.
                  <br /><br />
                  Payment is due by {new Date(selectedInvoice.dueDate).toLocaleDateString()}.
                  <br /><br />
                  Thank you for your business!
                </Typography>
              </Stack>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => {
              // Implement email sending functionality
              alert(`Email would be sent to ${selectedInvoice?.member.email}`);
              setIsEmailDialogOpen(false);
            }}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
