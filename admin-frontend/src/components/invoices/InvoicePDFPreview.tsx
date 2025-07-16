import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { invoiceApi } from '../../services/invoiceApi';
import { Invoice, CreateInvoiceData } from '../../types/invoice';

interface InvoicePDFPreviewProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice;
  invoiceData?: CreateInvoiceData;
  onEdit?: () => void;
  onDownload?: () => void;
  title?: string;
  showEditButton?: boolean;
  showDownloadButton?: boolean;
  showPrintButton?: boolean;
}

export const InvoicePDFPreview: React.FC<InvoicePDFPreviewProps> = ({
  open,
  onClose,
  invoice,
  invoiceData,
  onEdit,
  onDownload,
  title = 'Invoice Preview',
  showEditButton = true,
  showDownloadButton = true,
  showPrintButton = true,
}) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate PDF for preview
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      if (invoice) {
        // For existing invoice, get PDF
        return invoiceApi.generatePdf(invoice.id);
      } else if (invoiceData) {
        // For new invoice, create it first then get PDF
        const newInvoice = await invoiceApi.createInvoice(invoiceData);
        return invoiceApi.generatePdf(newInvoice.id);
      }
      throw new Error('No invoice data provided');
    },
    onSuccess: (blob) => {
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setError(null);
    },
    onError: (error) => {
      setError(error.message || 'Failed to generate PDF preview');
      setPdfBlob(null);
      setPdfUrl(null);
    },
  });

  // Download PDF
  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      if (invoice) {
        return invoiceApi.downloadInvoicePdf(invoice.id);
      } else if (pdfBlob) {
        return pdfBlob;
      }
      throw new Error('No PDF available for download');
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.number || 'preview'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onDownload?.();
    },
    onError: (error) => {
      setError(error.message || 'Failed to download PDF');
    },
  });

  // Generate PDF when dialog opens
  useEffect(() => {
    if (open && (invoice || invoiceData)) {
      generatePdfMutation.mutate();
    }
  }, [open, invoice, invoiceData]);

  // Cleanup URL when dialog closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleDownload = () => {
    downloadPdfMutation.mutate();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleClose = () => {
    setError(null);
    setPdfBlob(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setIsFullscreen(false);
    onClose();
  };

  const isLoading = generatePdfMutation.isPending || downloadPdfMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isFullscreen ? false : 'lg'}
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          height: isFullscreen ? '100vh' : '90vh',
          minHeight: '600px',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Stack direction="row" spacing={1}>
            {showEditButton && (
              <Tooltip title="Edit Invoice">
                <IconButton onClick={onEdit} disabled={isLoading}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            {showPrintButton && (
              <Tooltip title="Print">
                <IconButton onClick={handlePrint} disabled={isLoading || !pdfUrl}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            )}
            {showDownloadButton && (
              <Tooltip title="Download PDF">
                <IconButton onClick={handleDownload} disabled={isLoading}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={toggleFullscreen} disabled={isLoading}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              minHeight: '400px',
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={48} />
              <Typography variant="body1">
                {generatePdfMutation.isPending ? 'Generating PDF preview...' : 'Processing...'}
              </Typography>
            </Stack>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert 
              severity="error" 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => generatePdfMutation.mutate()}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {pdfUrl && !isLoading && (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <iframe
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                minHeight: '500px',
              }}
              title="Invoice PDF Preview"
            />
          </Box>
        )}

        {!pdfUrl && !isLoading && !error && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              minHeight: '400px',
            }}
          >
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Preview Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unable to generate PDF preview. Please try again.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => generatePdfMutation.mutate()}
                sx={{ mt: 2 }}
              >
                Generate Preview
              </Button>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {!isFullscreen && (
        <>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Close
            </Button>
            {showEditButton && (
              <Button
                onClick={onEdit}
                variant="outlined"
                startIcon={<EditIcon />}
                disabled={isLoading}
              >
                Edit Invoice
              </Button>
            )}
            {showDownloadButton && (
              <Button
                onClick={handleDownload}
                variant="contained"
                startIcon={<DownloadIcon />}
                disabled={isLoading}
              >
                Download PDF
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};