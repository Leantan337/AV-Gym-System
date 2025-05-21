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
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
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

export interface InvoiceItemFormData extends Omit<InvoiceItem, 'total'> {
  total?: number;
}

interface MemberSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  membershipNumber: string;
  membership_number?: string;
}

interface PresetItem {
  name: string;
  description: string;
  price: number;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onSubmit,
  onCancel,
}) => {
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    membershipNumber: string;
  } | null>(null);
  const [items, setItems] = useState<InvoiceItemFormData[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [presetItemsOpen, setPresetItemsOpen] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  interface MemberData {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    membershipNumber: string;
    membership_number?: string;
  }

  const handleMemberSelect = (member: MemberData) => {
    const membershipNumber = (member.membershipNumber || member.membership_number || '').toString();
    setSelectedMember({
      id: member.id,
      fullName: member.fullName,
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      membershipNumber: membershipNumber || ''
    });
    setSearchQuery(member.fullName);
  };

  interface SearchResultMember {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    membershipNumber: string;
  }

  interface MemberResult {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    membershipNumber: string;
    membership_number?: string;
  }

  const { data: searchResults = [] } = useQuery<MemberResult[]>({
    queryKey: ['memberSearch', searchQuery],
    queryFn: async () => {
      const results = await searchMembers(searchQuery) as Array<{
        id: string;
        fullName: string;
        email?: string;
        phone?: string;
        address?: string;
        membershipNumber?: string;
        membership_number?: string;
      }>;
      return results.map(member => ({
        id: member.id,
        fullName: member.fullName,
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || '',
        membershipNumber: (member.membershipNumber || member.membership_number || '').toString()
      }));
    },
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
        // membershipNumber is not available in the Invoice.member type
        membershipNumber: '',
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
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }
  }, [invoice]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
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
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTax = (subtotal: number) => {
    // Default tax rate of 10%
    return subtotal * 0.1;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !dueDate) return;

    const invoiceData: CreateInvoiceData = {
      memberId: selectedMember.id,
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      dueDate: new Date(dueDate).toISOString().split('T')[0],
      notes: notes.trim() || undefined,
      templateId: typeof selectedTemplate === 'string' ? selectedTemplate : (selectedTemplate as any)?.id || '',
    };

    onSubmit(invoiceData);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  // Preset common invoice items
  const presetItems: PresetItem[] = [
    { name: 'Monthly Membership', description: 'Standard monthly gym membership', price: 49.99 },
    { name: 'Personal Training Session', description: 'One-on-one personal training session (60 min)', price: 75.00 },
    { name: 'Registration Fee', description: 'One-time registration fee for new members', price: 25.00 },
    { name: 'Fitness Assessment', description: 'Complete fitness assessment and goal setting', price: 35.00 },
    { name: 'Group Class Pack', description: '10-class pack for group fitness classes', price: 120.00 },
  ];

  const handleAddPresetItem = (preset: PresetItem) => {
    setItems([...items, {
      description: preset.description,
      quantity: 1,
      unitPrice: preset.price
    }]);
    setPresetItemsOpen(false);
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
        <FormControl fullWidth>
          <InputLabel>Template</InputLabel>
          <Select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value as string)}
            required
          >
            {templates?.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
          <Button 
            sx={{ mt: 1 }}
            onClick={handlePreview}
            disabled={!selectedTemplate}
            variant="outlined"
            fullWidth
          >
            Preview Invoice
          </Button>
        </FormControl>

        {/* Items */}
        <Paper>
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell width="50px"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        InputProps={{
                          endAdornment: index === 0 ? (
                            <Tooltip title="Add common items">
                              <IconButton size="small" onClick={() => setPresetItemsOpen(true)}>
                                <PlusIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          ) : null
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 1 }}
                        sx={{ width: '70px' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: '100px' }}
                        InputProps={{
                          startAdornment: <Typography variant="body2">$</Typography>
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        size="small"
                        color="error"
                      >
                        <TrashIcon size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary row */}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <Typography variant="subtitle2">Subtotal:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{formatCurrency(calculateSubtotal())}</Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <Typography variant="subtitle2">Tax (10%):</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{formatCurrency(calculateTax(calculateSubtotal()))}</Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <Typography variant="subtitle1"><strong>Total:</strong></Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1"><strong>{formatCurrency(calculateSubtotal() + calculateTax(calculateSubtotal()))}</strong></Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
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
      {/* Preset Items Dialog */}
      <Dialog open={presetItemsOpen} onClose={() => setPresetItemsOpen(false)}>
        <DialogTitle>Common Invoice Items</DialogTitle>
        <DialogContent>
          <List>
            {presetItems.map((preset, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleAddPresetItem(preset)}>
                  <ListItemText
                    primary={preset.name}
                    secondary={`${preset.description} - ${formatCurrency(preset.price)}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetItemsOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Invoice Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, p: 3, border: '1px solid #ddd' }}>
            <Typography variant="h5" align="center" gutterBottom>INVOICE</Typography>
            
            {selectedMember && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1"><strong>Bill To:</strong></Typography>
                <Typography>{selectedMember.fullName}</Typography>
                <Typography>Member ID: {selectedMember.membershipNumber}</Typography>
              </Box>
            )}
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Subtotal:</strong></TableCell>
                    <TableCell align="right">{formatCurrency(calculateSubtotal())}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Tax (10%):</strong></TableCell>
                    <TableCell align="right">{formatCurrency(calculateTax(calculateSubtotal()))}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                    <TableCell align="right">{formatCurrency(calculateSubtotal() + calculateTax(calculateSubtotal()))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1"><strong>Notes:</strong></Typography>
              <Typography>{notes || 'No notes'}</Typography>
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                Due date: {dueDate ? format(dueDate, 'MMMM d, yyyy') : 'Not specified'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
