import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Avatar, 
  Divider,
  useTheme
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '@/lib/auth-context';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        padding: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 3, sm: 4 },
            borderRadius: 2,
            mb: 4
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  bgcolor: theme.palette.primary.main,
                  width: 56,
                  height: 56,
                  mr: 2
                }}
              >
                <PersonIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Welcome!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Phone: {user?.phoneNumber}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LogoutIcon />}
              onClick={logout}
            >
              Logout
            </Button>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h4" gutterBottom>
              Successfully Logged In!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              This is your protected dashboard. Your authentication was successful.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              User ID: {user?.id}
            </Typography>
          </Box>
        </Paper>
        
        <Typography variant="body2" color="text.secondary" align="center">
          &copy; {new Date().getFullYear()} Login/Register App - All rights reserved
        </Typography>
      </Container>
    </Box>
  );
};

export default Dashboard;