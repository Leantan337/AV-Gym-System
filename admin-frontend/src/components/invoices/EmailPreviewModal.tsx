import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Tabs,
  Tab,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X, Send, AlertTriangle, CheckCircle, Eye, Code } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { invoiceApi } from '../../services/invoiceApi';
import { Invoice } from '../../types/invoice';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSendSuccess?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  open,
  onClose,
  invoice,
  onSendSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [previewMode, setPreviewMode] = useState(0); // 0: Preview, 1: HTML
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (invoice) {
      setEmail(invoice.member.email || '');
      setEmailSubject(`Invoice #${invoice.number} from AV Gym`);
      
      // In a real implementation, you would fetch a template and populate it
      setEmailBody(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px; background-color: #f8f9fa; text-align: center;">
            <h1 style="color: #1976d2;">AV Gym</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear ${invoice.member.fullName},</p>
            <p>Please find attached your invoice #${invoice.number} for the amount of $${invoice.total.toFixed(2)}.</p>
            <p>The invoice is due on ${new Date(invoice.dueDate).toLocaleDateString()}.</p>
            <p>You can view your invoice details and make a payment by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Invoice</a>
            </div>
            <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
            <p>Thank you for choosing AV Gym!</p>
            <p>Best regards,<br>AV Gym Billing Team</p>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; text-align: center; font-size: 12px; color: #666;">
            <p>AV Gym | 123 Fitness Street, Workout City, WO 12345 | (123) 456-7890</p>
          </div>
        </div>
      `);
    }
  }, [invoice]);

  const sendEmailMutation = useMutation({
    mutationFn: ({ invoiceId, email }: { invoiceId: string; email: string }) =>
      invoiceApi.sendInvoiceEmail(invoiceId, email),
    onSuccess: () => {
      onSendSuccess?.();
      onClose();
    },
  });

  const handleSendEmail = () => {
    // Validate email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    if (invoice) {
      sendEmailMutation.mutate({ invoiceId: invoice.id, email });
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setPreviewMode(newValue);
  };

  if (!invoice) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      aria-labelledby="email-preview-dialog-title"
    >
      <DialogTitle id="email-preview-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Email Preview: Invoice #{invoice.number}</Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <X />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {sendEmailMutation.isError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => sendEmailMutation.reset()}
              >
                <X fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTriangle size={16} style={{ marginRight: 8 }} />
            Failed to send email: {(sendEmailMutation.error as Error)?.message || 'Unknown error'}
          </Alert>
        )}

        {validationError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setValidationError(null)}
              >
                <X fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTriangle size={16} style={{ marginRight: 8 }} />
            {validationError}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recipient
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setValidationError(null);
            }}
            placeholder="Enter email address"
            disabled={sendEmailMutation.isPending}
            error={!!validationError}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Subject
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            disabled={sendEmailMutation.isPending}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={previewMode} onChange={handleTabChange} aria-label="email preview tabs">
              <Tab icon={<Eye size={16} />} label="Preview" />
              <Tab icon={<Code size={16} />} label="HTML" />
            </Tabs>
          </Box>

          <TabPanel value={previewMode} index={0}>
            <Paper 
              variant="outlined" 
              sx={{ 
                height: 400, 
                overflow: 'auto', 
                p: 0,
                bgcolor: 'background.default'
              }}
            >
              <Box sx={{ p: 0 }}>
                <div dangerouslySetInnerHTML={{ __html: emailBody }} />
              </Box>
            </Paper>
          </TabPanel>

          <TabPanel value={previewMode} index={1}>
            <Paper variant="outlined" sx={{ height: 400, overflow: 'auto' }}>
              <TextField
                multiline
                fullWidth
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                variant="outlined"
                InputProps={{
                  style: { 
                    fontFamily: 'monospace', 
                    fontSize: 14,
                    height: '100%'
                  }
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    height: '100%', 
                    '& textarea': { 
                      height: '100% !important' 
                    } 
                  } 
                }}
              />
            </Paper>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={sendEmailMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSendEmail}
          variant="contained"
          color="primary"
          disabled={sendEmailMutation.isPending}
          startIcon={sendEmailMutation.isPending ? <CircularProgress size={20} /> : <Send size={16} />}
        >
          {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
