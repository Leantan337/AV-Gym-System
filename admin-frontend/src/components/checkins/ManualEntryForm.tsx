import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';

interface ManualEntryFormProps {
  onSubmit: (memberId: string) => void;
}

interface FormInputs {
  memberId: string;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>();

  const onFormSubmit = async (data: FormInputs) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data.memberId);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} sx={{ mt: 1 }}>
      <TextField
        {...register('memberId', {
          required: 'Member ID is required',
          pattern: {
            value: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
            message: 'Invalid Member ID format',
          },
        })}
        margin="normal"
        fullWidth
        label="Member ID"
        error={!!errors.memberId}
        helperText={errors.memberId?.message}
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isSubmitting}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Check In'}
      </Button>
    </Box>
  );
};
