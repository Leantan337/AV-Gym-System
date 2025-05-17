import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmailIcon from '@mui/icons-material/Email';
import PreviewIcon from '@mui/icons-material/Preview';
import TestIcon from '@mui/icons-material/BugReport';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import GridItem from '../common/GridItem';
import { ExtendedGridProps } from '../../types/mui.types';

interface Template {
  id: string;
  name: string;
  notification_type: string;
}

interface TestRecipient {
  id: string;
  name: string;
  email: string;
}

interface TestResult {
  subject: string;
  body_text: string;
  body_html?: string;
  data_used: Record<string, any>;
}

const defaultTestData = {
  member_name: 'John Doe',
  member_id: 'MEM12345',
  current_date: new Date().toISOString().split('T')[0],
  gym_name: 'AV Gym',
  gym_address: '123 Fitness St, Gymville',
  gym_phone: '555-123-4567',
  gym_email: 'info@avgym.com',
  dashboard_url: 'https://avgym.com/dashboard',
  plan_name: 'Premium Membership',
  subscription_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  days_remaining: '30',
  subscription_id: 'SUB98765',
  days_before_expiry: '30'
};

const TemplateTestingTool: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testData, setTestData] = useState<Record<string, string>>(defaultTestData);
  const [recipients, setRecipients] = useState<TestRecipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [previewTab, setPreviewTab] = useState<number>(0);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<'preview' | 'send'>('preview');
  
  useEffect(() => {
    fetchTemplates();
    fetchTestRecipients();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/notifications/templates/');
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load notification templates');
    }
  };

  const fetchTestRecipients = async () => {
    try {
      // In a real implementation, this might fetch staff users or test accounts
      // For now, we'll use mock data
      setRecipients([
        { id: '1', name: 'Test User 1', email: 'test1@example.com' },
        { id: '2', name: 'Test User 2', email: 'test2@example.com' },
      ]);
    } catch (err) {
      console.error('Error fetching test recipients:', err);
      setError('Failed to load test recipients');
    }
  };

  const handleTestDataChange = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  const handleTestTemplate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      if (testMode === 'preview') {
        const response = await axios.post(
          `/api/notifications/templates/${selectedTemplate}/preview/`,
          { sample_data: testData }
        );
        
        setTestResult(response.data);
        setShowPreview(true);
      } else {
        // In a real implementation, this would send a test email
        // For now, we'll just simulate it
        if (!selectedRecipient) {
          setError('Please select a test recipient');
          setLoading(false);
          return;
        }
        
        const recipient = recipients.find(r => r.id === selectedRecipient);
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error testing template:', err);
      setError('Failed to test template. Please check for syntax errors.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleResetTestData = () => {
    setTestData(defaultTestData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" color="primary" gutterBottom>
        Template Testing Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test notification templates with custom data before sending to members.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Success</AlertTitle>
          Test email sent successfully!
        </Alert>
      )}
      
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Test Mode
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant={testMode === 'preview' ? 'contained' : 'outlined'}
            startIcon={<PreviewIcon />}
            onClick={() => setTestMode('preview')}
          >
            Preview Only
          </Button>
          <Button 
            variant={testMode === 'send' ? 'contained' : 'outlined'}
            startIcon={<EmailIcon />}
            onClick={() => setTestMode('send')}
          >
            Send Test Email
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <GridItem item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Template</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as string)}
              label="Template"
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name} ({template.notification_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </GridItem>
        
        {testMode === 'send' && (
          <GridItem item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Test Recipient</InputLabel>
              <Select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value as string)}
                label="Test Recipient"
              >
                {recipients.map((recipient) => (
                  <MenuItem key={recipient.id} value={recipient.id}>
                    {recipient.name} ({recipient.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </GridItem>
        )}
      </Grid>
      
      <Box mt={4}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Test Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {Object.entries(testData).map(([key, value]) => (
                <GridItem item xs={12} sm={6} md={4} key={key}>
                  <TextField
                    fullWidth
                    label={key}
                    value={value}
                    onChange={(e) => handleTestDataChange(key, e.target.value)}
                    variant="outlined"
                    margin="normal"
                  />
                </GridItem>
              ))}
              
              <GridItem item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button 
                    onClick={handleResetTestData}
                    variant="outlined"
                    sx={{ mt: 2 }}
                  >
                    Reset to Default Data
                  </Button>
                </Box>
              </GridItem>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>
      
      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="contained"
          color="primary"
          startIcon={testMode === 'preview' ? <PreviewIcon /> : <TestIcon />}
          onClick={handleTestTemplate}
          disabled={loading || !selectedTemplate || (testMode === 'send' && !selectedRecipient)}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : testMode === 'preview' ? (
            'Preview Template'
          ) : (
            'Send Test Email'
          )}
        </Button>
      </Box>
      
      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Email Preview
          <IconButton
            aria-label="close"
            onClick={handleClosePreview}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {testResult ? (
            <Box>
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight="bold">Subject:</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f8f8' }}>
                  <Typography>{testResult.subject}</Typography>
                </Paper>
              </Box>
              
              <Tabs value={previewTab} onChange={(e, val) => setPreviewTab(val)}>
                <Tab label="Text Version" />
                {testResult.body_html && <Tab label="HTML Version" />}
              </Tabs>
              
              <Box mt={2} p={2} border="1px solid #e0e0e0" borderRadius={1}>
                {previewTab === 0 && (
                  <Box sx={{ whiteSpace: 'pre-line' }}>
                    <Typography>{testResult.body_text}</Typography>
                  </Box>
                )}
                
                {previewTab === 1 && testResult.body_html && (
                  <Box
                    dangerouslySetInnerHTML={{ __html: testResult.body_html }}
                    sx={{ 
                      '& a': { color: 'primary.main' },
                      '& img': { maxWidth: '100%' }
                    }}
                  />
                )}
              </Box>
              
              <Box mt={3}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Data Used:</Typography>
                <Box maxHeight="200px" overflow="auto" bgcolor="#f5f5f5" p={2} borderRadius={1}>
                  <pre>
                    {JSON.stringify(testResult.data_used, null, 2)}
                  </pre>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TemplateTestingTool;
