import React, { useState, useEffect } from 'react';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Typography,
  Paper,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Switch,
  FormControlLabel,
  AlertTitle,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

enum NotificationType {
  MEMBERSHIP_EXPIRY = 'MEMBERSHIP_EXPIRY',
  PAYMENT_DUE = 'PAYMENT_DUE',
  GENERAL = 'GENERAL'
}

interface Template {
  id: string;
  name: string;
  notification_type: NotificationType;
  subject: string;
  body_text: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Settings {
  id: string;
  notification_type: NotificationType;
  template: string | null;
  is_email_enabled: boolean;
  is_dashboard_enabled: boolean;
  days_before_expiry: number[];
}

const NotificationTemplateEditor: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Partial<Template>>({});
  const [settingsFormData, setSettingsFormData] = useState<Partial<Settings>>({});
  const [previewData, setPreviewData] = useState<null | {
    subject: string;
    body_text: string;
    body_html?: string;
    sample_data: Record<string, string>;
  }>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<number>(0);
  
  // Available template variables
  const availableVariables = [
    '{{ member_name }}', 
    '{{ member_id }}', 
    '{{ current_date }}',
    '{{ gym_name }}',
    '{{ gym_address }}',
    '{{ gym_phone }}',
    '{{ gym_email }}',
    '{{ dashboard_url }}',
    '{{ plan_name }}',
    '{{ subscription_start_date }}',
    '{{ subscription_end_date }}',
    '{{ days_remaining }}',
    '{{ subscription_id }}',
    '{{ days_before_expiry }}'
  ];

  // Fetch templates on load
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch templates
        const templatesResponse = await axios.get('/api/notifications/templates/?notification_type=MEMBERSHIP_EXPIRY');
        setTemplates(templatesResponse.data);
        
        // Fetch settings
        const settingsResponse = await axios.get('/api/notifications/settings/get_expiry_settings/');
        setSettings(settingsResponse.data);
        
        // If there are templates and settings, set the selected template
        if (templatesResponse.data.length > 0 && settingsResponse.data.template) {
          const defaultTemplate = templatesResponse.data.find(
            (t: Template) => t.id === settingsResponse.data.template
          );
          if (defaultTemplate) {
            setSelectedTemplate(defaultTemplate);
            setTemplateFormData(defaultTemplate);
          } else if (templatesResponse.data.length > 0) {
            setSelectedTemplate(templatesResponse.data[0]);
            setTemplateFormData(templatesResponse.data[0]);
          }
        } else if (templatesResponse.data.length > 0) {
          setSelectedTemplate(templatesResponse.data[0]);
          setTemplateFormData(templatesResponse.data[0]);
        }
        
