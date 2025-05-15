import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Autocomplete,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Plus as PlusIcon, Trash2 as TrashIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Invoice, InvoiceItem, CreateInvoiceData, InvoiceTemplate } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';
import { Member } from '../../types/member';
import { searchMembers } from '../../services/api';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceData) => void;
  onCancel: () => void;
}

interface InvoiceItemFormData extends Omit<InvoiceItem, 'total'> {
  total?: number;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onSubmit,
  onCancel,
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [items, setItems] = useState<InvoiceItemFormData[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['memberSearch', searchQuery],
    queryFn: () => searchMembers(searchQuery),
    enabled: searchQuery.length > 2,
  });

  useEffect(() => {
    if (invoice) {
      setSelectedMember({
        id: invoice.member.id,
        fullName: invoice.member.fullName,
        email: invoice.member.email,
        phone: invoice.member.phone,
        address: invoice.member.address,
      });
      setItems(invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })));
      setDueDate(new Date(invoice.dueDate));
      setNotes(invoice.notes || '');
      setSelectedTemplate(invoice.templateId);
    } else {
      // Initialize with one empty item for new invoices
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    }
  }, [invoice]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemFormData, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' || field === 'unitPrice'
        ? (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0)
        : newItems[index].total,
    };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + total;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !dueDate || !selectedTemplate) return;

    const data: CreateInvoiceData = {
      memberId: selectedMember.id,
      items: items.map(({ total, ...item }) => item), // Remove calculated total
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      notes,
      templateId: selectedTemplate,
    };

    onSubmit(data);
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800 }}>
      <Stack spacing={3}>
        {/* Member Selection */}
        <Autocomplete
          value={selectedMember}
          onChange={(_, newValue) => setSelectedMember(newValue)}
          onInputChange={(_, value) => setSearchQuery(value)}
          options={searchResults || []}
          getOptionLabel={(option) => option.fullName}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Member"
              required
              helperText={selectedMember?.email}
            />
          )}
        />

        {/* Template Selection */}
        <FormControl required>
          <InputLabel>Invoice Template</InputLabel>
          <Select
            value={selectedTemplate}
            label="Invoice Template"
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            {templates?.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Items */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, 'description', e.target.value)
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', Number(e.target.value))
                        }
                        required
                        inputProps={{ min: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', Number(e.target.value))
                        }
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <TrashIcon size={20} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 2 }}>
            <Button
              startIcon={<PlusIcon size={20} />}
              onClick={handleAddItem}
            >
              Add Item
            </Button>
          </Box>
        </Paper>

        {/* Total */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" align="right">
            Total: ${calculateTotal().toFixed(2)}
          </Typography>
        </Paper>

        {/* Due Date and Notes */}
        <Stack direction="row" spacing={2}>
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(newValue) => setDueDate(newValue)}
            slotProps={{
              textField: {
                required: true,
                fullWidth: true,
              },
            }}
          />
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handlePreview}>
            Preview
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={!selectedMember || !dueDate || items.length === 0}
          >
            {invoice ? 'Update' : 'Create'} Invoice
          </Button>
        </Stack>
      </Stack>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Invoice Preview</DialogTitle>
        <DialogContent>
          {/* Preview content will be added later */}
          <Typography>Preview functionality coming soon...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
