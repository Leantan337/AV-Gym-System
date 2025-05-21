import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
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
                src={member.photo_url}
                alt={`${member.first_name} ${member.last_name}`}
                sx={{ width: 150, height: 150, margin: '0 auto 16px' }}
              />
              <Typography variant="h6">
                {member.first_name} {member.last_name}
              </Typography>
              <Chip
                label={member.membership.status}
                color={
                  member.membership.status === 'active' ? 'success' :
                  member.membership.status === 'pending' ? 'warning' : 'error'
                }
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
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{member.email}</Typography>
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
                <Typography variant="body2" color="text.secondary">Membership Type</Typography>
                <Typography variant="body1">{member.membership.type}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1">{member.membership.status}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Join Date</Typography>
                <Typography variant="body1">{formatDate(member.membership.join_date)}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                <Typography variant="body1">{formatDate(member.membership.expiry_date)}</Typography>
              </Box>

              {/* Emergency Contact */}
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Emergency Contact</Typography>
                <Divider sx={{ my: 1 }} />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography variant="body1">{member.emergency_contact.name}</Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{member.emergency_contact.phone}</Typography>
              </Box>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary">Relationship</Typography>
                <Typography variant="body1">{member.emergency_contact.relationship}</Typography>
              </Box>

              {/* Access Privileges */}
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Access Privileges</Typography>
                <Divider sx={{ my: 1 }} />
              </Box>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {member.access_privileges.map((privilege, index) => (
                    <Chip key={index} label={privilege} color="primary" size="small" />
                  ))}
                </Box>
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
