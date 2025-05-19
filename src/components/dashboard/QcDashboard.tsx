import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const QcDashboard: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        QC Dashboard
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Inspection Review Queue
        </Typography>
        <Typography>
          No pending inspections to review. When inspectors submit new reports, they will appear here for quality control review.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Review Statistics
        </Typography>
        <Typography>
          This month: 0 reports reviewed
        </Typography>
        <Typography>
          Average review time: N/A
        </Typography>
      </Paper>
    </Box>
  );
};

export default QcDashboard;