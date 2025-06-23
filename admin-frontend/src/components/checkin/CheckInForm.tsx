import React, { useState, useEffect } from 'react';
import { useCheckIn } from '../../hooks/useCheckIn';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';

export const CheckInForm: React.FC = () => {
  const [memberId, setMemberId] = useState('');
  const [location, setLocation] = useState('Main Entrance');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { checkInMember, onCheckIn } = useCheckIn();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await checkInMember({
        memberId: memberId.trim(),
        location,
        notes: notes || undefined,
        timestamp: new Date().toISOString(),
      });
      setSuccess(true);
      setMemberId('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in member');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onCheckIn(() => {
      // Optionally show a toast or notification
      // console.log('New check-in');
    });
    return () => unsubscribe();
  }, [onCheckIn]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Member Check-In
      </Typography>
      <TextField
        fullWidth
        label="Member ID or Barcode"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        margin="normal"
        autoFocus
        disabled={isLoading}
      />
      <TextField
        fullWidth
        select
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        margin="normal"
        SelectProps={{ native: true }}
        disabled={isLoading}
      >
        <option value="Main Entrance">Main Entrance</option>
        <option value="Side Entrance">Side Entrance</option>
        <option value="Reception">Reception</option>
      </TextField>
      <TextField
        fullWidth
        label="Notes (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        margin="normal"
        multiline
        rows={2}
        disabled={isLoading}
      />
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success.main" sx={{ mt: 2 }}>
          Member checked in successfully!
        </Typography>
      )}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading || !memberId.trim()}
        fullWidth
        sx={{ mt: 3 }}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Check In Member'}
      </Button>
    </Box>
  );
}; 