import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilePdf as PdfIcon,
  Search as SearchIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Invoice, InvoiceFilters } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';

interface InvoiceListProps {
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onViewPdf?: (invoice: Invoice) => void;
}

const statusColors: Record<Invoice['status'], 'default' | 'primary' | 'success' | 'error'> = {
  draft: 'default',
  pending: 'primary',
  paid: 'success',
  cancelled: 'error',
};

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onEdit,
  onDelete,
  onViewPdf,
}) => {
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    status: 'all',
    dateRange: 'month',
    page: 0,
    perPage: 10,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceApi.getInvoices(filters),
  });

  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 0 }), // Reset page when other filters change
    }));
  };

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="error">
          Error loading invoices: {(error as Error).message}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search invoices..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon size={20} style={{ marginRight: 8 }} />,
          }}
          sx={{ minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={filters.dateRange}
            label="Date Range"
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Summary */}
      {data && (
        <Stack
          direction="row"
          spacing={3}
          sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}
        >
          <Box>
            <Typography variant="overline">Total Amount</Typography>
            <Typography variant="h6">
              ${data.totalAmount.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline">Paid</Typography>
            <Typography variant="h6" color="success.main">
              ${data.paidAmount.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline">Pending</Typography>
            <Typography variant="h6" color="warning.main">
              ${data.pendingAmount.toFixed(2)}
            </Typography>
          </Box>
        </Stack>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Member</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: filters.perPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7} sx={{ height: 57 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 10, bgcolor: 'grey.100' }} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              data?.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.number}</TableCell>
                  <TableCell>{invoice.member.fullName}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={statusColors[invoice.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View PDF">
                      <IconButton
                        size="small"
                        onClick={() => onViewPdf?.(invoice)}
                      >
                        <PdfIcon size={20} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => onEdit?.(invoice)}
                      >
                        <EditIcon size={20} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => onDelete?.(invoice)}
                        color="error"
                      >
                        <DeleteIcon size={20} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {data && (
        <TablePagination
          component="div"
          count={data.totalCount}
          page={filters.page || 0}
          onPageChange={(_, newPage) => handleFilterChange('page', newPage)}
          rowsPerPage={filters.perPage || 10}
          onRowsPerPageChange={(e) =>
            handleFilterChange('perPage', parseInt(e.target.value, 10))
          }
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}
    </Box>
  );
};
