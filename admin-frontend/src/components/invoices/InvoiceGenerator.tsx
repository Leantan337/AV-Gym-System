import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Plus as PlusIcon, Trash2 as TrashIcon, Eye as PreviewIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '../../services/invoiceApi';
import { CreateInvoiceData, InvoiceItem } from '../../types/invoice';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';

interface InvoiceGeneratorProps {
  onSuccess?: () => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch invoice templates
  const { data: templates = [] } = useQuery({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: invoiceApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onSuccess?.();
      resetForm();
    },
  });

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof Omit<InvoiceItem, 'total'>,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'description' ? value : Number(value),
    };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const resetForm = () => {
    setSelectedMemberId('');
    setSelectedTemplateId('');
    setDueDate(new Date());
    setNotes('');
    setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handleCreateInvoice = () => {
      if (!selectedMemberId || !selectedTemplateId || !dueDate) {
        return;
      }

      const invoiceData: CreateInvoiceData = {
        memberId: selectedMemberId,
        items: items.filter((item): item is Required<Omit<InvoiceItem, 'total'>> => 
          Boolean(item.description && item.quantity && item.unitPrice)
        ),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
        templateId: selectedTemplateId,
      };

      createInvoiceMutation.mutate(invoiceData, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          onSuccess?.();
        },
      });
    };
    handleCreateInvoice();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Invoice
        </Typography>

        <Stack spacing={3}>
          {/* Member Selection */}
          <TextField
            fullWidth
            label="Member ID"
            value={selectedMemberId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMemberId(e.target.value)}
            required
            margin="normal"
          />

          {/* Template Selection */}
          <FormControl fullWidth required>
            <InputLabel>Invoice Template</InputLabel>
            <Select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              label="Invoice Template"
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Due Date */}
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(newValue) => setDueDate(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />

          {/* Invoice Items */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Invoice Items
            </Typography>
            <Stack spacing={2}>
              {items.map((item, index) => (
                <Stack
                  key={index}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems="flex-start"
                >
                  <TextField
                    label="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required
                    sx={{ width: { xs: '100%', sm: '150px' } }}
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="Unit Price"
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    required
                    sx={{ width: { xs: '100%', sm: '150px' } }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  {items.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveItem(index)}
                      color="error"
                      sx={{ mt: { xs: 0, sm: 1 } }}
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </Stack>
              ))}
              <Button
                startIcon={<PlusIcon />}
                onClick={handleAddItem}
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Item
              </Button>
            </Stack>
          </Box>

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          {/* Subtotal Display */}
          <Typography variant="h6" align="right">
            Subtotal: ${calculateSubtotal().toFixed(2)}
          </Typography>

          {/* Error Display */}
          {createInvoiceMutation.error && (
            <Alert severity="error">
              {createInvoiceMutation.error instanceof Error
                ? createInvoiceMutation.error.message
                : 'Failed to create invoice'}
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              startIcon={<PreviewIcon />}
              onClick={() => setPreviewOpen(true)}
              disabled={!selectedTemplateId || !selectedMemberId}
            >
              Preview
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                createInvoiceMutation.isPending ||
                !selectedMemberId ||
                !selectedTemplateId ||
                !dueDate ||
                items.some((item) => !item.description)
              }
            >
              {createInvoiceMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                'Generate Invoice'
              )}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Invoice Preview</DialogTitle>
        <DialogContent>
          {/* Add preview content here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};