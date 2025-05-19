import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { useAuth } from '@/lib/auth-context';

const DashboardHome: React.FC = () => {
  const { user, isInspector, isQc, isPm } = useAuth();

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.fullName}!
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Role: {user?.role?.toUpperCase()}
      </Typography>

      <Grid container spacing={3}>
        {isInspector && (
          <>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inspector Dashboard
                  </Typography>
                  <Typography variant="body2">
                    From here you can create new inspections and review your recent work.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pending Inspections
                  </Typography>
                  <Typography variant="body2">
                    You have 0 inspections waiting to be completed.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {isQc && (
          <>
             <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QC Dashboard
                  </Typography>
                  <Typography variant="body2">
                    From here you can review and validate inspection reports.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
             <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pending Reviews
                  </Typography>
                  <Typography variant="body2">
                    You have 0 reports waiting for quality control review.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {isPm && (
          <>
             <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Project Manager Dashboard
                  </Typography>
                  <Typography variant="body2">
                    From here you can oversee all project inspection activities.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
             <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Project Overview
                  </Typography>
                  <Typography variant="body2">
                    0 inspections completed this month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
             <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QC Status
                  </Typography>
                  <Typography variant="body2">
                    0 reports approved, 0 pending review
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default DashboardHome;