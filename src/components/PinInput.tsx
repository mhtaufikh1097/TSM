import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Paper,
  IconButton,
  FormHelperText,
  TextField,
  styled
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { validatePin } from '@/utils/auth-utils';

interface PinInputProps {
  phoneNumber: string;
  isLogin: boolean;
  onSubmit: (pin: string) => void;
  loading: boolean;
  onBack: () => void;
  onForgotPin?: () => void;
}


const PinBox = styled(TextField)(({ theme }) => ({
  width: '54px',
  height: '54px',
  margin: '0 4px',
  textAlign: 'center',
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    height: '100%',
    backgroundColor: theme.palette.grey[100]
  },
  '& .MuiOutlinedInput-input': {
    textAlign: 'center',
    fontSize: '24px',
    padding: '0',
    height: '100%',
    caretColor: 'transparent'
  }
}));

const PinInput: React.FC<PinInputProps> = ({ 
  phoneNumber, 
  isLogin, 
  onSubmit, 
  loading, 
  onBack,
  onForgotPin
}) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  
  useEffect(() => {
    pinInputRefs.current = pinInputRefs.current.slice(0, 6);
    confirmPinInputRefs.current = confirmPinInputRefs.current.slice(0, 6);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    
    if (!/^[0-9]*$/.test(value)) return;
    
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1); 
    setPin(newPin);
    
    
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (value && index === 5 && !isLogin) {
      
      confirmPinInputRefs.current[0]?.focus();
    }
  };

  const handleConfirmPinChange = (index: number, value: string) => {
    
    if (!/^[0-9]*$/.test(value)) return;
    
    
    const newConfirmPin = [...confirmPin];
    newConfirmPin[index] = value.slice(-1);
    setConfirmPin(newConfirmPin);
    
    
    if (value && index < 5) {
      confirmPinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
    
    
    if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
    
    
    if (e.key === 'ArrowRight' && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleConfirmPinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    
    if (e.key === 'Backspace' && !confirmPin[index] && index > 0) {
      confirmPinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Backspace' && !confirmPin[index] && index === 0) {
      
      pinInputRefs.current[5]?.focus();
    }
    
    
    if (e.key === 'ArrowLeft' && index > 0) {
      confirmPinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index === 0) {
      
      pinInputRefs.current[5]?.focus();
    }
    
    
    if (e.key === 'ArrowRight' && index < 5) {
      confirmPinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6).split('');
    
    const newPin = [...pin];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newPin[index] = digit;
      }
    });
    
    setPin(newPin);
    
    
    const nextEmptyIndex = newPin.findIndex(val => !val);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      pinInputRefs.current[nextEmptyIndex]?.focus();
    } else if (!isLogin) {
      
      confirmPinInputRefs.current[0]?.focus();
    } else {
      pinInputRefs.current[5]?.focus();
    }
  };

  const handleConfirmPinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6).split('');
    
    const newConfirmPin = [...confirmPin];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newConfirmPin[index] = digit;
      }
    });
    
    setConfirmPin(newConfirmPin);
    
    
    const nextEmptyIndex = newConfirmPin.findIndex(val => !val);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      confirmPinInputRefs.current[nextEmptyIndex]?.focus();
    } else {
      confirmPinInputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfirmError('');
    
    const fullPin = pin.join('');
    const fullConfirmPin = confirmPin.join('');
    
    if (!validatePin(fullPin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    
    if (!isLogin && fullPin !== fullConfirmPin) {
      setConfirmError('PINs do not match');
      return;
    }
    
    onSubmit(fullPin);
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
        variant="h4" 
        align="center" 
        gutterBottom
        sx={{ mb: 3, fontWeight: 'bold', mt: 2 }}
      >
        {isLogin ? 'Enter PIN' : 'Create PIN'}
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 5, color: 'text.secondary' }}>
        {isLogin 
          ? `Type in your PIN to log in.` 
          : 'Create a secure 6-digit PIN for your account'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: isLogin ? 'normal' : 'medium' }}>
          {isLogin ? "PIN" : "Enter 6-digit PIN"}
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 4,
            gap: { xs: '8px', sm: '12px' }
          }}
        >
          {pin.map((digit, index) => (
            <PinBox
              key={`pin-${index}`}
              variant="outlined"
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handlePinKeyDown(index, e as React.KeyboardEvent<HTMLInputElement>)}
              onPaste={index === 0 ? handlePinPaste : undefined}
              inputProps={{
                maxLength: 1,
                inputMode: 'numeric',
                pattern: '[0-9]*',
                'aria-label': `PIN digit ${index + 1}`
              }}
              inputRef={el => pinInputRefs.current[index] = el}
              autoFocus={index === 0}
              type="password"
              error={!!error}
            />
          ))}
        </Box>
        
        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
        
        {!isLogin && (
          <>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', mt: 2 }}>
              Confirm PIN
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 4,
                gap: { xs: '8px', sm: '12px' }
              }}
            >
              {confirmPin.map((digit, index) => (
                <PinBox
                  key={`confirm-pin-${index}`}
                  variant="outlined"
                  value={digit}
                  onChange={(e) => handleConfirmPinChange(index, e.target.value)}
                  onKeyDown={(e) => handleConfirmPinKeyDown(index, e as React.KeyboardEvent<HTMLInputElement>)}
                  onPaste={index === 0 ? handleConfirmPinPaste : undefined}
                  inputProps={{
                    maxLength: 1,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    'aria-label': `Confirm PIN digit ${index + 1}`
                  }}
                  inputRef={el => confirmPinInputRefs.current[index] = el}
                  type="password"
                  error={!!confirmError}
                />
              ))}
            </Box>
            
            {confirmError && (
              <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
                {confirmError}
              </Typography>
            )}
          </>
        )}
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={
            loading || 
            pin.some(digit => !digit) || 
            (!isLogin && confirmPin.some(digit => !digit))
          }
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            position: 'relative',
            mb: 2,
            mt: 2
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" sx={{ position: 'absolute' }} />
          ) : (
            isLogin ? 'Login' : 'Create PIN'
          )}
        </Button>
        
        {isLogin && onForgotPin && (
          <Typography 
            variant="body1" 
            align="center" 
            color="primary" 
            sx={{ 
              cursor: 'pointer', 
              fontWeight: 'medium',
              mt: 2
            }}
            onClick={onForgotPin}
          >
            Forgot PIN?
          </Typography>
        )}
        
        <FormHelperText sx={{ mt: 2, textAlign: 'center' }}>
          {isLogin 
            ? 'Enter your secure 6-digit PIN' 
            : 'Your PIN will be used to login to your account'}
        </FormHelperText>
      </form>
    </Paper>
  );
};

export default PinInput;