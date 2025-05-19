import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  TextField, 
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Stack,
  Alert
} from '@mui/material';
import { useAuth } from '@/lib/auth-context';

const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: '',
    notificationsEnabled: true,
    darkModeEnabled: false
  });
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock saving settings
    setTimeout(() => {
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }, 500);
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Settings
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />
          
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
            Role: {user?.role?.toUpperCase()}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Settings
        </Typography>
        
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.notificationsEnabled}
                onChange={handleChange}
                name="notificationsEnabled"
                color="primary"
              />
            }
            label="Enable Notifications"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.darkModeEnabled}
                onChange={handleChange}
                name="darkModeEnabled"
                color="primary"
              />
            }
            label="Dark Mode"
          />
        </Stack>
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmit}
          >
            Save Preferences
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsView;