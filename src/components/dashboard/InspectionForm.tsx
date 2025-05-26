// components/dashboard/InspectionForm.tsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '@/lib/auth-context';
import { createInspection } from '@/services/inspectionService';
import { sendInspectionReport } from '@/services/whatsappService';
import { SelectChangeEvent } from '@mui/material/Select';
// or
// import { SelectChangeEvent } from '@mui/material';
// import { getInspectorUpliners } from '@/services/inspectionService';

interface InspectionFormData {
  inspectionType: string;
  location: string;
  inspectorId: number;
  inspectorName: string;
  findings: string;
  actionRequired: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface FileItem {
  file: File;
  preview?: string;
}

const initialFormState: InspectionFormData = {
  inspectionType: '',
  location: '',
  inspectorId: 0,
  inspectorName: '',
  findings: '',
  actionRequired: '',
  severity: 'low',
};

const InspectionForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<InspectionFormData>({
    ...initialFormState,
    inspectorId: user?.id || 0,
    inspectorName: user?.fullName || '',
  });
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name: string; value: string };
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => {
        // Create preview URLs for images
        let preview = undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        return {
          file,
          preview
        };
      });

      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      
      // Clean up preview URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (): Promise<Array<{path: string; name: string; type: string}>> => {
    if (files.length === 0) return [];
  
    // Create a FormData instance
    const formData = new FormData();
    files.forEach(fileItem => {
      formData.append('files', fileItem.file);
    });
    
    try {
      // Upload files to your API
      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload files');
      }
      
      const uploadedFiles = await response.json();
      return uploadedFiles.map((fileInfo: any) => ({
        path: fileInfo.path,
        name: fileInfo.originalName,
        type: fileInfo.mimeType
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Upload files first
      let uploadedFiles: Array<{path: string; name: string; type: string}> = [];
      
      try {
        uploadedFiles = await uploadFiles();
      } catch (error) {
        console.error('File upload failed:', error);
        setSnackbar({
          open: true,
          message: 'Failed to upload files. Please try again.',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Then create the inspection record with file references
      const inspection = await createInspection(formData, uploadedFiles);
      
      // Get upliner QCs and PMs specific to this inspector
      const upliners = await getInspectorUpliners(user?.id || 0);
      
      const recipients = [
        ...upliners.qc.map(user => user.phoneNumber),
        ...upliners.pm.map(user => user.phoneNumber)
      ];
      
      // Send WhatsApp notifications with approval links
      await sendInspectionReport(formData, inspection.id, recipients);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Inspection report submitted and notifications sent via WhatsApp!',
        severity: 'success'
      });
      
      // Reset form and files
      setFormData({
        ...initialFormState,
        inspectorId: user?.id || 0,
        inspectorName: user?.fullName || '',
      });
      
      // Clean up file previews
      files.forEach(fileItem => {
        if (fileItem.preview) {
          URL.revokeObjectURL(fileItem.preview);
        }
      });
      setFiles([]);
      
    } catch (error) {
      console.error('Submission error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit inspection report. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          New Inspection Report
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          Fill out the inspection form below. The report will be sent automatically to QC and PM via WhatsApp for approval.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{xs:12, md:6}}>
              <TextField
                required
                fullWidth
                label="Inspection Type"
                name="inspectionType"
                value={formData.inspectionType}
                onChange={handleFormChange}
                variant="outlined"
                placeholder="e.g., Safety, Quality, Environmental"
                disabled={isSubmitting}
              />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <TextField
                required
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                variant="outlined"
                placeholder="e.g., Building A, Floor 2"
                disabled={isSubmitting}
              />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <TextField
                required
                fullWidth
                label="Inspector Name"
                name="inspectorName"
                value={formData.inspectorName}
                onChange={handleFormChange}
                variant="outlined"
                disabled={!!user || isSubmitting}
              />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <FormControl fullWidth required disabled={isSubmitting}>
                <InputLabel id="severity-label">Severity</InputLabel>
                <Select
                  labelId="severity-label"
                  name="severity"
                  value={formData.severity}
                  onChange={handleFormChange}
                  label="Severity"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{xs:12}}>
              <TextField
                required
                fullWidth
                label="Findings"
                name="findings"
                value={formData.findings}
                onChange={handleFormChange}
                variant="outlined"
                multiline
                rows={3}
                placeholder="Describe what you observed during the inspection"
                disabled={isSubmitting}
              />
            </Grid>
            <Grid size={{xs:12}}>
              <TextField
                required
                fullWidth
                label="Action Required"
                name="actionRequired"
                value={formData.actionRequired}
                onChange={handleFormChange}
                variant="outlined"
                multiline
                rows={2}
                placeholder="Describe what actions should be taken"
                disabled={isSubmitting}
              />
            </Grid>
            
            {/* File Upload Section */}
            <Grid size={{xs:12}}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  border: '1px dashed', 
                  borderColor: 'divider',
                  bgcolor: 'background.default'
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    Attachments
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    onClick={handleFileSelect}
                    size="small"
                    disabled={isSubmitting}
                  >
                    Add Files
                  </Button>
                </Box>
                
                {files.length > 0 ? (
                  <List dense>
                    {files.map((fileItem, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveFile(index)} disabled={isSubmitting}>
                            <DeleteIcon />
                          </IconButton>
                        }
                        sx={{ 
                          bgcolor: 'background.paper',
                          mb: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <ListItemIcon>
                          {fileItem.file.type.startsWith('image/') ? <ImageIcon /> : <PictureAsPdfIcon />}
                        </ListItemIcon>
                        <ListItemText 
                          primary={fileItem.file.name} 
                          secondary={`${(fileItem.file.size / 1024).toFixed(1)} KB`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Upload images or PDF documents related to the inspection
                    </Typography>
                  </Box>
                )}
                
                {/* Image Previews */}
                {files.some(f => f.preview) && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    {files.filter(f => f.preview).map((fileItem, index) => (
                      <Box 
                        key={`preview-${index}`}
                        sx={{
                          width: 100,
                          height: 100,
                          position: 'relative',
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <img 
                          src={fileItem.preview} 
                          alt={fileItem.file.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
            
            <Grid size={{xs:12}}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  disabled={isSubmitting}
                  sx={{ mt: 2 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Send via WhatsApp'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InspectionForm;