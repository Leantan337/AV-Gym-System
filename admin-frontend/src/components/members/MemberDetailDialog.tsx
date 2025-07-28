import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Chip,
  Box,
  Avatar,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon } from '@mui/icons-material';
import { Member } from '../../types/member.types';

interface MemberDetailDialogProps {
  open: boolean;
  member: Member;
  onClose: () => void;
  onEdit: () => void;
}

function MemberDetailDialog({ open, member, onClose, onEdit }: MemberDetailDialogProps) {
  // Format date string to local date format
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Member Details</Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Member Photo and Core Info */}
          <Box sx={{ width: { xs: '100%', md: '33.333%' } }}>
            <Box sx={{ textAlign: "center" }}>
              <Avatar
                src={member.image_url}
                alt={member.full_name}
                sx={{ width: 150, height: 150, margin: '0 auto 16px' }}
              />
              <Typography variant="h6">
                {member.full_name}
              </Typography>
              <Chip
                label={member.status}
                color={member.status === 'active' ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          {/* Contact Information */}
          <Box sx={{ width: { xs: '100%', md: '66.666%' } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold">Contact Information</Typography>
                <Divider sx={{ my: 1 }} />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{member.phone}</Typography>
              </Box>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body1">{member.address}</Typography>
              </Box>

              {/* Membership Details */}
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Membership Details</Typography>
                <Divider sx={{ my: 1 }} />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Membership Number</Typography>
                <Typography variant="body1">{member.membership_number}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1">{member.status}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Created Date</Typography>
                <Typography variant="body1">{member.created_at ? formatDate(member.created_at) : 'N/A'}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1">{member.updated_at ? formatDate(member.updated_at) : 'N/A'}</Typography>
              </Box>

              {/* Notes */}
              {member.notes && (
                <>
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body1">{member.notes}</Typography>
                  </Box>
                </>
              )}

              {/* Future Features Placeholder */}
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Additional Features</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Emergency contacts, access privileges, and membership plans will be available in future updates.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EditIcon />}
          onClick={onEdit}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MemberDetailDialog;