import React, { useState, Dispatch, SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { invoiceApi } from '../../services/invoiceApi';
import {
  Invoice,
  CreateInvoiceData,
  InvoiceListResponse,
} from '../../types/invoice';
import { InvoiceManagementPage } from './InvoiceManagementPage';

// Define local types
type TabValue = 'invoices' | 'templates' | 'management';

interface TabPanelProps {
  children?: React.ReactNode;
  index: TabValue;
  value: TabValue;
}

interface DialogState {
  isCreateOpen: boolean;
  isPreviewOpen: boolean;
  isConfirmDeleteOpen: boolean;
  isEmailOpen: boolean;
  selectedInvoice: Invoice | null;
  editingInvoice: Invoice | null;
}

// Tab Panel component for organizing content
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`invoice-tabpanel-${index}`}
      aria-labelledby={`invoice-tab-${index}`}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
};

// Helper function for tab accessibility
function a11yProps(index: TabValue) {
  return {
    id: `invoice-tab-${index}`,
    'aria-controls': `invoice-tabpanel-${index}`,
  };
}

// Invoice Form component
const InvoiceForm: React.FC<{
  onSubmit: (data: CreateInvoiceData) => void;
  initialData?: Invoice | null;
}> = ({ onSubmit, initialData }) => {
  // This would be replaced with a proper form implementation
  return (
    <Box p={2}>
      <Typography variant="h6">
        {initialData ? 'Edit Invoice' : 'Create New Invoice'}
      </Typography>
      <Button
        variant="contained"
        onClick={() =>
          onSubmit({
            memberId: initialData?.memberId || 'member-1',
            items: [
              {
                description: 'Mock item',
                quantity: 1,
                unitPrice: 100,
              },
            ],
            dueDate: new Date().toISOString().split('T')[0],
            notes: initialData?.notes,
            templateId: initialData?.templateId || 'template-1',
          })
        }
      >
        {initialData ? 'Update' : 'Create'}
      </Button>
    </Box>
  );
};

