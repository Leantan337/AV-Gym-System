import React, { useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  Grid,
  Paper,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import ReportGenerator from './ReportGenerator';
import axios from 'axios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ReportJobSummary {
  id: number;
  report_type_display: string;
  export_format_display: string;
  created_at: string;
  status: string;
}

const ReportPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentReports, setRecentReports] = useState<ReportJobSummary[]>([]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  useEffect(() => {
    const fetchRecentReports = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/reports/');
        // Get the 10 most recent reports
        setRecentReports(response.data.slice(0, 10));
      } catch (error) {
        console.error('Error fetching recent reports:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentReports();
  }, []);
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="report tabs"
        >
          <Tab label="Generate Reports" />
          <Tab label="Recent Reports" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <ReportGenerator />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : recentReports.length > 0 ? (
            <Grid container spacing={3}>
              {recentReports.map((report) => (
                <Grid item xs={12} key={report.id}>
                  <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">
                        {report.report_type_display} ({report.export_format_display})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(report.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          color: report.status === 'COMPLETED' ? 'success.main' : 
                                report.status === 'PROCESSING' ? 'info.main' : 'error.main',
                          mr: 2
                        }}
                      >
                        {report.status}
                      </Typography>
                      {report.status === 'COMPLETED' && (
                        <a 
                          href={`/api/reports/${report.id}/download/`} 
                          style={{ textDecoration: 'none' }}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box p={3} textAlign="center">
              <Typography>No recent reports found.</Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ReportPage;
