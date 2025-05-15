import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Skeleton,
  Tooltip,
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkOutMember } from '../../services/api';
import { format } from 'date-fns';

interface CheckIn {
  id: string;
  member: {
    id: string;
    fullName: string;
  };
  checkInTime: string;
  checkOutTime: string | null;
}

interface CheckInHistoryProps {
  checkIns: CheckIn[];
  isLoading: boolean;
}

export const CheckInHistory: React.FC<CheckInHistoryProps> = ({
  checkIns,
  isLoading,
}) => {
  const queryClient = useQueryClient();

  const checkOutMutation = useMutation({
    mutationFn: checkOutMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIns'] });
      queryClient.invalidateQueries({ queryKey: ['checkInStats'] });
    },
  });

  const handleCheckOut = (checkInId: string) => {
    checkOutMutation.mutate({ checkInId });
  };

  if (isLoading) {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Check-in Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Member</TableCell>
            <TableCell>Check-in Time</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {checkIns.map((checkIn) => (
            <TableRow key={checkIn.id}>
              <TableCell>{checkIn.member.fullName}</TableCell>
              <TableCell>
                {format(new Date(checkIn.checkInTime), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Chip
                  label={checkIn.checkOutTime ? 'Checked Out' : 'In Gym'}
                  color={checkIn.checkOutTime ? 'default' : 'success'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {!checkIn.checkOutTime && (
                  <Tooltip title="Check Out">
                    <IconButton
                      onClick={() => handleCheckOut(checkIn.id)}
                      disabled={checkOutMutation.isPending}
                      color="primary"
                      size="small"
                    >
                      <ExitToAppIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