// InvoiceList component
const InvoiceList: React.FC<{
  invoices: Invoice[];
  onPreview: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onEmail: (invoice: Invoice) => void;
  onViewPdf: (invoice: Invoice) => void;
  selectedIds: string[];
  onSelectedIdsChange: Dispatch<SetStateAction<string[]>>;
}> = ({
  invoices,
  onPreview,
  onEdit,
  onDelete,
  onEmail,
  onViewPdf,
  selectedIds,
  onSelectedIdsChange,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedIds.length > 0 && selectedIds.length < invoices.length}
                checked={invoices.length > 0 && selectedIds.length === invoices.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectedIdsChange(invoices.map((invoice) => invoice.id));
                  } else {
                    onSelectedIdsChange([]);
                  }
                }}
              />
            </TableCell>
            <TableCell>Number</TableCell>
            <TableCell>Member</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body1">No invoices found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(invoice.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectedIdsChange([...selectedIds, invoice.id]);
                      } else {
                        onSelectedIdsChange(selectedIds.filter((id) => id !== invoice.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{invoice.number}</TableCell>
                <TableCell>{invoice.member.fullName}</TableCell>
                <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>${invoice.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Tooltip title="Preview">
                    <IconButton onClick={() => onPreview(invoice)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(invoice)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton onClick={() => onViewPdf(invoice)}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send Email">
                    <IconButton onClick={() => onEmail(invoice)}>
                      <EmailIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => onDelete(invoice)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Main InvoicePage component
export const InvoicePage: React.FC = () => {
  const [tabValue, setTabValue] = useState<TabValue>('invoices');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>({
    isCreateOpen: false,
    isPreviewOpen: false,
    isConfirmDeleteOpen: false,
    isEmailOpen: false,
    selectedInvoice: null,
    editingInvoice: null
  });

  const queryClient = useQueryClient();

  // Query to fetch invoices
  const { data: invoiceResponse, isLoading } = useQuery<InvoiceListResponse>({
    queryKey: ['invoices'],
    queryFn: () => invoiceApi.getInvoices()
  });
  
  const invoices = invoiceResponse?.invoices || [];

  // Mutation for bulk status updates
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: Invoice['status'] }) =>
      invoiceApi.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedIds([]);
    }
  });

  // Mutation for bulk PDF generation
  const bulkGeneratePdfMutation = useMutation({
    mutationFn: (ids: string[]) => invoiceApi.bulkGeneratePdf(ids),
    onSuccess: () => {
      setSelectedIds([]);
    }
  });

  // Handle tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setTabValue(newValue);
  };

  // Handle bulk actions (PDF, mark as paid, mark as cancelled)
  const handleBulkAction = (action: 'pdf' | 'paid' | 'cancelled') => {
    if (selectedIds.length === 0) return;

    if (action === 'pdf') {
      bulkGeneratePdfMutation.mutate(selectedIds);
    } else {
      bulkUpdateStatusMutation.mutate({
        ids: selectedIds,
        status: action === 'paid' ? 'paid' : 'cancelled'
      });
    }
  };

  // View PDF for a single invoice
  const handleViewPdf = async (invoice: Invoice) => {
    try {
      const pdfUrl = await invoiceApi.generatePdf(invoice.id);
      // Open the PDF in a new tab
      const blob = new Blob([pdfUrl], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Send email for a single invoice
  const handleEmailInvoice = async () => {
    if (!dialogState.selectedInvoice) return;

    try {
      await invoiceApi.sendInvoiceEmail(dialogState.selectedInvoice.id);
      setDialogState(prev => ({ ...prev, isEmailOpen: false }));
      // Show success message (could be implemented with Snackbar)
    } catch (error) {
      console.error('Error sending email:', error);
      // Show error message
    }
  };

  // Open preview dialog
  const handlePreview = (invoice: Invoice) => {
    setDialogState(prev => ({
      ...prev,
      isPreviewOpen: true,
      selectedInvoice: invoice
    }));
  };

  // Open edit dialog
  const handleEdit = (invoice: Invoice) => {
    setDialogState(prev => ({
      ...prev,
      isCreateOpen: true,
      editingInvoice: invoice
    }));
  };

  // Open delete confirmation dialog
  const handleDelete = (invoice: Invoice) => {
    setDialogState(prev => ({
      ...prev,
      isConfirmDeleteOpen: true,
      selectedInvoice: invoice
    }));
  };

  // Handle email dialog
  const handleEmail = (invoice: Invoice) => {
    setDialogState(prev => ({
      ...prev,
      isEmailOpen: true,
      selectedInvoice: invoice
    }));
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (!dialogState.selectedInvoice) return;

    try {
      await invoiceApi.deleteInvoice(dialogState.selectedInvoice.id);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDialogState(prev => ({ ...prev, isConfirmDeleteOpen: false }));
      // Show success message
    } catch (error) {
      console.error('Error deleting invoice:', error);
      // Show error message
    }
  };

  // Close form dialog
  const handleCloseForm = () => {
    setDialogState(prev => ({
      ...prev,
      isCreateOpen: false,
      editingInvoice: null
    }));
  };

  // Submit form data (create or update)
  const handleSubmit = async (data: CreateInvoiceData) => {
    try {
      if (dialogState.editingInvoice) {
        await invoiceApi.updateInvoice(dialogState.editingInvoice.id, data);
      } else {
        await invoiceApi.createInvoice(data);
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleCloseForm();
      // Show success message
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Show error message
    }
  };

  // Open create invoice dialog
  const handleCreateInvoice = () => {
    setDialogState(prev => ({
      ...prev,
      isCreateOpen: true,
      editingInvoice: null
    }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Invoices</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateInvoice}
          >
            Create Invoice
          </Button>
        </Box>

        <Tabs value={tabValue} onChange={handleTabChange} aria-label="invoice tabs">
          <Tab label="Invoices" value="invoices" {...a11yProps('invoices')} />
          <Tab label="Templates" value="templates" {...a11yProps('templates')} />
          <Tab 
            label="Management" 
            value="management" 
            {...a11yProps('management')} 
            icon={<SettingsIcon />}
          />
        </Tabs>
      </Paper>

      {selectedIds.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body1">
              {selectedIds.length} {selectedIds.length === 1 ? 'invoice' : 'invoices'} selected
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleBulkAction('pdf')}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleBulkAction('paid')}
            >
              Mark as Paid
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleBulkAction('cancelled')}
            >
              Mark as Cancelled
            </Button>
          </Stack>
        </Paper>
      )}

      <TabPanel value={tabValue} index="invoices">
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <InvoiceList
            invoices={invoices}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEmail={handleEmail}
            onViewPdf={handleViewPdf}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index="templates">
        <Typography variant="h6">Invoice Templates</Typography>
        <Typography variant="body1">Template management will be implemented here.</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index="management">
        <InvoiceManagementPage />
      </TabPanel>

      {/* Create/Edit Invoice Dialog */}
      <Dialog
        open={dialogState.isCreateOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogState.editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
        </DialogTitle>
        <DialogContent>
          <InvoiceForm
            onSubmit={handleSubmit}
            initialData={dialogState.editingInvoice}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Invoice Dialog */}
      <Dialog
        open={dialogState.isPreviewOpen}
        onClose={() => setDialogState(prev => ({ ...prev, isPreviewOpen: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview Invoice</DialogTitle>
        <DialogContent>
          {dialogState.selectedInvoice && (
            <Box p={2}>
              <Typography variant="h6">{dialogState.selectedInvoice.number}</Typography>
              <Typography>Member: {dialogState.selectedInvoice.member.fullName}</Typography>
              <Typography>Status: {dialogState.selectedInvoice.status}</Typography>
              <Typography>Date: {new Date(dialogState.selectedInvoice.createdAt).toLocaleDateString()}</Typography>
              <Typography>Due Date: {new Date(dialogState.selectedInvoice.dueDate).toLocaleDateString()}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>Items</Typography>
              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dialogState.selectedInvoice.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">${item.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell align="right">${item.total?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">Subtotal</TableCell>
                      <TableCell align="right">${dialogState.selectedInvoice.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">Tax</TableCell>
                      <TableCell align="right">${dialogState.selectedInvoice.tax.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right"><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>${dialogState.selectedInvoice.total.toFixed(2)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              {dialogState.selectedInvoice.notes && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>Notes</Typography>
                  <Typography>{dialogState.selectedInvoice.notes}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogState(prev => ({ ...prev, isPreviewOpen: false }))}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (dialogState.selectedInvoice) {
                handleViewPdf(dialogState.selectedInvoice);
              }
            }}
            color="primary"
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Invoice Dialog */}
      <Dialog
        open={dialogState.isEmailOpen}
        onClose={() => setDialogState(prev => ({ ...prev, isEmailOpen: false }))}
      >
        <DialogTitle>Send Invoice</DialogTitle>
        <DialogContent>
          {dialogState.selectedInvoice && (
            <Typography>
              Send invoice {dialogState.selectedInvoice.number} to {dialogState.selectedInvoice.member.email}?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogState(prev => ({ ...prev, isEmailOpen: false }))}>
            Cancel
          </Button>
          <Button
            onClick={handleEmailInvoice}
            color="primary"
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={dialogState.isConfirmDeleteOpen}
        onClose={() => setDialogState(prev => ({ ...prev, isConfirmDeleteOpen: false }))}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {dialogState.selectedInvoice && (
            <Typography>
              Are you sure you want to delete invoice {dialogState.selectedInvoice.number}?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogState(prev => ({ ...prev, isConfirmDeleteOpen: false }))}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};