        // Set settings form data
        setSettingsFormData(settingsResponse.data);
      } catch (err) {
        console.error('Error fetching notification data:', err);
        setError('Failed to load notification templates and settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    const templateId = event.target.value;
    const selected = templates.find(t => t.id === templateId) || null;
    
    setSelectedTemplate(selected);
    if (selected) {
      setTemplateFormData(selected);
    } else {
      setTemplateFormData({});
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTemplateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettingsFormData(prev => ({ ...prev, [name]: e.target.checked }));
  };

  const handleDaysBeforeExpiryChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const value = e.target.value;
    if (typeof value === 'string') {
      const daysArray = value.split(',').map(day => parseInt(day.trim(), 10)).filter(day => !isNaN(day));
      setSettingsFormData(prev => ({ ...prev, days_before_expiry: daysArray }));
    }
  };

  const handleInsertVariable = (variable: string) => {
    const textArea = document.getElementById(activeTab === 0 ? 'body_text' : 'body_html') as HTMLTextAreaElement;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const currentValue = activeTab === 0 ? templateFormData.body_text || '' : templateFormData.body_html || '';
    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);

    setTemplateFormData(prev => ({
      ...prev,
      [activeTab === 0 ? 'body_text' : 'body_html']: newValue
    }));

    // Set focus back to textarea and place cursor after inserted variable
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handlePreviewTemplate = async () => {
    // Can only preview if we have a valid template ID
    if (!selectedTemplate?.id) {
      setError('Please save the template first before previewing');
      return;
    }

    setIsPreviewLoading(true);
    setError(null);
    
    try {
      // Allow the user to customize sample data
      const customData = {
        member_name: 'John Doe',
        plan_name: 'Premium Membership',
        days_remaining: '15'
      };
      
      const response = await axios.post(
        `/api/notifications/templates/${selectedTemplate.id}/preview/`,
        { sample_data: customData }
      );
      
      setPreviewData(response.data);
      setShowPreview(true);
    } catch (err) {
      console.error('Error previewing template:', err);
      setError('Failed to generate preview. Check template for syntax errors.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    
    try {
      let templateResponse: { data: Template };
      
      // Save or update template
      if (templateFormData.id) {
        const response = await axios.put<{ data: Template }>(
          `/api/notifications/templates/${templateFormData.id}/`, 
          templateFormData
        );
        templateResponse = response.data;
      } else {
        const response = await axios.post<{ data: Template }>(
          '/api/notifications/templates/',
          { 
            ...templateFormData, 
            notification_type: NotificationType.MEMBERSHIP_EXPIRY 
          }
        );
        templateResponse = response.data;
      }
      
      // Update settings to use this template
      if (settings?.id) {
        await axios.put(
          `/api/notifications/settings/${settings.id}/`,
          { 
            ...settingsFormData, 
            template: templateResponse.data.id,
            notification_type: NotificationType.MEMBERSHIP_EXPIRY
          }
        );
      } else {
        await axios.post(
          '/api/notifications/settings/',
          { 
            ...settingsFormData, 
            template: templateResponse.data.id,
            notification_type: NotificationType.MEMBERSHIP_EXPIRY
          }
        );
      }
      
      // Refresh data
      const templatesResponse = await axios.get('/api/notifications/templates/?notification_type=MEMBERSHIP_EXPIRY');
      setTemplates(templatesResponse.data);
      
      const settingsResponse = await axios.get('/api/notifications/settings/get_expiry_settings/');
      setSettings(settingsResponse.data);
      
      // Select the saved template
      const savedTemplate = templatesResponse.data.find((t: Template) => t.id === templateResponse.data.id);
      if (savedTemplate) {
        setSelectedTemplate(savedTemplate);
        setTemplateFormData(savedTemplate);
      }
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save notification template and settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTemplateEditor = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Email Template</Typography>
      
      <Box mb={3}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Template</InputLabel>
          <Select
            value={selectedTemplate?.id || ''}
            onChange={handleTemplateChange}
            disabled={loading || templates.length === 0}
          >
            {templates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} {template.is_active ? '(Active)' : '(Inactive)'}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Select a template or create a new one</FormHelperText>
        </FormControl>
      </Box>
      
      <Box mb={3}>
        <TextField
          fullWidth
          margin="normal"
          label="Template Name"
          name="name"
          value={templateFormData.name || ''}
          onChange={handleTemplateFormChange}
          disabled={loading}
          required
        />
        
        <TextField
          fullWidth
          margin="normal"
          label="Email Subject"
          name="subject"
          value={templateFormData.subject || ''}
          onChange={handleTemplateFormChange}
          disabled={loading}
          required
          helperText="You can use variables like {{ member_name }}"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={templateFormData.is_active || false}
              onChange={(e) => setTemplateFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              name="is_active"
              color="primary"
              disabled={loading}
            />
          }
          label="Active"
        />
      </Box>
      
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>Variables</Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {availableVariables.map(variable => (
            <Chip 
              key={variable} 
              label={variable} 
              onClick={() => handleInsertVariable(variable)} 
              color="primary" 
              variant="outlined"
              clickable
            />
          ))}
        </Box>
        <FormHelperText>Click a variable to insert it at the cursor position</FormHelperText>
      </Box>
      
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="Text Version" />
        <Tab label="HTML Version (Optional)" />
      </Tabs>
      
      {activeTab === 0 && (
        <TextField
          id="body_text"
          fullWidth
          multiline
          rows={10}
          margin="normal"
          label="Email Body (Text)"
          name="body_text"
          value={templateFormData.body_text || ''}
          onChange={handleTemplateFormChange}
          disabled={loading}
          required
          placeholder="Dear {{ member_name }},\n\nYour membership will expire in {{ days_before_expiry }} days on {{ subscription_end_date }}."
        />
      )}
      
      {activeTab === 1 && (
        <TextField
          id="body_html"
          fullWidth
          multiline
          rows={10}
          margin="normal"
          label="Email Body (HTML)"
          name="body_html"
          value={templateFormData.body_html || ''}
          onChange={handleTemplateFormChange}
          disabled={loading}
          placeholder="<p>Dear {{ member_name }},</p>\n<p>Your membership will expire in <strong>{{ days_before_expiry }}</strong> days on {{ subscription_end_date }}.</p>"
        />
      )}
    </Box>
  );

  const renderNotificationSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Notification Settings</Typography>
      
      <Box display="flex" flexDirection="column" gap={2} mt={3}>
        <FormControlLabel
          control={
            <Switch
              checked={settingsFormData.is_email_enabled || false}
              onChange={handleSwitchChange('is_email_enabled')}
              name="is_email_enabled"
              color="primary"
              disabled={loading}
            />
          }
          label="Send Email Notifications"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settingsFormData.is_dashboard_enabled || false}
              onChange={handleSwitchChange('is_dashboard_enabled')}
              name="is_dashboard_enabled"
              color="primary"
              disabled={loading}
            />
          }
          label="Show Dashboard Notifications"
        />
      </Box>
      
      <Box mt={3}>
        <TextField
          fullWidth
          margin="normal"
          label="Days Before Expiry to Send Notifications"
          name="days_before_expiry"
          value={(settingsFormData.days_before_expiry || []).join(', ')}
          onChange={handleDaysBeforeExpiryChange}
          disabled={loading}
          required
          helperText="Enter comma-separated days (e.g. 30, 15, 7, 3, 1)"
        />
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom color="primary">
        Membership Expiry Notifications
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Success</AlertTitle>
          Template and settings saved successfully!
        </Alert>
      )}
      
      <Box display="flex" gap={3} flexDirection={{ xs: 'column', md: 'row' }}>
        <Box flex={2}>
          {renderTemplateEditor()}
        </Box>
        
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <Divider sx={{ display: { xs: 'block', md: 'none' }, my: 2 }} />
        
        <Box flex={1}>
          {renderNotificationSettings()}
        </Box>
      </Box>
      
      <Box display="flex" justifyContent="flex-end" mt={3} gap={2}>
        <Button
          variant="contained"
          startIcon={<PreviewIcon />}
          color="secondary"
          onClick={handlePreviewTemplate}
          disabled={loading || isSaving || isPreviewLoading || !selectedTemplate}
        >
          {isPreviewLoading ? <CircularProgress size={24} /> : 'Preview'}
        </Button>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          color="primary"
          onClick={saveTemplate}
          disabled={loading || isSaving}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save'}
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
          {previewData ? (
            <Box>
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight="bold">Subject:</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f8f8' }}>
                  <Typography>{previewData.subject}</Typography>
                </Paper>
              </Box>
              
              <Tabs value={previewTab} onChange={(e, val) => setPreviewTab(val)}>
                <Tab label="Text Version" />
                {previewData.body_html && <Tab label="HTML Version" />}
              </Tabs>
              
              <Box mt={2} p={2} border="1px solid #e0e0e0" borderRadius={1}>
                {previewTab === 0 && (
                  <Box sx={{ whiteSpace: 'pre-line' }}>
                    <Typography>{previewData.body_text}</Typography>
                  </Box>
                )}
                
                {previewTab === 1 && previewData.body_html && (
                  <Box
                    dangerouslySetInnerHTML={{ __html: previewData.body_html }}
                    sx={{ 
                      '& a': { color: 'primary.main' },
                      '& img': { maxWidth: '100%' }
                    }}
                  />
                )}
              </Box>
              
              <Box mt={3}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Sample Data Used:</Typography>
                <Box maxHeight="200px" overflow="auto" bgcolor="#f5f5f5" p={2} borderRadius={1}>
                  <pre>
                    {JSON.stringify(previewData.sample_data, null, 2)}
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

export default NotificationTemplateEditor;
