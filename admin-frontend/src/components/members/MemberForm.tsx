import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  IconButton,
  Typography,
  Divider,
  Avatar,
  SelectChangeEvent
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Use the updated types that match the backend
import { Member, MemberFormData, transformFormToApi, transformApiToForm } from '../../types/member.types';
import { memberApi } from '../../services/memberApi';

interface MemberFormProps {
  open: boolean;
  member?: Member;
  onClose: (success?: boolean) => void;
}

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

// Default form data
const defaultFormData: MemberFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
  notes: '',
};

function MemberForm({ open, member, onClose }: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      setFormData(transformApiToForm(member));
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
    setPhotoFile(null);
  }, [member, open]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: MemberFormData) => memberApi.createMember(transformFormToApi(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose(true);
    },
    onError: (error) => {
      console.error('Failed to create member:', error);
      setErrors({ submit: 'Failed to create member. Please check all fields and try again.' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MemberFormData }) => 
      memberApi.updateMember(id, transformFormToApi(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose(true);
    },
    onError: (error) => {
      console.error('Failed to update member:', error);
      setErrors({ submit: 'Failed to update member. Please check all fields and try again.' });
    }
  });

  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      return memberApi.uploadMemberPhoto(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      console.error('Failed to upload photo:', error);
    }
  });

  // Handle input changes
  const handleInputChange = (field: keyof MemberFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle select changes
  const handleSelectChange = (field: keyof MemberFormData) => (
    event: SelectChangeEvent<string>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user makes selection
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      newErrors['first_name'] = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors['last_name'] = 'Last name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors['phone'] = 'Phone number is required';
    }
    
    if (!formData.address.trim()) {
      newErrors['address'] = 'Address is required';
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

  // Handle close
  const handleClose = () => {
    setFormData(defaultFormData);
    setErrors({});
    setPhotoFile(null);
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || photoUploadMutation.isPending;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {member ? 'Edit Member' : 'Add New Member'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Photo Upload Section */}
        <PhotoUploadComponent
          initialPhotoUrl={member?.image_url}
          onPhotoSelect={setPhotoFile}
        />

        <Divider sx={{ my: 3 }} />

        {/* Basic Information */}
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <TextField
            label="First Name"
            value={formData.first_name}
            onChange={handleInputChange('first_name')}
            error={!!errors.first_name}
            helperText={errors.first_name}
            required
            fullWidth
          />
          <TextField
            label="Last Name"
            value={formData.last_name}
            onChange={handleInputChange('last_name')}
            error={!!errors.last_name}
            helperText={errors.last_name}
            required
            fullWidth
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <TextField
            label="Email (Optional)"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email || 'Email is not saved to the backend yet'}
            fullWidth
          />
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={handleInputChange('phone')}
            error={!!errors.phone}
            helperText={errors.phone}
            required
            fullWidth
          />
        </Box>

        <TextField
          label="Address"
          value={formData.address}
          onChange={handleInputChange('address')}
          error={!!errors.address}
          helperText={errors.address}
          required
          fullWidth
          multiline
          rows={2}
          sx={{ mb: 3 }}
        />

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={formData.status}
            label="Status"
            onChange={handleSelectChange('status')}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Notes (Optional)"
          value={formData.notes}
          onChange={handleInputChange('notes')}
          fullWidth
          multiline
          rows={3}
          sx={{ mb: 3 }}
        />

        {/* Error Display */}
        {errors.submit && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error" variant="body2">
              {errors.submit}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (member ? 'Update Member' : 'Create Member')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MemberForm;