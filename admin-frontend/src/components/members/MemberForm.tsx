import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  IconButton,
  Typography,
  Chip,
  Divider,
  FormHelperText,
  RadioGroup,
  Radio,
  FormControlLabel,
  Avatar
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Use relative import that will work once all files are created
import { Member, MemberCreateUpdate } from '../../types/member.types';

// Temporary placeholder until PhotoUploadComponent is available
const PhotoUploadComponent = ({ initialPhotoUrl, onPhotoSelect }: { initialPhotoUrl?: string; onPhotoSelect: (file: File | null) => void }) => {
  return (
    <Box sx={{ textAlign: 'center', mb: 2 }}>
      <Avatar
        src={initialPhotoUrl}
        sx={{ width: 150, height: 150, margin: '0 auto 16px' }}
      />
      <Button variant="outlined" component="label">
        Upload Photo
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onPhotoSelect(file);
          }}
        />
      </Button>
    </Box>
  );
};
import { adminApi } from '../../services/api';

interface MemberFormProps {
  open: boolean;
  member: Member | null; // If provided, we're in edit mode
  onClose: (refreshData?: boolean) => void;
}

// Privilege options for multi-select
const ACCESS_PRIVILEGES = [
  'Gym Access', 
  'Pool Access', 
  'Sauna Access', 
  'Group Classes', 
  'Personal Training', 
  '24/7 Access'
];

// Membership type options
const MEMBERSHIP_TYPES = [
  'Standard', 
  'Premium', 
  'VIP', 
  'Family', 
  'Student', 
  'Senior'
];

const defaultMember: MemberCreateUpdate = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  membership: {
    type: 'Standard',
    status: 'pending',
    join_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  },
  emergency_contact: {
    name: '',
    phone: '',
    relationship: '',
  },
  access_privileges: ['Gym Access'],
};

