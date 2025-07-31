import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Typography, Paper, Divider, Chip } from '@mui/material';
import { useCheckIn, CheckIn } from '../../hooks/useCheckIn';
import { api } from '../../services/api'; // Add this import

export const CheckInList: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const { onCheckIn } = useCheckIn();

  useEffect(() => {
    const loadRecentCheckIns = async () => {
      try {
        // ✅ Use API service instead of raw fetch
        const response = await api.get('/checkins/recent/');
        setCheckIns(response.data);
      } catch (error) {
        console.error('Failed to load recent check-ins:', error);
      }
    };
    
    loadRecentCheckIns();
    
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