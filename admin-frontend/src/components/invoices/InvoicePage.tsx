import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Stack,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus as PlusIcon, FileDown as DownloadIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceTemplate } from './InvoiceTemplate';
import { Invoice, CreateInvoiceData } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';

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
  const [activeTab, setActiveTab] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: invoiceApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateInvoiceData }) =>
      invoiceApi.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: invoiceApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateNew = () => {
    setSelectedInvoice(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = (invoice: Invoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedInvoice(undefined);
  };

  const handleSubmit = (data: CreateInvoiceData) => {
    if (selectedInvoice) {
      updateMutation.mutate({ id: selectedInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleViewPdf = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.generatePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleBulkExport = async () => {
    try {
      const blob = await invoiceApi.bulkGeneratePdf([]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoices.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
        <Typography variant="h5">Invoices</Typography>
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Invoices" />
          <Tab label="Templates" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <InvoiceList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewPdf={handleViewPdf}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <InvoiceTemplate />
      </TabPanel>

      {/* Invoice Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <InvoiceForm
              invoice={selectedInvoice}
              onSubmit={handleSubmit}
              onCancel={handleCloseForm}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