function MemberForm({ open, member, onClose }: MemberFormProps) {
  const [formData, setFormData] = useState<MemberCreateUpdate>(defaultMember);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Create an instance of FormData for photo upload
  const createFormData = (file: File): FormData => {
    const formData = new FormData();
    formData.append('photo', file);
    return formData;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose(true);
    },
    onError: (error) => {
      console.error('Failed to create member:', error);
      // Handle API errors here
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      adminApi.updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose(true);
    },
    onError: (error) => {
      console.error('Failed to update member:', error);
      // Handle API errors here
    }
  });

  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => 
      adminApi.uploadMemberPhoto(id, createFormData(file)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      console.error('Failed to upload photo:', error);
      // Handle API errors here
    }
  });

  // Initialize form with member data if in edit mode
  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone,
        address: member.address,
        membership: {
          type: member.membership.type,
          status: member.membership.status,
          join_date: member.membership.join_date,
          expiry_date: member.membership.expiry_date,
        },
        emergency_contact: {
          name: member.emergency_contact.name,
          phone: member.emergency_contact.phone,
          relationship: member.emergency_contact.relationship,
        },
        access_privileges: [...member.access_privileges],
      });
    } else {
      // Reset to default values for new member
      setFormData({...defaultMember});
    }
    // Clear errors when dialog opens/closes
    setErrors({});
  }, [member, open]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | any) => {
    // Handle both React.ChangeEvent and Material-UI's Select onChange
    const name = e.target?.name;
    const value = e.target?.value;
    
    if (!name) return;
    
    // Handle nested objects (membership, emergency_contact)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        // Get the parent object or use empty object as fallback
        const parentObj = prev[parent as keyof typeof prev] || {};
        
        return {
          ...prev,
          [parent]: {
            ...(parentObj as object), // Cast to object to ensure it can be spread
            [child]: value,
          },
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle date changes
  const handleDateChange = (field: 'join_date' | 'expiry_date', date: Date | null) => {
    if (!date) return;
    
    setFormData(prev => ({
      ...prev,
      membership: {
        ...prev.membership,
        [field]: date.toISOString().split('T')[0],
      },
    }));

    // Clear error if exists
    if (errors[`membership.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`membership.${field}`];
        return newErrors;
      });
    }
  };

  // Handle privileges selection
  const handlePrivilegeToggle = (privilege: string) => {
    setFormData(prev => {
      const currentPrivileges = [...prev.access_privileges];
      const index = currentPrivileges.indexOf(privilege);
      
      if (index === -1) {
        // Add privilege
        return {
          ...prev,
          access_privileges: [...currentPrivileges, privilege],
        };
      } else {
        // Remove privilege
        currentPrivileges.splice(index, 1);
        return {
          ...prev,
          access_privileges: currentPrivileges,
        };
      }
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Basic validation
    if (!formData.first_name.trim()) newErrors['first_name'] = 'First name is required';
    if (!formData.last_name.trim()) newErrors['last_name'] = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors['email'] = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors['email'] = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors['phone'] = 'Phone is required';
    if (!formData.address.trim()) newErrors['address'] = 'Address is required';
    
    // Membership validation
    if (!formData.membership.type) newErrors['membership.type'] = 'Membership type is required';
    if (!formData.membership.join_date) newErrors['membership.join_date'] = 'Join date is required';
    if (!formData.membership.expiry_date) newErrors['membership.expiry_date'] = 'Expiry date is required';
    
    // Emergency contact validation
    if (!formData.emergency_contact.name.trim()) {
      newErrors['emergency_contact.name'] = 'Emergency contact name is required';
    }
    if (!formData.emergency_contact.phone.trim()) {
      newErrors['emergency_contact.phone'] = 'Emergency contact phone is required';
    }
    if (!formData.emergency_contact.relationship.trim()) {
      newErrors['emergency_contact.relationship'] = 'Relationship is required';
    }
    
    // Access privileges validation
    if (formData.access_privileges.length === 0) {
      newErrors['access_privileges'] = 'At least one access privilege is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (member) {
        // Update existing member
        await updateMutation.mutateAsync({ id: member.id, data: formData });
        
        // Upload photo if selected
        if (photoFile) {
          await photoUploadMutation.mutateAsync({ id: member.id, file: photoFile });
        }
      } else {
        // Create new member
        const newMember = await createMutation.mutateAsync(formData);
        
        // Upload photo if selected for new member
        if (photoFile && newMember && newMember.id) {
          await photoUploadMutation.mutateAsync({ id: newMember.id, file: photoFile });
        }
      }
    } catch (error) {
      console.error('Error saving member:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {member ? 'Edit Member' : 'Add New Member'}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={() => onClose(false)} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Left Column - Basic Info + Photo */}
          <Box sx={{ width: { xs: '100%', md: '33.333%' } }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Member Photo
              </Typography>
              <PhotoUploadComponent
                initialPhotoUrl={member?.photo_url}
                onPhotoSelect={setPhotoFile}
              />
            </Box>
            
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Access Privileges
            </Typography>
            <FormControl 
              fullWidth 
              error={!!errors['access_privileges']}
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {ACCESS_PRIVILEGES.map((privilege) => (
                  <Chip
                    key={privilege}
                    label={privilege}
                    onClick={() => handlePrivilegeToggle(privilege)}
                    color={formData.access_privileges.includes(privilege) ? 'primary' : 'default'}
                    variant={formData.access_privileges.includes(privilege) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {errors['access_privileges'] && (
                <FormHelperText error>{errors['access_privileges']}</FormHelperText>
              )}
            </FormControl>
          </Box>

          {/* Right Column - Member Details */}
          <Box sx={{ width: { xs: '100%', md: '66.666%' } }}>
            {/* Personal Information */}
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  error={!!errors['first_name']}
                  helperText={errors['first_name']}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  error={!!errors['last_name']}
                  helperText={errors['last_name']}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors['email']}
                  helperText={errors['email']}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!errors['phone']}
                  helperText={errors['phone']}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  error={!!errors['address']}
                  helperText={errors['address']}
                  required
                />
              </Box>
            </Box>

            {/* Membership Information */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>
              Membership Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControl fullWidth error={!!errors['membership.type']}>
                  <InputLabel id="membership-type-label">Membership Type</InputLabel>
                  <Select
                    labelId="membership-type-label"
                    name="membership.type"
                    value={formData.membership.type}
                    onChange={handleChange}
                    label="Membership Type"
                    required
                  >
                    {MEMBERSHIP_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                  {errors['membership.type'] && (
                    <FormHelperText>{errors['membership.type']}</FormHelperText>
                  )}
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <FormControl fullWidth>
                  <InputLabel id="membership-status-label">Status</InputLabel>
                  <Select
                    labelId="membership-status-label"
                    name="membership.status"
                    value={formData.membership.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Join Date"
                    value={new Date(formData.membership.join_date)}
                    onChange={(date) => handleDateChange('join_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors['membership.join_date'],
                        helperText: errors['membership.join_date'],
                        required: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Expiry Date"
                    value={new Date(formData.membership.expiry_date)}
                    onChange={(date) => handleDateChange('expiry_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors['membership.expiry_date'],
                        helperText: errors['membership.expiry_date'],
                        required: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </Box>

            {/* Emergency Contact */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>
              Emergency Contact
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Name"
                  name="emergency_contact.name"
                  value={formData.emergency_contact.name}
                  onChange={handleChange}
                  error={!!errors['emergency_contact.name']}
                  helperText={errors['emergency_contact.name']}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="emergency_contact.phone"
                  value={formData.emergency_contact.phone}
                  onChange={handleChange}
                  error={!!errors['emergency_contact.phone']}
                  helperText={errors['emergency_contact.phone']}
                  required
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Relationship"
                  name="emergency_contact.relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={handleChange}
                  error={!!errors['emergency_contact.relationship']}
                  helperText={errors['emergency_contact.relationship']}
                  required
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending || photoUploadMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending || photoUploadMutation.isPending
            ? 'Saving...'
            : member ? 'Update Member' : 'Create Member'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MemberForm;
