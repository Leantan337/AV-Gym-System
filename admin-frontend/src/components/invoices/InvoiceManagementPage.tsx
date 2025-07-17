import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  ViewInAr as ViewInArIcon,
  Settings as SettingsIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { InvoiceTemplateSelector } from './InvoiceTemplateSelector';
import { InvoicePDFPreview } from './InvoicePDFPreview';
import { BulkInvoiceOperations } from './BulkInvoiceOperations';
import { InvoiceTemplate, Invoice } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';
import { useNotificationContext } from '../../contexts/NotificationContext';

interface BulkInvoiceResult {
  success: boolean;
  member_id: string;
  member_name: string;
  invoice_id?: string;
  error?: string;
}

export const InvoiceManagementPage: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkOperationsOpen, setBulkOperationsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const { success, error } = useNotificationContext();

  // Fetch invoice statistics
  const { data: invoiceStats } = useQuery({
    queryKey: ['invoiceStats'],
    queryFn: () => invoiceApi.getInvoiceStats(),
  });

  // Fetch recent invoices
  const { data: recentInvoices } = useQuery({
    queryKey: ['recentInvoices'],
    queryFn: () => invoiceApi.getInvoices({ page: 1, perPage: 5 }),
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleTemplatePreview = (template: InvoiceTemplate) => {
    setSelectedTemplate(template);
    setPreviewInvoice(null);
    setPreviewOpen(true);
  };

  const handleInvoicePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setSelectedTemplate(null);
    setPreviewOpen(true);
  };

  const handleBulkOperationComplete = (results: BulkInvoiceResult[]) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      success(`Successfully generated ${successCount} invoice${successCount !== 1 ? 's' : ''}`);
    }
    
    if (failCount > 0) {
      error(`Failed to generate ${failCount} invoice${failCount !== 1 ? 's' : ''}`);
    }
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setSelectedTemplate(null);
    setPreviewInvoice(null);
  };

  const statsCards = [
    {
      title: 'Total Invoices',
      value: invoiceStats?.totalCount || 0,
      icon: <ReceiptIcon />,
      color: 'primary',
    },
    {
      title: 'Total Amount',
      value: `$${invoiceStats?.totalAmount?.toLocaleString() || '0'}`,
      icon: <GetAppIcon />,
      color: 'success',
    },
    {
      title: 'Paid Amount',
      value: `$${invoiceStats?.paidAmount?.toLocaleString() || '0'}`,
      icon: <ViewInArIcon />,
      color: 'info',
    },
    {
      title: 'Pending Amount',
      value: `$${invoiceStats?.pendingAmount?.toLocaleString() || '0'}`,
      icon: <SettingsIcon />,
      color: 'warning',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Invoice Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setBulkOperationsOpen(true)}
          size="large"
        >
          Bulk Generate Invoices
        </Button>
      </Stack>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: `${card.color}.light`,
                      color: `${card.color}.main`,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Template Selection */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6" component="h2">
                Invoice Templates
              </Typography>
              <InvoiceTemplateSelector
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                onPreview={handleTemplatePreview}
                variant="cards"
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Recent Invoices */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Recent Invoices
            </Typography>
            <Stack spacing={2}>
              {recentInvoices?.invoices?.slice(0, 5).map((invoice) => (
                <Box key={invoice.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{invoice.number}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {invoice.member.fullName} • ${invoice.total.toFixed(2)}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: invoice.status === 'paid' ? 'success.light' : 'warning.light',
                          color: invoice.status === 'paid' ? 'success.dark' : 'warning.dark',
                          borderRadius: 1,
                        }}
                      >
                        {invoice.status}
                      </Typography>
                      <Tooltip title="Preview Invoice">
                        <IconButton
                          size="small"
                          onClick={() => handleInvoicePreview(invoice)}
                        >
                          <ViewInArIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Divider />
                </Box>
              ))}
              {(!recentInvoices?.invoices || recentInvoices.invoices.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No invoices found. Create your first invoice using bulk operations.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<ReceiptIcon />}
            onClick={() => setBulkOperationsOpen(true)}
          >
            Bulk Generate Invoices
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewInArIcon />}
            disabled={!selectedTemplateId}
          >
            Preview Selected Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<GetAppIcon />}
            disabled={!recentInvoices?.invoices?.length}
          >
            Download Recent Invoices
          </Button>
        </Stack>
      </Paper>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="bulk generate invoices"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setBulkOperationsOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* PDF Preview Modal */}
      <InvoicePDFPreview
        open={previewOpen}
        onClose={handlePreviewClose}
        invoice={previewInvoice || undefined}
        title={selectedTemplate ? `Template Preview: ${selectedTemplate.name}` : 'Invoice Preview'}
      />

      {/* Bulk Operations Modal */}
      <BulkInvoiceOperations
        open={bulkOperationsOpen}
        onClose={() => setBulkOperationsOpen(false)}
        onComplete={handleBulkOperationComplete}
      />
    </Box>
  );
};