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
  TablePagination,
  TextField,
  Button,
  Chip,
  Typography,
  IconButton,
  Toolbar,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Search as SearchIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Member } from '../../types/member.types';
// Import from the barrel file to fix module resolution issues
import { MemberDetailDialog, MemberForm } from '.';
import { adminApi } from '../../services/api';

export default function MemberListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const queryClient = useQueryClient();

  // Fetch members data
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => adminApi.getMembers().then(apiMembers => {
      // Convert API member format to our Member type format
      return apiMembers.map(apiMember => ({
        id: apiMember.id,
        first_name: apiMember.full_name.split(' ')[0] || '',
        last_name: apiMember.full_name.split(' ').slice(1).join(' ') || '',
        email: `${apiMember.full_name.split(' ')[0].toLowerCase()}@example.com`, // Mock email data as it's not in the API response
        phone: apiMember.phone,
        address: apiMember.address,
        photo_url: apiMember.image_url,
        membership: {
          type: 'Standard', // Mock data as it's not in the API response
          status: apiMember.status as 'active' | 'inactive' | 'pending',
          join_date: new Date().toISOString().split('T')[0], // Mock join date
          expiry_date: new Date(Date.now() + 31536000000).toISOString().split('T')[0] // Mock expiry date (1 year from now)
        },
        emergency_contact: {
          name: 'Emergency Contact', // Mock data as it's not in the API response
          phone: '555-123-4567',
          relationship: 'Family'
        },
        access_privileges: ['Gym Access'] // Mock data as it's not in the API response
      }));
    })
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });

  // Filter members based on search term
  const filteredMembers = members.filter((member: Member) => 
    member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm)
  );

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle view member details
  const handleViewMember = (member: Member) => {
    setSelectedMember(member);
    setOpenDetailDialog(true);
  };

  // Handle edit member
  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setOpenFormDialog(true);
  };

  // Handle delete member
  const handleDeleteMember = (id: string) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      deleteMutation.mutate(id);
    }
  };

  // Handle add new member
  const handleAddMember = () => {
    setSelectedMember(null);
    setOpenFormDialog(true);
  };

  // Handle form dialog close
  const handleFormDialogClose = (refreshData?: boolean) => {
    setOpenFormDialog(false);
    if (refreshData) {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
          <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">
            Members
          </Typography>
          <TextField
            size="small"
            placeholder="Search members"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mr: 2, width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Filter list">
            <IconButton>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddMember}
          >
            Add Member
          </Button>
        </Toolbar>
        <TableContainer>
          {isLoading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : filteredMembers.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>No members found</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Membership Status</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMembers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((member: Member) => (
                    <TableRow key={member.id} hover>
                      <TableCell 
                        onClick={() => handleViewMember(member)} 
                        sx={{ cursor: 'pointer' }}
                      >
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>
                        <Chip 
                          label={member.membership.status} 
                          color={member.membership.status === 'active' ? 'success' : 
                                 member.membership.status === 'pending' ? 'warning' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(member.membership.expiry_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleEditMember(member)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            onClick={() => handleDeleteMember(member.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredMembers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Member Detail Dialog */}
      {selectedMember && (
        <MemberDetailDialog
          open={openDetailDialog}
          member={selectedMember}
          onClose={() => setOpenDetailDialog(false)}
          onEdit={() => {
            setOpenDetailDialog(false);
            setOpenFormDialog(true);
          }}
        />
      )}

      {/* Member Form Dialog */}
      <MemberForm
        open={openFormDialog}
        member={selectedMember}
        onClose={handleFormDialogClose}
      />
    </Box>
  );
}
