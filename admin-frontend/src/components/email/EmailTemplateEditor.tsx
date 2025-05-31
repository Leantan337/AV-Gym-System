import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import { EmailTemplate, emailService } from '../../services/emailService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { sanitizeHtml } from '../../utils/security';

// Email template editor toolbar configuration
const editorModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

// Available template variables for different template types
const templateVariables: Record<EmailTemplate['type'], string[]> = {
  'invoice': ['{{member_name}}', '{{invoice_number}}', '{{invoice_date}}', '{{invoice_amount}}', '{{due_date}}'],
  'receipt': ['{{member_name}}', '{{receipt_number}}', '{{receipt_date}}', '{{payment_amount}}', '{{payment_method}}'],
  'reminder': ['{{member_name}}', '{{invoice_number}}', '{{due_date}}', '{{invoice_amount}}', '{{days_overdue}}'],
  'welcome': ['{{member_name}}', '{{gym_name}}', '{{membership_type}}', '{{start_date}}'],
  'other': ['{{member_name}}', '{{gym_name}}'],
};

interface EmailTemplateEditorProps {
  templateId?: string; // If provided, edit existing template; otherwise, create new
  onSave?: (template: EmailTemplate) => void;
  onCancel?: () => void;
}

/**
 * Email Template Editor Component
 * Allows creating and editing email templates with live preview
 */
const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  templateId,
  onSave,
  onCancel,
}) => {
  const [template, setTemplate] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    type: 'other',
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Load template if editing existing one
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;
      
      try {
        setLoading(true);
        const loadedTemplate = await emailService.getTemplate(templateId);
        setTemplate(loadedTemplate);
        
        // Initialize preview data with placeholder values
        initializePreviewData(loadedTemplate.type);
      } catch (err) {
        setError('Failed to load template');
        console.error('Error loading template:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplate();
  }, [templateId]);
  
  // Initialize preview data when template type changes
  useEffect(() => {
    if (template.type) {
      initializePreviewData(template.type);
    }
  }, [template.type]);
  
  const initializePreviewData = (templateType: EmailTemplate['type']) => {
    const previewValues: Record<string, string> = {};
    
    // Set sample values for each variable
    templateVariables[templateType].forEach(variable => {
      const key = variable.replace(/[{}]/g, '');
      
      // Sample values for preview
      switch (key) {
        case 'member_name':
          previewValues[key] = 'John Smith';
          break;
        case 'gym_name':
          previewValues[key] = 'AV Fitness Center';
          break;
        case 'invoice_number':
          previewValues[key] = 'INV-2025-1234';
          break;
        case 'invoice_date':
          previewValues[key] = '2025-05-28';
          break;
        case 'due_date':
          previewValues[key] = '2025-06-15';
          break;
        case 'invoice_amount':
          previewValues[key] = '$129.99';
          break;
        case 'receipt_number':
          previewValues[key] = 'REC-2025-1234';
          break;
        case 'receipt_date':
          previewValues[key] = '2025-05-28';
          break;
        case 'payment_amount':
          previewValues[key] = '$129.99';
          break;
        case 'payment_method':
          previewValues[key] = 'Credit Card';
          break;
        case 'days_overdue':
          previewValues[key] = '7';
          break;
        case 'membership_type':
          previewValues[key] = 'Premium';
          break;
        case 'start_date':
          previewValues[key] = '2025-06-01';
          break;
        default:
          previewValues[key] = `[${key}]`;
      }
    });
    
    setPreviewData(previewValues);
  };
  
  const handleChange = (field: keyof EmailTemplate, value: string) => {
    setTemplate(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  const handleSave = async () => {
    // Validate required fields
    if (!template.name || !template.subject || !template.bodyHtml) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setSaving(true);
      
      // Sanitize HTML to prevent XSS
      const sanitizedHtml = sanitizeHtml(template.bodyHtml);
      
      let savedTemplate: EmailTemplate;
      
      if (templateId) {
        // Update existing template
        savedTemplate = await emailService.updateTemplate(templateId, {
          ...template,
          bodyHtml: sanitizedHtml,
        });
        setSuccess('Template updated successfully');
      } else {
        // Create new template
        savedTemplate = await emailService.createTemplate({
          name: template.name!,
          subject: template.subject!,
          bodyHtml: sanitizedHtml,
          bodyText: template.bodyText!,
          type: template.type!,
        });
        setSuccess('Template created successfully');
      }
      
      if (onSave) {
        onSave(savedTemplate);
      }
    } catch (err) {
      setError('Failed to save template');
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Generate preview with variable substitution
  const getPreviewContent = () => {
    if (!template.bodyHtml) return '';
    
    let previewHtml = template.bodyHtml;
    
    // Replace variables with preview values
    Object.entries(previewData).forEach(([key, value]) => {
      const variable = `{{${key}}}`;
      previewHtml = previewHtml.replace(new RegExp(variable, 'g'), value);
    });
    
    return previewHtml;
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {templateId ? 'Edit Email Template' : 'Create New Email Template'}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* Template details section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Template Details
            </Typography>
            
            <TextField
              label="Template Name"
              fullWidth
              margin="normal"
              value={template.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Template Type</InputLabel>
              <Select
                value={template.type || 'other'}
                label="Template Type"
                onChange={(e) => handleChange('type', e.target.value as EmailTemplate['type'])}
              >
                <MenuItem value="invoice">Invoice</MenuItem>
                <MenuItem value="receipt">Receipt</MenuItem>
                <MenuItem value="reminder">Payment Reminder</MenuItem>
                <MenuItem value="welcome">Welcome</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Subject"
              fullWidth
              margin="normal"
              value={template.subject || ''}
              onChange={(e) => handleChange('subject', e.target.value)}
              required
            />
            
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Available Variables:
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                {template.type && templateVariables[template.type].map((variable, index) => (
                  <Typography
                    key={index}
                    component="span"
                    sx={{
                      display: 'inline-block',
                      bgcolor: '#e0e0e0',
                      p: 0.5,
                      borderRadius: 1,
                      m: 0.5,
                      fontSize: '0.85rem',
                    }}
                  >
                    {variable}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Editor section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Edit" />
              <Tab label="Preview" />
            </Tabs>
            
            {activeTab === 0 ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  HTML Content
                </Typography>
                <Box sx={{ height: '400px', mb: 3 }}>
                  <ReactQuill
                    theme="snow"
                    value={template.bodyHtml || ''}
                    onChange={(content: string) => handleChange('bodyHtml', content)}
                    modules={editorModules}
                    style={{ height: '350px' }}
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Plain Text (Fallback)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={template.bodyText || ''}
                  onChange={(e) => handleChange('bodyText', e.target.value)}
                />
              </>
            ) : (
              <Box sx={{ border: '1px solid #ddd', p: 2, minHeight: '500px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Subject: {template.subject}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {saving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </Button>
      </Box>
      
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

export default EmailTemplateEditor;
