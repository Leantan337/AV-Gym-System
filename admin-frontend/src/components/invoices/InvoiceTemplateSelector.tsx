import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Preview as PreviewIcon, Check as CheckIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { InvoiceTemplate } from '../../types/invoice';
import { invoiceApi } from '../../services/invoiceApi';

interface InvoiceTemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  onPreview?: (template: InvoiceTemplate) => void;
  showPreview?: boolean;
  variant?: 'dropdown' | 'cards';
  disabled?: boolean;
}

export const InvoiceTemplateSelector: React.FC<InvoiceTemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
  onPreview,
  showPreview = true,
  variant = 'dropdown',
  disabled = false,
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['invoiceTemplates'],
    queryFn: invoiceApi.getTemplates,
  });

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    const templateId = event.target.value;
    onTemplateSelect(templateId);
  };

  const handleCardClick = (templateId: string) => {
    if (!disabled) {
      onTemplateSelect(templateId);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent, template: InvoiceTemplate) => {
    e.stopPropagation();
    onPreview?.(template);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load invoice templates. Please try again.
      </Alert>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Alert severity="info">
        No invoice templates available. Please create a template first.
      </Alert>
    );
  }

  if (variant === 'dropdown') {
    return (
      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="template-select-label">Select Invoice Template</InputLabel>
        <Select
          labelId="template-select-label"
          value={selectedTemplateId || ''}
          onChange={handleTemplateChange}
          label="Select Invoice Template"
          displayEmpty
        >
          <MenuItem value="">
            <em>Choose a template...</em>
          </MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1">{template.name}</Typography>
                  {template.description && (
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  )}
                </Box>
                {showPreview && (
                  <Tooltip title="Preview Template">
                    <IconButton
                      size="small"
                      onClick={(e) => handlePreviewClick(e, template)}
                      sx={{ ml: 1 }}
                    >
                      <PreviewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Invoice Template
      </Typography>
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                cursor: disabled ? 'default' : 'pointer',
                border: selectedTemplateId === template.id ? 2 : 1,
                borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                position: 'relative',
                transition: 'all 0.2s',
                '&:hover': disabled ? {} : {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                },
                opacity: disabled ? 0.6 : 1,
              }}
              onClick={() => handleCardClick(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              {/* Template preview thumbnail area */}
              <CardMedia
                sx={{
                  height: 120,
                  backgroundColor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    width: 80,
                    height: 100,
                    backgroundColor: 'white',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Invoice Preview
                  </Typography>
                </Paper>
                
                {/* Selection indicator */}
                {selectedTemplateId === template.id && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'primary.main',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon sx={{ color: 'white', fontSize: 16 }} />
                  </Box>
                )}

                {/* Preview button */}
                {showPreview && (hoveredTemplate === template.id || selectedTemplateId === template.id) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                    }}
                  >
                    <Tooltip title="Preview Template">
                      <IconButton
                        size="small"
                        onClick={(e) => handlePreviewClick(e, template)}
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          },
                        }}
                      >
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardMedia>

              <CardContent>
                <Typography variant="subtitle1" component="h3" gutterBottom>
                  {template.name}
                </Typography>
                {template.description && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {template.description}
                  </Typography>
                )}
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    label="Template"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={new Date(template.createdAt).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};