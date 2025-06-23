import React, { useState } from 'react';
import { 
  Box,
  Tabs,
  Tab,
  Typography,
  Container
} from '@mui/material';
import NotificationTemplateEditor from './NotificationTemplateEditor';
import NotificationLogs from './NotificationLogs';
import TemplateTestingTool from './TemplateTestingTool';
import NotificationScheduler from './NotificationScheduler';
import BulkNotifications from './BulkNotifications';
import NotificationMetrics from './NotificationMetrics';

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
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `notification-tab-${index}`,
    'aria-controls': `notification-tabpanel-${index}`,
  };
}

const NotificationPage: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box mb={3}>
        <Typography variant="h4" component="h1">Notification Management</Typography>
        <Typography variant="body1" color="textSecondary">
          Manage email templates, schedules, and view notification history
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="notification management tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Templates" {...a11yProps(0)} />
          <Tab label="Notification Logs" {...a11yProps(1)} />
          <Tab label="Template Testing" {...a11yProps(2)} />
          <Tab label="Schedule Manager" {...a11yProps(3)} />
          <Tab label="Bulk Notifications" {...a11yProps(4)} />
          <Tab label="Metrics Dashboard" {...a11yProps(5)} />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <NotificationTemplateEditor />
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <NotificationLogs />
      </TabPanel>
      
      <TabPanel value={value} index={2}>
        <TemplateTestingTool />
      </TabPanel>
      
      <TabPanel value={value} index={3}>
        <NotificationScheduler />
      </TabPanel>
      
      <TabPanel value={value} index={4}>
        <BulkNotifications />
      </TabPanel>
      
      <TabPanel value={value} index={5}>
        <NotificationMetrics />
      </TabPanel>
    </Container>
  );
};

export default NotificationPage;
