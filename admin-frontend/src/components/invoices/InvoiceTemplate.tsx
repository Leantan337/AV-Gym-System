import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Copy as CopyIcon,
  Eye as PreviewIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InvoiceTemplate as IInvoiceTemplate } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';

interface TemplateFormData {
  name: string;
  description: string;
  content: string;
}

export const InvoiceTemplate: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<IInvoiceTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    content: '',
  });

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  const createMutation = useMutation({
    mutationFn: invoiceApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceTemplates'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IInvoiceTemplate> }) =>
      invoiceApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceTemplates'] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: invoiceApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceTemplates'] });
    },
  });

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      content: '',
    });
    setIsFormOpen(true);
  };

  const handleTemplateSelect = (template: IInvoiceTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content,
    });
    setSelectedTemplate(template);
  };

  const handleEdit = (template: IInvoiceTemplate) => {
    handleTemplateSelect(template);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      content: '',
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
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (template: IInvoiceTemplate) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: IInvoiceTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      content: template.content,
    });
    setIsFormOpen(true);
  };

  const handlePreview = (template: IInvoiceTemplate) => {
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
    { name: 'items', description: 'Table of invoice line items' }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Invoice Templates</Typography>
        <Button
          variant="contained"
          onClick={handleCreateNew}
        >
          Create New Template
        </Button>
      </Stack>

      <Paper>
        <List>
          {isLoading ? (
            <ListItem>
              <ListItemText primary="Loading templates..." />
            </ListItem>
          ) : templates?.length === 0 ? (
            <ListItem>
              <ListItemText primary="No templates found. Create your first template!" />
            </ListItem>
          ) : (
            templates?.map((template) => (
              <ListItem key={template.id}>
                <ListItemText
                  primary={template.name}
                  secondary={template.description}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Preview">
                    <IconButton
                      edge="end"
                      onClick={() => handlePreview(template)}
                    >
                      <PreviewIcon size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicate">
                    <IconButton
                      edge="end"
                      onClick={() => handleDuplicate(template)}
                    >
                      <CopyIcon size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      edge="end"
                      onClick={() => handleEdit(template)}
                    >
                      <EditIcon size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(template)}
                    >
                      <DeleteIcon size={20} />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {/* Template Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? 'Edit Template' : 'Create New Template'}
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
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Available Variables:
                </Typography>
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableVariables.map((variable, idx) => (
                    <Button
                      key={idx}
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const textField = document.getElementById('template-content') as HTMLTextAreaElement;
                        if (textField) {
                          const start = textField.selectionStart;
                          const end = textField.selectionEnd;
                          const text = textField.value;
                          const before = text.substring(0, start);
                          const after = text.substring(end, text.length);
                          const tag = `{{${variable.name}}}`;
                          const newText = before + tag + after;
                          setFormData({ ...formData, content: newText });
                        }
                      }}
                    >
                      {variable.name}
                    </Button>
                  ))}
                </Box>
              </Box>

              <TextField
                id="template-content"
                label="Template Content (HTML)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                multiline
                rows={15}
                required
                fullWidth
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.content}
          >
            {selectedTemplate ? 'Update' : 'Create'} Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedTemplate && (
              <div
                dangerouslySetInnerHTML={{
                  __html: selectedTemplate.content
                    .replace(/{{invoice\.number}}/g, 'INV-2025-001')
                    .replace(/{{invoice\.date}}/g, new Date().toLocaleDateString())
                    .replace(/{{invoice\.dueDate}}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString())
                    .replace(/{{member\.fullName}}/g, 'John Doe')
                    .replace(/{{member\.email}}/g, 'john@example.com')
                    .replace(/{{member\.phone}}/g, '+1 234-567-8900')
                    .replace(/{{member\.address}}/g, '123 Main St, City, Country')
                    .replace(/{{items}}/g, `
                      <table>
                        <tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                        <tr><td>Monthly Membership</td><td>1</td><td>$50.00</td><td>$50.00</td></tr>
                        <tr><td>Personal Training</td><td>2</td><td>$75.00</td><td>$150.00</td></tr>
                      </table>
                    `)
                    .replace(/{{subtotal}}/g, '$200.00')
                    .replace(/{{tax}}/g, '$20.00')
                    .replace(/{{total}}/g, '$220.00')
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
