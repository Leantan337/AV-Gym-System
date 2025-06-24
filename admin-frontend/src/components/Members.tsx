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
  Checkbox,
  Button,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';

interface Member {
  id: string;
  full_name: string;
  status: string;
  phone: string;
  address: string;
}

interface MemberStats {
  member: {
    name: string;
    status: string;
  };
  subscription: {
    plan: string;
    end_date: string;
  };
  recent_checkins: Array<{
    check_in_time: string;
    check_out_time: string;
  }>;
  payment_history: Array<{
    amount: number;
    status: string;
    due_date: string;
  }>;
}

export const Members: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery<Member[]>({ queryKey: ['members'], queryFn: adminApi.getMembers });

  const { data: memberStats } = useQuery<MemberStats | null>({
    queryKey: ['memberStats', selectedMember],
    queryFn: () => selectedMember ? adminApi.getMemberStats(selectedMember) : null,
    enabled: !!selectedMember
  });

  const bulkActionMutation = useMutation<
    unknown,
    Error,
    { action: 'activate' | 'deactivate'; memberIds: string[] }
  >({
    mutationFn: ({ action, memberIds }) => adminApi.bulkMemberAction(action, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setSelected([]);
    }
  });

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(members.map((member: Member) => member.id));
    } else {
      setSelected([]);
    }
  };

  const handleDownloadIdCard = async () => {
    if (!selectedMember) return;
    try {
      await adminApi.downloadIdCard(selectedMember);
    } catch (error) {
      console.error('Failed to download ID card:', error);
      // TODO: Show error toast
    }
  };

  const handleClick = (id: string) => {
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

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleBulkAction = (action: 'activate' | 'deactivate') => {
    if (selected.length === 0) return;
    bulkActionMutation.mutate({ action, memberIds: selected });
  };

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
            Members
          </Typography>
          {selected.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleBulkAction('activate')}
                sx={{ mr: 1 }}
              >
                Activate Selected
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate Selected
              </Button>
            </Box>
          )}
        </Box>
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
                <TableCell>Status</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((member) => {
                  const isSelected = selected.indexOf(member.id) !== -1;

                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={-1}
                      key={member.id}
                      selected={isSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onClick={() => handleClick(member.id)}
                        />
                      </TableCell>
                      <TableCell>{member.full_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={member.status}
                          color={member.status === 'active' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>{member.address}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => setSelectedMember(member.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={members.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Member Details Dialog */}
      <Dialog
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Member Details</DialogTitle>
        <DialogContent>
          {memberStats && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">{memberStats?.member.name}</Typography>
              <Typography color="textSecondary" gutterBottom>
                Status: {memberStats?.member.status}
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Current Subscription
              </Typography>
              <Typography>
                Plan: {memberStats?.subscription.plan || 'No active subscription'}
                {memberStats?.subscription.end_date &&
                  ` (Expires: ${new Date(memberStats?.subscription.end_date || '').toLocaleDateString()})`}
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Recent Check-ins
              </Typography>
              {memberStats?.recent_checkins.map((checkin, index) => (
                <Typography key={index}>
                  {new Date(checkin.check_in_time).toLocaleString()} -{' '}
                  {checkin.check_out_time
                    ? new Date(checkin.check_out_time).toLocaleString()
                    : 'Not checked out'}
                </Typography>
              ))}

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Payment History
              </Typography>
              {memberStats?.payment_history.map((payment, index) => (
                <Typography key={index}>
                  ${payment.amount} - {payment.status} (Due: {new Date(payment.due_date).toLocaleDateString()})
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadIdCard} variant="contained" color="primary">
            Download ID Card
          </Button>
          <Button onClick={() => setSelectedMember(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
