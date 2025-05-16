// components/dashboard/SettingsView.tsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Paper
} from '@mui/material';

const SettingsView: React.FC = () => {
  return (
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
        Settings
      </Typography>
      <Typography variant="body1">
        Account and application settings will appear here.
      </Typography>
    </Paper>
  );
};

export default SettingsView;