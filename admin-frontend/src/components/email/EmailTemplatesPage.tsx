import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
  TextField,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  ContentCopy as DuplicateIcon,
} from '@mui/icons-material';
import { EmailTemplate, emailService, EmailStatus } from '../../services/emailService';
import EmailTemplateEditor from './EmailTemplateEditor';
import { useAuth, UserRole } from '../../contexts/AuthContext';

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
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Email Templates Management Page
 * Allows users to manage email templates, test emails, and view email logs
 */
const EmailTemplatesPage: React.FC = () => {
  const { user, checkRole } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentFilter, setCurrentFilter] = useState<EmailTemplate['type'] | 'all'>('all');
  
  // Editor state
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | undefined>(undefined);
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  
  // Test email state
  const [testEmailOpen, setTestEmailOpen] = useState<boolean>(false);
  const [testEmailTo, setTestEmailTo] = useState<string>('');
  const [testEmailSending, setTestEmailSending] = useState<boolean>(false);
  const [testEmailTemplate, setTestEmailTemplate] = useState<EmailTemplate | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  
  // Email logs state
  const [emailLogs, setEmailLogs] = useState<EmailStatus[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  
  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
    if (activeTab === 1) {
      loadEmailLogs();
    }
  }, [activeTab]);
  
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await emailService.getTemplates();
      setTemplates(result);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load email templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadEmailLogs = async () => {
    try {
      setLogsLoading(true);
      const result = await emailService.getEmailHistory();
      setEmailLogs(result);
    } catch (err) {
      console.error('Error loading email logs:', err);
      setError('Failed to load email logs. Please try again.');
    } finally {
      setLogsLoading(false);
    }
  };
  
  const handleTemplateCreated = (template: EmailTemplate) => {
    setTemplates(prev => [...prev, template]);
    setEditorOpen(false);
    setSuccess('Email template created successfully!');
  };
  
  const handleTemplateUpdated = (template: EmailTemplate) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    setEditorOpen(false);
    setSuccess('Email template updated successfully!');
  };
  
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      await emailService.deleteTemplate(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setSuccess('Email template deleted successfully!');
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    } finally {
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };
  
  const confirmDeleteTemplate = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };
  
  const openTemplateEditor = (templateId?: string) => {
    setCurrentTemplateId(templateId);
    setEditorOpen(true);
  };
  
  const openPreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };
  
  const openTestEmail = (template: EmailTemplate) => {
    setTestEmailTemplate(template);
    setTestEmailTo('');
    setTestEmailOpen(true);
  };
  
  const handleSendTestEmail = async () => {
    if (!testEmailTemplate || !testEmailTo) return;
    
    try {
      setTestEmailSending(true);
      
      // Generate sample data for test email
      const testData: Record<string, string> = {};
      if (testEmailTemplate.type === 'invoice') {
        testData.member_name = 'Test Member';
        testData.invoice_number = 'TEST-INV-123';
        testData.invoice_date = new Date().toISOString().split('T')[0];
        testData.invoice_amount = '$99.99';
        testData.due_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else if (testEmailTemplate.type === 'welcome') {
        testData.member_name = 'Test Member';
        testData.gym_name = 'AV Fitness Center';
        testData.membership_type = 'Premium Membership';
        testData.start_date = new Date().toISOString().split('T')[0];
      }
      
      // Replace template variables with test data
      let bodyHtml = testEmailTemplate.bodyHtml;
      let bodyText = testEmailTemplate.bodyText;
      let subject = testEmailTemplate.subject;
      
      Object.entries(testData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        bodyHtml = bodyHtml.replace(regex, value);
        bodyText = bodyText.replace(regex, value);
        subject = subject.replace(regex, value);
      });
      
      // Send test email
      await emailService.sendEmail({
        to: testEmailTo,
        subject: `[TEST] ${subject}`,
        bodyHtml,
        bodyText,
      });
      
      setSuccess(`Test email sent to ${testEmailTo} successfully!`);
      setTestEmailOpen(false);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError('Failed to send test email. Please check the email configuration.');
    } finally {
      setTestEmailSending(false);
    }
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const getFilteredTemplates = () => {
    if (currentFilter === 'all') {
      return templates;
    }
    return templates.filter(template => template.type === currentFilter);
  };
  
  const handleFilterChange = (filter: EmailTemplate['type'] | 'all') => {
    setCurrentFilter(filter);
  };
  
  const renderTemplateCards = () => {
    const filteredTemplates = getFilteredTemplates();
    
    if (filteredTemplates.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No email templates found. Create a new template to get started.
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {filteredTemplates.map(template => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>{template.name}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Subject: {template.subject}
                </Typography>
                <Chip 
                  label={template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                  size="small"
                  color={
                    template.type === 'invoice' ? 'primary' :
                    template.type === 'receipt' ? 'success' :
                    template.type === 'reminder' ? 'warning' :
                    template.type === 'welcome' ? 'info' : 'default'
                  }
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                  Last Updated: {new Date(template.updatedAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => openPreview(template)}>
                  <ViewIcon />
                </IconButton>
                <IconButton size="small" onClick={() => openTemplateEditor(template.id)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => openTestEmail(template)}>
                  <EmailIcon />
                </IconButton>
                {isAdmin && (
                  <IconButton size="small" onClick={() => confirmDeleteTemplate(template)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  const renderEmailLogs = () => {
    if (logsLoading) {
      return (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (emailLogs.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No email logs found.
        </Alert>
      );
    }
    
    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Recipient</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emailLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell>{log.recipient}</TableCell>
                <TableCell>{log.subject}</TableCell>
                <TableCell>
                  <Chip
                    label={log.status}
                    size="small"
                    color={
                      log.status === 'sent' ? 'success' :
                      log.status === 'failed' ? 'error' : 'warning'
                    }
                  />
                </TableCell>
                <TableCell>
                  {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {log.status === 'failed' && (
                    <IconButton
                      size="small"
                      onClick={async () => {
                        try {
                          await emailService.resendEmail(log.id);
                          await loadEmailLogs();
                          setSuccess('Email resent successfully!');
                        } catch (err) {
                          console.error('Error resending email:', err);
                          setError('Failed to resend email. Please try again.');
                        }
                      }}
                    >
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Email Management</Typography>
      
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Email Templates" />
        <Tab label="Email Logs" />
        <Tab label="SMTP Configuration" />
      </Tabs>
      
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openTemplateEditor()}
            >
              Create New Template
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant={currentFilter === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('all')}
            >
              All
            </Button>
            <Button 
              variant={currentFilter === 'invoice' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('invoice')}
            >
              Invoice
            </Button>
            <Button 
              variant={currentFilter === 'receipt' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('receipt')}
            >
              Receipt
            </Button>
            <Button 
              variant={currentFilter === 'reminder' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('reminder')}
            >
              Reminder
            </Button>
            <Button 
              variant={currentFilter === 'welcome' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('welcome')}
            >
              Welcome
            </Button>
            <Button 
              variant={currentFilter === 'other' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterChange('other')}
            >
              Other
            </Button>
          </Box>
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          renderTemplateCards()
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>Email Delivery Logs</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          View the status of all emails sent from the system. You can resend failed emails if needed.
        </Typography>
        
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />} 
          onClick={loadEmailLogs}
          sx={{ mb: 2 }}
        >
          Refresh Logs
        </Button>
        
        {renderEmailLogs()}
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>SMTP Configuration</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure the SMTP settings for sending emails from the system.
          These settings are managed by system administrators.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Current provider: <strong>SendGrid</strong>
          <br />
          Status: <Chip label="Connected" color="success" size="small" sx={{ ml: 1 }} />
        </Alert>
        
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Host"
                value="smtp.sendgrid.net"
                disabled={!isAdmin}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Port"
                value="587"
                disabled={!isAdmin}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value="apikey"
                disabled={!isAdmin}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value="••••••••••••••••••••••••••••••••"
                disabled={!isAdmin}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From Email"
                value="noreply@avgym.com"
                disabled={!isAdmin}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From Name"
                value="AV Fitness Center"
                disabled={!isAdmin}
              />
            </Grid>
          </Grid>
          
          {isAdmin && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined">Test Connection</Button>
              <Button variant="contained">Save Configuration</Button>
            </Box>
          )}
        </Paper>
      </TabPanel>
      
      {/* Template Editor Dialog */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          <EmailTemplateEditor
            templateId={currentTemplateId}
            onSave={currentTemplateId ? handleTemplateUpdated : handleTemplateCreated}
            onCancel={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Template Preview: {previewTemplate?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            Subject: {previewTemplate?.subject}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box 
            dangerouslySetInnerHTML={{ __html: previewTemplate?.bodyHtml || '' }}
            sx={{ minHeight: '300px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {previewTemplate && (
            <Button 
              color="primary" 
              onClick={() => {
                setPreviewOpen(false);
                openTestEmail(previewTemplate);
              }}
            >
              Send Test Email
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Test Email Dialog */}
      <Dialog
        open={testEmailOpen}
        onClose={() => setTestEmailOpen(false)}
      >
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Template: {testEmailTemplate?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Send a test email using this template with sample data.
          </Typography>
          <TextField
            label="Recipient Email"
            fullWidth
            margin="normal"
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
            required
            type="email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendTestEmail}
            disabled={!testEmailTo || testEmailSending}
            startIcon={testEmailSending && <CircularProgress size={20} />}
          >
            {testEmailSending ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template &quot;{templateToDelete?.name}&quot;?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteTemplate}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmailTemplatesPage;
