import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Divider,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Preview as PreviewIcon,
  PersonSearch as PersonSearchIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_status: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  notification_type: string;
  subject: string;
}

interface BulkNotificationFormData {
  template_id: string;
  selected_members: string[];
  send_email: boolean;
  show_on_dashboard: boolean;
  custom_subject?: string;
  custom_message?: string;
}

interface NotificationPreview {
  subject: string;
  body_text: string;
  body_html?: string;
}

const DEFAULT_FORM_DATA: BulkNotificationFormData = {
  template_id: '',
  selected_members: [],
  send_email: true,
  show_on_dashboard: true,
  custom_subject: '',
  custom_message: ''
};

const BulkNotifications: React.FC = () => {
  const [formData, setFormData] = useState<BulkNotificationFormData>(DEFAULT_FORM_DATA);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<NotificationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Fetch templates and members on component mount
  useEffect(() => {
    fetchTemplates();
    fetchMembers();
  }, []);

  // Filter members based on search and status filter
  useEffect(() => {
    let filtered = [...members];
    
    // Apply search filter
    if (memberSearch) {
      const search = memberSearch.toLowerCase();
      filtered = filtered.filter(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.membership_status === statusFilter);
    }
    
    setFilteredMembers(filtered);
  }, [members, memberSearch, statusFilter]);

  // Fetch notification templates from the API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/templates/');
      setTemplates(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load notification templates');
      setLoading(false);
    }
  };

  // Fetch members from the API
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/members/');
      setMembers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load members');
      setLoading(false);
    }
  };

  // Handle form data changes
  const handleFormChange = (name: string, value: string | boolean | string[]) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle member selection changes
  const handleMemberSelection = (event: SelectChangeEvent<string[]>) => {
    const selectedIds = event.target.value as string[];
    handleFormChange('selected_members', selectedIds);
  };

  // Preview the notification before sending
  const handlePreview = async () => {
    if (!formData.template_id) {
      setError('Please select a template');
      return;
    }

    try {
      setPreviewLoading(true);
      const response = await axios.post(`/api/notifications/templates/${formData.template_id}/preview/`, {
        custom_subject: formData.custom_subject,
        custom_message: formData.custom_message
      });
      setPreviewData(response.data);
      setIsPreviewOpen(true);
      setPreviewLoading(false);
    } catch (err) {
      console.error('Error previewing notification:', err);
      setError('Failed to preview notification');
      setPreviewLoading(false);
    }
  };

  // Close the preview dialog
  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  // Send notifications to all selected members
  const handleSendNotifications = async () => {
    if (!formData.template_id) {
      setError('Please select a template');
      return;
    }

    if (formData.selected_members.length === 0) {
      setError('Please select at least one member');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await axios.post('/api/notifications/bulk-send/', {
        template_id: formData.template_id,
        member_ids: formData.selected_members,
        send_email: formData.send_email,
        show_on_dashboard: formData.show_on_dashboard,
        custom_subject: formData.custom_subject || undefined,
        custom_message: formData.custom_message || undefined
      });

      setSuccess(true);
      setFormData(DEFAULT_FORM_DATA);
      setLoading(false);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('Error sending notifications:', err);
      setError('Failed to send notifications');
      setLoading(false);
    }
  };

  // Reset form data
  const handleReset = () => {
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
    setSuccess(false);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">Bulk Notifications</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchMembers}
          disabled={loading}
        >
          Refresh Members
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Success</AlertTitle>
          Notifications sent successfully to {formData.selected_members.length} members.
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Step 1: Select Template</Typography>
        <FormControl fullWidth>
          <InputLabel>Notification Template</InputLabel>
          <Select
            value={formData.template_id}
            onChange={(e) => handleFormChange('template_id', e.target.value as string)}
            label="Notification Template"
          >
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} ({template.notification_type})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box mt={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.send_email}
                onChange={(e) => handleFormChange('send_email', e.target.checked)}
              />
            }
            label="Send Email"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.show_on_dashboard}
                onChange={(e) => handleFormChange('show_on_dashboard', e.target.checked)}
              />
            }
            label="Show on Dashboard"
          />
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>Step 2: Select Recipients</Typography>
        <Box mb={2}>
          <TextField
            fullWidth
            label="Search Members"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: <PersonSearchIcon />
            }}
          />
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as string)}
              label="Filter by Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
          
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {filteredMembers.length} members found. {formData.selected_members.length} selected.
            </Typography>
          </Box>
        </Box>
        
        <FormControl fullWidth>
          <InputLabel>Select Members</InputLabel>
          <Select
            multiple
            value={formData.selected_members}
            onChange={handleMemberSelection}
            input={<OutlinedInput label="Select Members" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => {
                  const member = members.find(m => m.id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={member ? `${member.first_name} ${member.last_name}` : value} 
                    />
                  );
                })}
              </Box>
            )}
          >
            {filteredMembers.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                <Checkbox checked={formData.selected_members.indexOf(member.id) > -1} />
                <ListItemText 
                  primary={`${member.first_name} ${member.last_name}`} 
                  secondary={`${member.email} - ${member.membership_status}`} 
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>Step 3: Customize (Optional)</Typography>
        <TextField
          fullWidth
          label="Custom Subject (Optional)"
          value={formData.custom_subject || ''}
          onChange={(e) => handleFormChange('custom_subject', e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Custom Message (Optional)"
          value={formData.custom_message || ''}
          onChange={(e) => handleFormChange('custom_message', e.target.value)}
          multiline
          rows={4}
        />
      </Box>

      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          startIcon={<PreviewIcon />}
          onClick={handlePreview}
          disabled={loading || previewLoading || !formData.template_id}
        >
          {previewLoading ? <CircularProgress size={24} /> : 'Preview'}
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSendNotifications}
            disabled={loading || formData.selected_members.length === 0 || !formData.template_id}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Notifications'}
          </Button>
        </Box>
      </Box>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onClose={handleClosePreview} maxWidth="md" fullWidth>
        <DialogTitle>Notification Preview</DialogTitle>
        <DialogContent dividers>
          {previewData && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Subject:</Typography>
              <Typography variant="body1" paragraph>{previewData.subject}</Typography>
              
              <Typography variant="subtitle1" gutterBottom>Message:</Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {previewData.body_text}
              </Typography>
              
              {previewData.body_html && (
                <Box mt={3}>
                  <Typography variant="subtitle1" gutterBottom>HTML Version:</Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, mt: 1, maxHeight: 300, overflow: 'auto' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: previewData.body_html }} />
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          <Button 
            variant="contained" 
            onClick={handleSendNotifications} 
            disabled={loading || formData.selected_members.length === 0}
          >
            Send Notifications
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BulkNotifications;