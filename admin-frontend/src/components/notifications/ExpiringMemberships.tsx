import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Button, Box, CircularProgress } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CelebrationIcon from '@mui/icons-material/Celebration';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Member {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
}

interface ExpiringMembership {
  id: string;
  member: Member;
  plan: Plan;
  end_date: string;
  days_remaining: number;
  status: string;
}

interface ExpiringMembershipsData {
  upcoming_expirations: ExpiringMembership[];
  total_count: number;
}

const ExpiringMemberships: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expiringMemberships, setExpiringMemberships] = useState<ExpiringMembershipsData | null>(null);

  useEffect(() => {
    const fetchExpiringMemberships = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/notifications/dashboard/expiring_memberships/');
        setExpiringMemberships(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching expiring memberships:', err);
        setError('Failed to load expiring memberships data');
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringMemberships();
    
    // Auto-refresh every 5 minutes
    const intervalId = setInterval(fetchExpiringMemberships, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const getSeverityLevel = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return 'error';
    if (daysRemaining <= 7) return 'warning';
    if (daysRemaining <= 15) return 'info';
    return 'success';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderIcon = (daysRemaining: number) => {
    if (daysRemaining <= 7) {
      return <WarningIcon color={daysRemaining <= 3 ? 'error' : 'warning'} />;
    }
    return <CelebrationIcon color="primary" />;
  };

  if (loading) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Expiring Memberships</Typography>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress size={40} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Expiring Memberships</Typography>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!expiringMemberships || expiringMemberships.upcoming_expirations.length === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Expiring Memberships</Typography>
          <Typography variant="body1">No memberships expiring soon.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Expiring Memberships ({expiringMemberships.total_count})
        </Typography>
        
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {expiringMemberships.upcoming_expirations.map((membership) => (
            <ListItem 
              key={membership.id} 
              divider 
              sx={{
                borderLeft: `4px solid ${{
                  error: '#f44336',
                  warning: '#ff9800',
                  info: '#2196f3',
                  success: '#4caf50'
                }[getSeverityLevel(membership.days_remaining)]}`,
                pl: 2,
                mb: 1,
                bgcolor: membership.days_remaining <= 3 ? 'rgba(244, 67, 54, 0.08)' : 'inherit'
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center">
                    {renderIcon(membership.days_remaining)}
                    <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold' }}>
                      {membership.member.name}
                    </Typography>
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      Plan: {membership.plan.name}
                    </Typography>
                    <br />
                    <Typography variant="body2" component="span">
                      Expires: {formatDate(membership.end_date)}
                    </Typography>
                  </>
                }
              />
              
              <Box display="flex" flexDirection="column" alignItems="flex-end">
                <Chip 
                  label={`${membership.days_remaining} days left`} 
                  color={getSeverityLevel(membership.days_remaining) as 'error' | 'warning' | 'info' | 'success'}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Button 
                  component={Link} 
                  to={`/members/${membership.member.id}`} 
                  size="small" 
                  variant="outlined"
                >
                  View Member
                </Button>
              </Box>
            </ListItem>
          ))}
        </List>
        
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button 
            component={Link} 
            to="/subscriptions" 
            color="primary"
          >
            View All Subscriptions
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ExpiringMemberships;
