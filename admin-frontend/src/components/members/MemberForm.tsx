import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { Save, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

// Define validation schema
const validationSchema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup.string().matches(
    /^[0-9\-\+\(\)\s]+$/,
    'Phone number must contain only numbers and symbols'
  ),
  address: yup.string(),
  membershipNumber: yup.string(),
  status: yup.string().required('Status is required'),
  membershipPlan: yup.string(),
  startDate: yup.date().nullable(),
  endDate: yup.date().nullable().min(
    yup.ref('startDate'),
    'End date must be after start date'
  ),
  emergencyContact: yup.object().shape({
    name: yup.string(),
    phone: yup.string().matches(
      /^[0-9\-\+\(\)\s]+$/,
      'Phone number must contain only numbers and symbols'
    ),
    relationship: yup.string(),
  }),
});

// Define form field types
interface MemberFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  membershipNumber: string;
  status: 'active' | 'inactive' | 'pending';
  membershipPlan: string;
  startDate: string | null;
  endDate: string | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  accessPrivileges: string[];
}

interface MemberFormProps {
  memberId?: string; // If provided, we're editing; otherwise, creating
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export const MemberForm: React.FC<MemberFormProps> = ({ 
  memberId, 
  onSuccess, 
  onCancel 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableAccessPrivileges, setAvailableAccessPrivileges] = useState<string[]>([
    'gym', 'pool', 'spa', 'classes', 'personal_training', '24_hour_access'
  ]);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  
  // Set up react-hook-form
  const { 
    control, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting }, 
    setValue,
    watch
  } = useForm<MemberFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      membershipNumber: '',
      status: 'pending',
      membershipPlan: '',
      startDate: null,
      endDate: null,
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      accessPrivileges: [],
    },
  });

  // Watch membership plan to conditionally show date fields
  const membershipPlan = watch('membershipPlan');
  
  // Fetch member data if editing
  useEffect(() => {
    const fetchMemberData = async () => {
      if (memberId) {
        setIsLoading(true);
        try {
          const member = await adminApi.getMemberById(memberId);
          
          // Populate form with member data
          setValue('fullName', member.fullName);
          setValue('email', member.email);
          setValue('phone', member.phone || '');
          setValue('address', member.address || '');
          setValue('membershipNumber', member.membershipNumber || '');
          setValue('status', member.status);
          setValue('membershipPlan', member.membership?.plan || '');
          setValue('startDate', member.membership?.startDate || null);
          setValue('endDate', member.membership?.endDate || null);
          
          if (member.emergencyContact) {
            setValue('emergencyContact.name', member.emergencyContact.name || '');
            setValue('emergencyContact.phone', member.emergencyContact.phone || '');
            setValue('emergencyContact.relationship', member.emergencyContact.relationship || '');
          }
          
          // Set selected privileges
          if (member.accessPrivileges) {
            const activePrivileges = member.accessPrivileges
              .filter(p => p.active)
              .map(p => p.name);
            setSelectedPrivileges(activePrivileges);
          }
          
        } catch (err) {
          setError(`Failed to load member data: ${(err as Error).message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchMemberData();
  }, [memberId, setValue]);
  
  // Mutations for create and update
  const createMemberMutation = useMutation({
    mutationFn: adminApi.createMember,
    onSuccess: (data) => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onSuccess?.(data);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(`Failed to create member: ${err.message}`);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateMember(memberId as string, data),
    onSuccess: (data) => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      onSuccess?.(data);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(`Failed to update member: ${err.message}`);
    },
  });

  // Toggle privilege selection
  const handlePrivilegeToggle = (privilege: string) => {
    setSelectedPrivileges(prev => 
      prev.includes(privilege)
        ? prev.filter(p => p !== privilege)
        : [...prev, privilege]
    );
  };

  // Form submission
  const onSubmit = (data: MemberFormData) => {
    // Add selected privileges to the form data
    const formData = {
      ...data,
      accessPrivileges: selectedPrivileges,
    };
    
    if (memberId) {
      updateMemberMutation.mutate(formData);
    } else {
      createMemberMutation.mutate(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {memberId ? 'Edit Member' : 'Create New Member'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Member {memberId ? 'updated' : 'created'} successfully!
          </Alert>
        )}
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Full Name"
                    required
                    fullWidth
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    required
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="membershipNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Membership Number"
                    fullWidth
                    error={!!errors.membershipNumber}
                    helperText={errors.membershipNumber?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Address"
                    fullWidth
                    multiline
                    rows={2}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Membership Details
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select
                      {...field}
                      labelId="status-label"
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                    </Select>
                    {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="membershipPlan"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.membershipPlan}>
                    <InputLabel id="plan-label">Membership Plan</InputLabel>
                    <Select
                      {...field}
                      labelId="plan-label"
                      label="Membership Plan"
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="basic">Basic</MenuItem>
                      <MenuItem value="standard">Standard</MenuItem>
                      <MenuItem value="premium">Premium</MenuItem>
                      <MenuItem value="corporate">Corporate</MenuItem>
                    </Select>
                    {errors.membershipPlan && <FormHelperText>{errors.membershipPlan.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>
            
            {membershipPlan && (
              <>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Start Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.startDate}
                        helperText={errors.startDate?.message}
                        value={field.value || ''}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="End Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.endDate}
                        helperText={errors.endDate?.message}
                        value={field.value || ''}
                      />
                    )}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Access Privileges
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select which facilities this member can access:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {availableAccessPrivileges.map(privilege => (
                <Chip
                  key={privilege}
                  label={privilege.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  color={selectedPrivileges.includes(privilege) ? 'primary' : 'default'}
                  onClick={() => handlePrivilegeToggle(privilege)}
                  clickable
                />
              ))}
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Emergency Contact
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Controller
                name="emergencyContact.name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contact Name"
                    fullWidth
                    error={!!errors.emergencyContact?.name}
                    helperText={errors.emergencyContact?.name?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Controller
                name="emergencyContact.phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contact Phone"
                    fullWidth
                    error={!!errors.emergencyContact?.phone}
                    helperText={errors.emergencyContact?.phone?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Controller
                name="emergencyContact.relationship"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Relationship"
                    fullWidth
                    error={!!errors.emergencyContact?.relationship}
                    helperText={errors.emergencyContact?.relationship?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<X />}
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? 'Saving...' : memberId ? 'Update Member' : 'Create Member'}
        </Button>
      </Box>
    </Box>
  );
};
