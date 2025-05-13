import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  InputAdornment,
  useMediaQuery,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  FormHelperText
} from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { validatePhoneNumber } from '@/utils/auth-utils';

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => void;
  loading: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ onSubmit, loading }) => {
  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const MAX_PHONE_LENGTH = 15; 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    
    const formattedPhone = phoneNumber.replace(/\s/g, '');
    const fullPhoneNumber = countryCode + formattedPhone;
    
    if (!validatePhoneNumber(fullPhoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }
    
    onSubmit(fullPhoneNumber);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length <= MAX_PHONE_LENGTH) {
      setPhoneNumber(digitsOnly);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        padding: { xs: 3, sm: 4 },
        width: { xs: '90%', sm: '450px' },
        maxWidth: '100%',
        borderRadius: 2
      }}
    >
      <Typography
        variant="h5"
        align="center"
        gutterBottom
        sx={{ mb: 3, fontWeight: 'bold' }}
      >
        Log In or Sign Up
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 3 }}>
        Enter your phone number to continue
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', mb: 3 }}>
          <FormControl variant="outlined" sx={{ width: '120px', mr: 1 }}>
            <InputLabel id="country-code-label">Code</InputLabel>
            <Select
              labelId="country-code-label"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              label="Code"
            >
              <MenuItem value="+62">+62</MenuItem>
              {/* <MenuItem value="+1">+1</MenuItem>
              <MenuItem value="+44">+44</MenuItem>
              <MenuItem value="+61">+61</MenuItem>
              <MenuItem value="+65">+65</MenuItem> */}
              {/* Add more country codes as needed */}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Phone Number"
            variant="outlined"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            placeholder="8123456789"
            error={!!error}
            helperText={error}
            inputProps={{
              maxLength: MAX_PHONE_LENGTH,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={loading || !phoneNumber}
          sx={{
            py: 1.5,
            fontSize: '1rem',
            position: 'relative'
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" sx={{ position: 'absolute' }} />
          ) : (
            'Continue'
          )}
        </Button>
      </form>
      
      <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 3 }}>
        We'll send a verification code to this number
      </Typography>
    </Paper>
  );
};

export default PhoneInput;