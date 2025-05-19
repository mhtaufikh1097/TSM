// components/dashboard/InspectionForm.tsx
import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '@/lib/auth-context';
import { sendInspectionReport } from '@/services/whatsappService';

interface InspectionFormData {
  inspectionType: string;
  location: string;
  inspectorName: string;
  findings: string;
  actionRequired: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const initialFormState: InspectionFormData = {
  inspectionType: '',
  location: '',
  inspectorName: '',
  findings: '',
  actionRequired: '',
  severity: 'low',
};

const InspectionForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<InspectionFormData>({
    ...initialFormState,
    inspectorName: user?.fullName || '',
  });
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Send the WhatsApp message using the service
      await sendInspectionReport(formData);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Inspection report sent successfully via WhatsApp!',
        severity: 'success'
      });
      
      setFormData({
        ...initialFormState,
        inspectorName: user?.fullName || '',
      });
      
    } catch (error) {
     
      setSnackbar({
        open: true,
        message: 'Failed to send WhatsApp message. Please try again.',
        severity: 'error'
      });
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
          Fill out the inspection form below. The report will be sent automatically to the admin via WhatsApp.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Inspection Type"
                name="inspectionType"
                value={formData.inspectionType}
                onChange={handleFormChange}
                variant="outlined"
                placeholder="e.g., Safety, Quality, Environmental"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                variant="outlined"
                placeholder="e.g., Building A, Floor 2"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Inspector Name"
                name="inspectorName"
                value={formData.inspectorName}
                onChange={handleFormChange}
                variant="outlined"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
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
            <Grid size={{ xs: 12}}>
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
              />
            </Grid>
            <Grid size={{ xs: 12}}>
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
              />
            </Grid>
           <Grid size={{ xs: 12}}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                endIcon={<SendIcon />}
                sx={{ mt: 2 }}
              >
                Submit & Send via WhatsApp
              </Button>
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