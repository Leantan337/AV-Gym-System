import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Typography, Paper, Divider, Chip } from '@mui/material';
import { useCheckIn, CheckIn } from '../../hooks/useCheckIn';

export const CheckInList: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const { onCheckIn } = useCheckIn();

  useEffect(() => {
    const loadRecentCheckIns = async () => {
      try {
        const response = await fetch('/api/checkins/recent/');
        if (response.ok) {
          const data = await response.json();
          setCheckIns(data);
        }
      } catch (error) {
        console.error('Failed to load recent check-ins:', error);
      }
    };
    
    loadRecentCheckIns();
    
    // Now this will work correctly with proper typing
    const unsubscribe = onCheckIn((newCheckIn: CheckIn) => {
      setCheckIns(prev => [newCheckIn, ...prev].slice(0, 20));
    });
    
    return () => unsubscribe();
  }, [onCheckIn]);

  return (
    <Paper sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Recent Check-Ins
      </Typography>
      <List>
        {checkIns.length === 0 ? (
          <ListItem>
            <ListItemText primary="No recent check-ins" />
          </ListItem>
        ) : (
          checkIns.map((checkIn) => (
            <React.Fragment key={checkIn.id}>
              <ListItem>
                <ListItemText
                  primary={checkIn.member.full_name}
                  secondary={
                    <>
                      {new Date(checkIn.check_in_time).toLocaleString()}
                      {checkIn.location && ` • ${checkIn.location}`}
                    </>
                  }
                />
                <Chip
                  label={checkIn.member.membership_type}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  );
};