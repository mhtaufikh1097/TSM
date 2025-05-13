import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper,
  InputAdornment,
  IconButton,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';

interface RegisterFormProps {
  phoneNumber: string;
  pin: string;
  verificationCode: string;
  onSubmit: (fullName: string, email: string) => void;
  loading: boolean;
  onBack: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  phoneNumber, 
  pin,
  verificationCode,
  onSubmit, 
  loading, 
  onBack 
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');
    
    let isValid = true;
    
    if (!fullName.trim()) {
      setNameError('Full name is required');
      isValid = false;
    }
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    if (isValid) {
      onSubmit(fullName, email);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        padding: { xs: 3, sm: 4 },
        width: { xs: '90%', sm: '450px' },
        maxWidth: '100%',
        borderRadius: 2,
        position: 'relative'
      }}
    >
      <IconButton 
        sx={{ position: 'absolute', top: 16, left: 16 }}
        onClick={onBack}
        aria-label="Go back"
      >
        <ArrowBackIcon />
      </IconButton>
      
      <Typography 
        variant="h5" 
        align="center" 
        gutterBottom
        sx={{ mb: 3, fontWeight: 'bold', mt: 2 }}
      >
        Complete Registration
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 3 }}>
        Please provide the following information to complete your registration
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Full Name"
              variant="outlined"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              error={!!nameError}
              helperText={nameError}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid size={12}>
            <TextField
              fullWidth
              label="Email (Optional)"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              error={!!emailError}
              helperText={emailError}
              type="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !fullName.trim()}
            sx={{ 
              py: 1.5,
              fontSize: '1rem',
              position: 'relative'
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" sx={{ position: 'absolute' }} />
            ) : (
              'Complete Registration'
            )}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default RegisterForm;