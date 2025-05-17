import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { FileDown, AlertTriangle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { invoiceApi } from '../../services/invoiceApi';
import { Invoice } from '../../types/invoice';

interface InvoicePDFDownloadButtonProps {
  invoice: Invoice;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'default';
  label?: string;
  showLabel?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const InvoicePDFDownloadButton: React.FC<InvoicePDFDownloadButtonProps> = ({
  invoice,
  variant = 'button',
  size = 'medium',
  color = 'primary',
  label = 'Download PDF',
  showLabel = true,
  onSuccess,
  onError,
}) => {
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: invoiceApi.downloadInvoicePdf,
    onSuccess: (blob) => {
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to download PDF');
      setErrorModalOpen(true);
      onError?.(error);
    },
  });

  const handleDownload = () => {
    downloadPdfMutation.mutate(invoice.id);
  };

  const handleCloseErrorModal = () => {
    setErrorModalOpen(false);
    downloadPdfMutation.reset();
  };

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={label}>
          <IconButton
            onClick={handleDownload}
            disabled={downloadPdfMutation.isPending}
            color={color === 'default' ? 'default' : color}
            size={size}
            aria-label={label}
          >
            {downloadPdfMutation.isPending ? (
              <CircularProgress size={size === 'small' ? 16 : 24} />
            ) : (
              <FileDown size={size === 'small' ? 16 : 24} />
            )}
          </IconButton>
        </Tooltip>

        <Dialog open={errorModalOpen} onClose={handleCloseErrorModal}>
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <Alert severity="error" icon={<AlertTriangle />}>
              {errorMessage}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseErrorModal}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        color={color === 'default' ? 'inherit' : color}
        onClick={handleDownload}
        disabled={downloadPdfMutation.isPending}
        size={size}
        startIcon={downloadPdfMutation.isPending ? <CircularProgress size={16} /> : <FileDown />}
      >
        {showLabel && (downloadPdfMutation.isPending ? 'Downloading...' : label)}
      </Button>

      <Dialog open={errorModalOpen} onClose={handleCloseErrorModal}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertTriangle color="#d32f2f" />
            <Typography color="error.main">Download Failed</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            An error occurred while trying to download the invoice PDF.
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
            <Typography variant="body2" fontFamily="monospace">
              {errorMessage}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorModal}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              handleCloseErrorModal();
              setTimeout(() => handleDownload(), 500);
            }}
          >
            Try Again
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
