import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Tab,
  Tabs,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Copy as CopyIcon,
  Eye as PreviewIcon,
  Send as SendIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService, EmailTemplate } from '../../services/emailService';

interface EmailTemplateFormData {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  type: 'invoice' | 'receipt' | 'reminder' | 'welcome' | 'other';
}

export const EmailTemplateManager: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for HTML, 1 for Text
  const [formData, setFormData] = useState<EmailTemplateFormData>({
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    type: 'invoice',
  });

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: emailService.getTemplates,
  });

  const createMutation = useMutation({
    mutationFn: emailService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailTemplate> }) =>
      emailService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: emailService.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      type: 'invoice',
    });
    setIsFormOpen(true);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      type: template.type,
    });
    setSelectedTemplate(template);
  };

  const handleEdit = (template: EmailTemplate) => {
    handleTemplateSelect(template);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      type: 'invoice',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplate) {
      updateMutation.mutate({
        id: selectedTemplate.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  const handleDelete = (template: EmailTemplate) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      type: template.type,
    });
    setIsFormOpen(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  interface TemplateVariable {
    name: string;
    description: string;
  }

  const availableVariables: TemplateVariable[] = [
    { name: 'memberName', description: 'Full name of the member' },
    { name: 'memberId', description: 'Unique member ID' },
    { name: 'invoiceNumber', description: 'Unique invoice number' },
    { name: 'invoiceDate', description: 'Date the invoice was created' },
    { name: 'dueDate', description: 'Payment due date' },
    { name: 'subtotal', description: 'Subtotal amount before tax' },
    { name: 'tax', description: 'Tax amount' },
    { name: 'total', description: 'Total amount including tax' },
    { name: 'items', description: 'Table of invoice line items' },
    { name: 'paymentLink', description: 'Link to payment page' },
    { name: 'organizationName', description: 'Name of the organization' },
    { name: 'organizationAddress', description: 'Address of the organization' },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Email Templates</Typography>
        <Button variant="contained" onClick={handleCreateNew}>
          Create New Template
        </Button>
      </Stack>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Loading templates...</TableCell>
                </TableRow>
              ) : templates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No templates found. Create your first template!</TableCell>
                </TableRow>
              ) : (
                templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                        size="small"
                        color={
                          template.type === 'invoice' ? 'primary' :
                          template.type === 'receipt' ? 'success' :
                          template.type === 'reminder' ? 'warning' :
                          template.type === 'welcome' ? 'info' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Preview">
                        <IconButton onClick={() => handlePreview(template)}>
                          <PreviewIcon size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton onClick={() => handleDuplicate(template)}>
                          <CopyIcon size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEdit(template)}>
                          <EditIcon size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(template)}>
                          <DeleteIcon size={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Template Form Dialog */}
      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplate ? 'Edit Email Template' : 'Create New Email Template'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Stack spacing={3}>
              <TextField
                label="Template Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Email Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Template Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Template Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  required
                >
                  <MenuItem value="invoice">Invoice</MenuItem>
                  <MenuItem value="receipt">Receipt</MenuItem>
                  <MenuItem value="reminder">Reminder</MenuItem>
                  <MenuItem value="welcome">Welcome</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Available Variables:</Typography>
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableVariables.map((variable, idx) => (
                    <Tooltip key={idx} title={variable.description}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const selectedField = activeTab === 0 ? 'bodyHtml' : 'bodyText';
                          const textField = document.getElementById(`template-${selectedField}`) as HTMLTextAreaElement;
                          if (textField) {
                            const start = textField.selectionStart;
                            const end = textField.selectionEnd;
                            const text = textField.value;
                            const before = text.substring(0, start);
                            const after = text.substring(end, text.length);
                            const tag = `{{${variable.name}}}`;
                            const newText = before + tag + after;
                            setFormData({ ...formData, [selectedField]: newText });
                          }
                        }}
                      >
                        {variable.name}
                      </Button>
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                aria-label="template content tabs"
              >
                <Tab label="HTML Content" />
                <Tab label="Plain Text Content" />
              </Tabs>

              <Divider />

              {activeTab === 0 ? (
                <TextField
                  id="template-bodyHtml"
                  label="HTML Content"
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                  multiline
                  rows={12}
                  required
                  fullWidth
                  placeholder="<html><body><h1>Invoice</h1><p>Dear {{memberName}},</p>...</body></html>"
                />
              ) : (
                <TextField
                  id="template-bodyText"
                  label="Plain Text Content"
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  multiline
                  rows={12}
                  required
                  fullWidth
                  placeholder="Dear {{memberName}},\n\nYour invoice ({{invoiceNumber}}) is now available..."
                />
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              !formData.name || !formData.subject || !formData.bodyHtml || !formData.bodyText
            }
          >
            {selectedTemplate ? 'Update' : 'Create'} Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Email Preview: {selectedTemplate?.name}</Typography>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="HTML" />
              <Tab label="Text" />
            </Tabs>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Subject: {selectedTemplate.subject
                  .replace(/{{memberName}}/g, 'John Doe')
                  .replace(/{{invoiceNumber}}/g, 'INV-2025-001')}
              </Typography>
              
              {activeTab === 0 ? (
                <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplate.bodyHtml
                        .replace(/{{memberName}}/g, 'John Doe')
                        .replace(/{{invoiceNumber}}/g, 'INV-2025-001')
                        .replace(/{{invoiceDate}}/g, new Date().toLocaleDateString())
                        .replace(/{{dueDate}}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
                        .replace(/{{subtotal}}/g, '$200.00')
                        .replace(/{{tax}}/g, '$20.00')
                        .replace(/{{total}}/g, '$220.00')
                        .replace(/{{paymentLink}}/g, 'https://example.com/pay/INV-2025-001')
                        .replace(/{{organizationName}}/g, 'AV Gym')
                        .replace(/{{organizationAddress}}/g, '123 Fitness St, Gymtown, GT 12345')
                    }}
                  />
                </Paper>
              ) : (
                <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {selectedTemplate.bodyText
                      .replace(/{{memberName}}/g, 'John Doe')
                      .replace(/{{invoiceNumber}}/g, 'INV-2025-001')
                      .replace(/{{invoiceDate}}/g, new Date().toLocaleDateString())
                      .replace(/{{dueDate}}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
                      .replace(/{{subtotal}}/g, '$200.00')
                      .replace(/{{tax}}/g, '$20.00')
                      .replace(/{{total}}/g, '$220.00')
                      .replace(/{{paymentLink}}/g, 'https://example.com/pay/INV-2025-001')
                      .replace(/{{organizationName}}/g, 'AV Gym')
                      .replace(/{{organizationAddress}}/g, '123 Fitness St, Gymtown, GT 12345')
                    }
                  </pre>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<SendIcon />}
            onClick={() => {
              // This would send a test email
              alert('Test email would be sent here');
            }}
          >
            Send Test Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
