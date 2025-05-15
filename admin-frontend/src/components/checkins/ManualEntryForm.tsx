import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Autocomplete,
  Typography,
  Paper,
} from '@mui/material';
import { Search } from 'lucide-react';
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
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormInputs>();

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

  const onFormSubmit = async (data: FormInputs) => {
    if (!selectedMember) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(selectedMember.id);
      reset();
      setSelectedMember(null);
      setSearchQuery('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
        <Typography variant="h6" gutterBottom>
          Manual Check-In
        </Typography>
        
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
          noOptionsText={
            searchQuery.length < 2 
              ? "Type at least 2 characters to search" 
              : "No members found"
          }
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          disabled={isSubmitting || !selectedMember}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Check In'}
        </Button>

        {selectedMember && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Selected: {selectedMember.fullName}
            {selectedMember.membershipNumber && ` (${selectedMember.membershipNumber})`}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
