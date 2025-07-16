import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { invoiceApi } from '../../services/invoiceApi';
import { InvoiceTemplate, CreateInvoiceData } from '../../types/invoice';
import { InvoiceTemplateSelector } from './InvoiceTemplateSelector';

interface Member {
  id: string;
  full_name: string;
  status: string;
  phone: string;
  address: string;
  email?: string;
}

interface BulkInvoiceRequest {
  member_ids: string[];
  template_id: string;
  due_date: string;
  notes?: string;
}

interface BulkInvoiceResult {
  success: boolean;
  member_id: string;
  member_name: string;
  invoice_id?: string;
  error?: string;
}

interface BulkInvoiceOperationsProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (results: BulkInvoiceResult[]) => void;
}

export const BulkInvoiceOperations: React.FC<BulkInvoiceOperationsProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState<BulkInvoiceResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const queryClient = useQueryClient();

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: adminApi.getMembers,
  });

  // Fetch templates (removed unused variable)
  useQuery<InvoiceTemplate[]>({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  // Filter members based on search
  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated members
  const paginatedMembers = filteredMembers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Bulk invoice generation mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: async (requests: BulkInvoiceRequest[]) => {
      const results: BulkInvoiceResult[] = [];
      let completed = 0;

      for (const request of requests) {
        try {
          const member = members.find(m => m.id === request.member_ids[0]);
          if (!member) {
            throw new Error('Member not found');
          }

          const invoiceData: CreateInvoiceData = {
            memberId: request.member_ids[0],
            templateId: request.template_id,
            dueDate: request.due_date,
            notes: request.notes,
            items: [
              {
                description: 'Monthly Membership Fee',
                quantity: 1,
                unitPrice: 50.00, // Default price, should be configurable
              },
            ],
          };

          const invoice = await invoiceApi.createInvoice(invoiceData);
          results.push({
            success: true,
            member_id: request.member_ids[0],
            member_name: member.full_name,
            invoice_id: invoice.id,
          });
        } catch (error) {
          const member = members.find(m => m.id === request.member_ids[0]);
          results.push({
            success: false,
            member_id: request.member_ids[0],
            member_name: member?.full_name || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        completed++;
        setProcessingProgress((completed / requests.length) * 100);
      }

      return results;
    },
    onSuccess: (results) => {
      setProcessingResults(results);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onComplete?.(results);
    },
    onError: (error) => {
      console.error('Bulk invoice generation failed:', error);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Handle member selection
  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(filteredMembers.map(member => member.id));
    } else {
      setSelectedMemberIds([]);
    }
  };

  // Handle bulk generation
  const handleBulkGenerate = async () => {
    if (selectedMemberIds.length === 0 || !selectedTemplateId) {
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingResults([]);

    const requests: BulkInvoiceRequest[] = selectedMemberIds.map(memberId => ({
      member_ids: [memberId],
      template_id: selectedTemplateId,
      due_date: dueDate.toISOString().split('T')[0],
      notes,
    }));

    bulkGenerateMutation.mutate(requests);
  };

  // Handle bulk PDF download
  const handleBulkDownload = async () => {
    const successfulResults = processingResults.filter(r => r.success && r.invoice_id);
    if (successfulResults.length === 0) return;

    try {
      const invoiceIds = successfulResults.map(r => r.invoice_id).filter(Boolean) as string[];
      const blob = await invoiceApi.bulkGeneratePdf(invoiceIds);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-invoices-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Bulk download failed:', error);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMemberIds([]);
      setSelectedTemplateId('');
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      setNotes('');
      setSearchTerm('');
      setPage(0);
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingResults([]);
      setShowResults(false);
    }
  }, [open]);

  const selectedMembers = selectedMemberIds.length;
  const isFormValid = selectedMembers > 0 && selectedTemplateId && dueDate;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Bulk Invoice Generation</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {showResults ? (
          // Results View
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Generation Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" color="success.main">
                          {processingResults.filter(r => r.success).length}
                        </Typography>
                        <Typography variant="body2">Successful</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <ErrorIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" color="error.main">
                          {processingResults.filter(r => !r.success).length}
                        </Typography>
                        <Typography variant="body2">Failed</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <InfoIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" color="info.main">
                          {processingResults.length}
                        </Typography>
                        <Typography variant="body2">Total Processed</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">Detailed Results</Typography>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleBulkDownload}
                    disabled={processingResults.filter(r => r.success).length === 0}
                  >
                    Download All PDFs
                  </Button>
                </Stack>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Member</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Invoice ID</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processingResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.member_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={result.success ? 'Success' : 'Failed'}
                              color={result.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{result.invoice_id || '-'}</TableCell>
                          <TableCell>{result.error || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          </Box>
        ) : (
          // Generation Form
          <Box sx={{ p: 3 }}>
            {isProcessing ? (
              // Processing View
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Generating Invoices...
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={processingProgress} 
                  sx={{ mb: 2, width: '100%' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {Math.round(processingProgress)}% Complete
                </Typography>
              </Box>
            ) : (
              // Configuration Form
              <Stack spacing={3}>
                {/* Template Selection */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    1. Choose Invoice Template
                  </Typography>
                  <InvoiceTemplateSelector
                    selectedTemplateId={selectedTemplateId}
                    onTemplateSelect={setSelectedTemplateId}
                    variant="dropdown"
                  />
                </Box>

                {/* Due Date and Notes */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    2. Set Invoice Details
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Due Date"
                        value={dueDate}
                        onChange={(newDate) => newDate && setDueDate(newDate)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: { minWidth: 200 },
                          },
                        }}
                      />
                    </LocalizationProvider>
                    <TextField
                      label="Notes (Optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                  </Stack>
                </Box>

                {/* Member Selection */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    3. Select Members ({selectedMembers} selected)
                  </Typography>
                  
                  <TextField
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedMembers > 0 && selectedMembers < filteredMembers.length}
                              checked={selectedMembers > 0 && selectedMembers === filteredMembers.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Address</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {membersLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              Loading members...
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedMemberIds.includes(member.id)}
                                  onChange={() => handleMemberToggle(member.id)}
                                />
                              </TableCell>
                              <TableCell>{member.full_name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={member.status}
                                  color={member.status === 'active' ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{member.phone}</TableCell>
                              <TableCell>{member.address}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredMembers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                  />
                </Box>
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        {showResults ? (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkGenerate}
              variant="contained"
              disabled={!isFormValid || isProcessing}
              startIcon={<ReceiptIcon />}
            >
              Generate {selectedMembers} Invoice{selectedMembers !== 1 ? 's' : ''}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};