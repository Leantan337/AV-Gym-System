import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Button,
  Chip,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Toolbar,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
  Dialog,
  DialogContent,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Divider,
} from '@mui/material';
import { 
  Search, 
  MoreVertical, 
  Edit, 
  Trash, 
  Eye, 
  Download, 
  Filter, 
  MailPlus, 
  Plus, 
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { MemberDetailDialog } from './MemberDetailDialog';
import { MemberForm } from './MemberForm';

interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  membershipNumber?: string;
  address?: string;
  joinDate: string;
  membership?: {
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
  };
}

interface MemberFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  plan: string;
  sort: string;
  page: number;
  perPage: number;
}

export const MemberListPage: React.FC = () => {
  // State management
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    status: 'all',
    plan: 'all',
    sort: 'name_asc',
    page: 0,
    perPage: 10,
  });
  
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuMemberId, setActionMenuMemberId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string | null }>({ type: '', id: null });
  
  const queryClient = useQueryClient();
  
  // Fetch members with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['members', filters],
    queryFn: () => adminApi.getMembers(filters),
  });
  
  const members = data?.members || [];
  const totalCount = data?.totalCount || 0;
  
  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: ({ action, memberIds }: { action: 'activate' | 'deactivate'; memberIds: string[] }) => 
      adminApi.bulkMemberAction(action, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setSelected([]);
    },
  });
  
  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => adminApi.deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setConfirmDialogOpen(false);
      setSelected(prev => prev.filter(id => id !== confirmAction.id));
    },
  });
  
  // Selection handlers
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(members.map((member) => member.id));
    } else {
      setSelected([]);
    }
  };
  
  const handleSelectClick = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];
    
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    
    setSelected(newSelected);
  };
  
  // Filter handlers
  const handleFilterChange = (key: keyof MemberFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 0 }), // Reset to first page when filters change
    }));
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Debounce search input
    const value = event.target.value;
    const timeoutId = setTimeout(() => {
      handleFilterChange('search', value);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };
  
  // Pagination handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    handleFilterChange('page', newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('perPage', parseInt(event.target.value, 10));
  };
  
  // Action handlers
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, memberId: string) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuMemberId(memberId);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setActionMenuMemberId(null);
  };
  
  const handleViewDetails = (memberId: string) => {
    setSelectedMemberId(memberId);
    setDetailDialogOpen(true);
    handleActionMenuClose();
  };
  
  const handleEditMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setFormDialogOpen(true);
    handleActionMenuClose();
  };
  
  const handleCreateMember = () => {
    setSelectedMemberId(null);
    setFormDialogOpen(true);
  };
  
  const handleCloseForm = () => {
    setFormDialogOpen(false);
    setSelectedMemberId(null);
  };
  
  const handleFormSubmitSuccess = () => {
    setFormDialogOpen(false);
    setSelectedMemberId(null);
  };
  
  const handleDeletePrompt = (memberId: string) => {
    setConfirmAction({ type: 'delete', id: memberId });
    setConfirmDialogOpen(true);
    handleActionMenuClose();
  };
  
  const handleConfirmDelete = () => {
    if (confirmAction.id) {
      deleteMemberMutation.mutate(confirmAction.id);
    }
  };
  
  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setConfirmAction({ type: '', id: null });
  };
  
  const handleBulkAction = (action: 'activate' | 'deactivate') => {
    if (selected.length === 0) return;
    bulkActionMutation.mutate({ action, memberIds: selected });
  };
  
  const handleDownloadIdCard = async (memberId: string) => {
    try {
      await adminApi.downloadIdCard(memberId);
      handleActionMenuClose();
    } catch (error) {
      console.error('Failed to download ID card:', error);
    }
  };
  
  // Determine if selected item is checked
  const isSelected = (id: string) => selected.indexOf(id) !== -1;
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        {/* Toolbar with actions */}
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flex: '1 1 100%', display: 'flex', alignItems: 'center' }}
          >
            Members
            {isLoading && <LinearProgress sx={{ ml: 2, width: 100 }} />}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()}>
                <RefreshCw size={20} />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<UserPlus />}
              onClick={handleCreateMember}
              sx={{ ml: 1 }}
            >
              Add Member
            </Button>
          </Box>
        </Toolbar>
        
        {/* Filters */}
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by name, email, or ID"
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} color="#757575" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="plan-filter-label">Plan</InputLabel>
                <Select
                  labelId="plan-filter-label"
                  label="Plan"
                  value={filters.plan}
                  onChange={(e) => handleFilterChange('plan', e.target.value)}
                >
                  <MenuItem value="all">All Plans</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                  <MenuItem value="none">No Plan</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="sort-filter-label">Sort By</InputLabel>
                <Select
                  labelId="sort-filter-label"
                  label="Sort By"
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  <MenuItem value="name_asc">Name (A-Z)</MenuItem>
                  <MenuItem value="name_desc">Name (Z-A)</MenuItem>
                  <MenuItem value="date_added_desc">Newest First</MenuItem>
                  <MenuItem value="date_added_asc">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        
        {/* Bulk actions */}
        {selected.length > 0 && (
          <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              {selected.length} {selected.length === 1 ? 'member' : 'members'} selected
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleBulkAction('activate')}
                color="success"
              >
                Activate
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleBulkAction('deactivate')}
                color="error"
              >
                Deactivate
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<MailPlus />}
              >
                Email Selected
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load members: {(error as Error).message}
          </Alert>
        )}
        
        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < members.length}
                    checked={members.length > 0 && selected.length === members.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Membership</TableCell>
                <TableCell>Join Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from(new Array(filters.perPage)).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {Array.from(new Array(7)).map((_, cellIndex) => (
                      <TableCell key={`cell-${cellIndex}`}>
                        <Box sx={{ height: 24, bgcolor: '#f5f5f5', borderRadius: 1 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 3 }}>
                      No members found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                // Member rows
                members.map((member) => {
                  const isItemSelected = isSelected(member.id);
                  
                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={member.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onClick={() => handleSelectClick(member.id)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body1">
                            {member.fullName}
                          </Typography>
                          {member.membershipNumber && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              #{member.membershipNumber}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>{member.email}</TableCell>
                      
                      <TableCell>
                        <Chip
                          label={member.status}
                          size="small"
                          color={
                            member.status === 'active' ? 'success' :
                            member.status === 'pending' ? 'warning' : 'default'
                          }
                          variant={member.status === 'inactive' ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {member.membership?.plan ? (
                          <Typography variant="body2">
                            {member.membership.plan.charAt(0).toUpperCase() + member.membership.plan.slice(1)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No plan
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {new Date(member.joinDate).toLocaleDateString()}
                      </TableCell>
                      
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(member.id)}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditMember(member.id)}
                            >
                              <Edit size={18} />
                            </IconButton>
                          </Tooltip>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionMenuOpen(e, member.id)}
                            aria-label="more actions"
                          >
                            <MoreVertical size={18} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={filters.perPage}
          page={filters.page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => actionMenuMemberId && handleViewDetails(actionMenuMemberId)}>
          <Eye size={16} style={{ marginRight: 8 }} /> View Details
        </MenuItem>
        
        <MenuItem onClick={() => actionMenuMemberId && handleEditMember(actionMenuMemberId)}>
          <Edit size={16} style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        
        <MenuItem onClick={() => actionMenuMemberId && handleDownloadIdCard(actionMenuMemberId)}>
          <Download size={16} style={{ marginRight: 8 }} /> Download ID Card
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={() => actionMenuMemberId && handleDeletePrompt(actionMenuMemberId)}
          sx={{ color: 'error.main' }}
        >
          <Trash size={16} style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelConfirm}>
        <DialogContent sx={{ minWidth: 300, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Confirm Deletion
          </Typography>
          
          <Typography variant="body1">
            Are you sure you want to delete this member? This action cannot be undone.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
            <Button onClick={handleCancelConfirm} disabled={deleteMemberMutation.isPending}>
              Cancel
            </Button>
            
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleConfirmDelete}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Member Detail Dialog */}
      <MemberDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        memberId={selectedMemberId}
        onEdit={handleEditMember}
      />
      
      {/* Create/Edit Member Form Dialog */}
      <Dialog 
        open={formDialogOpen} 
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <MemberForm
            memberId={selectedMemberId || undefined}
            onSuccess={handleFormSubmitSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

interface GridProps {
  item: boolean;
  xs: number;
  md?: number;
}

const Grid: React.FC<GridProps & { children: React.ReactNode }> = ({ children, ...props }) => {
  return (
    <Box sx={{ 
      flex: { 
        xs: `0 0 ${(props.xs / 12) * 100}%`, 
        md: props.md ? `0 0 ${(props.md / 12) * 100}%` : undefined 
      },
      px: 1,
      mb: 2
    }}>
      {children}
    </Box>
  );
};

const Grid.Container: React.FC<{ spacing: number; alignItems?: string; children: React.ReactNode }> = ({ 
  spacing, 
  alignItems,
  children 
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      mx: -spacing / 2,
      alignItems,
    }}>
      {children}
    </Box>
  );
};
