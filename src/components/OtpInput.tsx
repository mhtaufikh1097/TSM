import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';

interface OtpInputProps {
  phoneNumber: string;
  onSubmit: (code: string) => void;
  loading: boolean;
  onBack: () => void;
  resendCode: () => void;
}

const OtpInput: React.FC<OtpInputProps> = ({ 
  phoneNumber, 
  onSubmit, 
  loading, 
  onBack,
  resendCode
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    onSubmit(code);
  };

  const handleResendCode = () => {
    if (canResend) {
      resendCode();
      setCountdown(60);
      setCanResend(false);
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
        Verification Code
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 3 }}>
        Enter the 6-digit code sent to {phoneNumber}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Verification Code"
          variant="outlined"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length <= 6) {
              setCode(value);
            }
          }}
          placeholder="123456"
          error={!!error}
          helperText={error}
          type="tel"
          inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="primary" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={loading || code.length !== 6}
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            position: 'relative'
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" sx={{ position: 'absolute' }} />
          ) : (
            'Verify'
          )}
        </Button>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            color="primary"
            disabled={!canResend}
            onClick={handleResendCode}
            sx={{ textTransform: 'none' }}
          >
            {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default OtpInput;