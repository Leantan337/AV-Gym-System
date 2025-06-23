import React from 'react';
import { CheckInForm } from '../components/checkin/CheckInForm';
import { CheckInList } from '../components/checkin/CheckInList';
import { Grid } from '@mui/material';

export const DashboardPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <CheckInForm />
      </Grid>
      <Grid item xs={12} md={6}>
        <CheckInList />
      </Grid>
    </Grid>
  );
}; 