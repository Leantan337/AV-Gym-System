import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Autocomplete,
  Typography,
  Paper,
  Chip,
  Avatar,
  Alert,
  IconButton,
} from '@mui/material';
import { Search, X, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { searchMembers } from '../../services/api';

interface Member {
  id: string;
  fullName: string;
  membershipNumber?: string;
}

interface ManualEntryFormProps {
  onSubmit: (memberId: string) => void;
}

interface FormInputs {
  memberId: string;
  searchQuery: string;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { handleSubmit, reset, setValue } = useForm<FormInputs>();

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchMembers(searchQuery);
          setMembers(results);
        } catch (error) {
          console.error('Failed to search members:', error);
          setMembers([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setMembers([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const onFormSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member first');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSubmit(selectedMember.id);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reset form after successful submission
      reset();
      setSelectedMember(null);
      setSearchQuery('');
    } catch (err) {
      setError('Failed to check in member. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const clearSelection = () => {
    setSelectedMember(null);
    setSearchQuery('');
    reset();
  };

  return (
    <Paper 
      sx={{ 
        p: 3,
        border: success ? '1px solid rgba(46, 125, 50, 0.2)' : 
               error ? '1px solid rgba(211, 47, 47, 0.2)' : 'none',
        backgroundColor: success ? 'rgba(46, 125, 50, 0.04)' : 
                        error ? 'rgba(211, 47, 47, 0.04)' : 'background.paper',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <X fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setSuccess(false)}
            >
              <X fontSize="inherit" />
            </IconButton>
          }
        >
          Member checked in successfully!
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <UserCheck size={24} />
          <Typography variant="h6">
            Manual Check-In
          </Typography>
        </Box>
        
        <Autocomplete
          value={selectedMember}
          onChange={(_, newValue) => {
            setSelectedMember(newValue);
            if (newValue) {
              setValue('memberId', newValue.id);
            }
          }}
          inputValue={searchQuery}
          onInputChange={(_, newValue) => setSearchQuery(newValue)}
          options={members}
          getOptionLabel={(option) => 
            `${option.fullName}${option.membershipNumber ? ` (${option.membershipNumber})` : ''}`
          }
          loading={isSearching}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Member"
              placeholder="Start typing name or member number..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <Search size={20} style={{ color: 'rgba(0, 0, 0, 0.54)', marginRight: 8 }} />
                ),
                endAdornment: (
                  <>
                    {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    mr: 1, 
                    bgcolor: option.membershipNumber ? 'primary.main' : 'grey.400' 
                  }}
                >
                  {option.fullName.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">{option.fullName}</Typography>
                  {option.membershipNumber && (
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.membershipNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            </li>
          )}
          noOptionsText={
            searchQuery.length < 2 
              ? "Type at least 2 characters to search" 
              : "No members found"
          }
        />
        
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          {selectedMember && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={clearSelection}
              disabled={isSubmitting}
              sx={{ flex: 1 }}
            >
              Clear
            </Button>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting || !selectedMember}
            sx={{ flex: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Check In Member'}
          </Button>
        </Box>

        {selectedMember && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Selected Member:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: 'primary.main' 
                }}
              >
                {selectedMember.fullName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1">{selectedMember.fullName}</Typography>
                {selectedMember.membershipNumber && (
                  <Chip 
                    size="small" 
                    label={`ID: ${selectedMember.membershipNumber}`} 
                    color="primary" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};