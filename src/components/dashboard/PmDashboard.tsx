import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';

const PmDashboard: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Project Manager Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs : 12, md: 4}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Projects Overview
              </Typography>
              <Typography variant="h3" align="center">
                0
              </Typography>
              <Typography variant="body2" align="center">
                Active Projects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs : 12, md: 4}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inspections
              </Typography>
              <Typography variant="h3" align="center">
                0
              </Typography>
              <Typography variant="body2" align="center">
                Completed This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid size={{ xs : 12, md: 4}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                QC Status
              </Typography>
              <Typography variant="h3" align="center">
                0
              </Typography>
              <Typography variant="body2" align="center">
                Pending Reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Project Timeline
        </Typography>
        <Typography>
          No active projects to display. New projects will appear here when created.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Team Performance
        </Typography>
        <Typography>
          No data available. Performance metrics will be displayed as inspections are completed.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PmDashboard;