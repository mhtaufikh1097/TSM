import React, { useState } from 'react';
import { Box, Container, Snackbar, Alert, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/lib/auth-context';
import PhoneInput from '@/components/PhoneInput';
import OtpInput from '@/components/OtpInput';
import PinInput from '@/components/PinInput';
import RegisterForm from '@/components/RegisterForm';

enum AuthStep {
  PHONE_INPUT,
  OTP_VERIFICATION,
  PIN_INPUT,
  REGISTER_FORM
}

const AuthFlow: React.FC = () => {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState<AuthStep>(AuthStep.PHONE_INPUT);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pin, setPin] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handle phone number submission
  const handlePhoneSubmit = async (phone: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // First check if the user exists
      const checkUserResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      
      const userData = await checkUserResponse.json();
      
      if (!checkUserResponse.ok) {
        throw new Error(userData.message || 'Error checking user');
      }
      
      setPhoneNumber(phone);
      setIsExistingUser(userData.userExists);
      
      // If existing user, go straight to PIN input
      if (userData.userExists) {
        setCurrentStep(AuthStep.PIN_INPUT);
        setSuccess('Welcome back! Please enter your PIN');
      } else {
        // For new users, send verification code
        const response = await fetch('/api/auth/verify-phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phoneNumber: phone }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Error sending verification code');
        }
        
        setSuccess('Verification code sent successfully');
        setCurrentStep(AuthStep.OTP_VERIFICATION);
        
        // If in development, show the verification code
        if (process.env.NODE_ENV === 'development' && data.code) {
          console.log('Verification code:', data.code);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process phone number');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          code 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code');
      }
      
      setVerificationCode(code);
      setCurrentStep(AuthStep.PIN_INPUT);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN submission (login)
  const handleLoginPinSubmit = async (enteredPin: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          pin: enteredPin 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      setSuccess('Login successful');
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN submission (registration)
  const handleRegisterPinSubmit = async (enteredPin: string) => {
    setPin(enteredPin);
    setCurrentStep(AuthStep.REGISTER_FORM);
  };

  // Handle register form submission
  const handleRegisterSubmit = async (fullName: string, email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          pin,
          verificationCode,
          fullName,
          email 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      setSuccess('Registration successful! Please login');
      
      // Redirect to login
      setCurrentStep(AuthStep.PIN_INPUT);
      setIsExistingUser(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error resending verification code');
      }
      
      setSuccess('Verification code resent successfully');
      
      // If in development, show the verification code
      if (process.env.NODE_ENV === 'development' && data.code) {
        console.log('Verification code:', data.code);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  // Handle closing snackbar
  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  // Handle back button
  const handleBack = () => {
    if (currentStep === AuthStep.OTP_VERIFICATION) {
      setCurrentStep(AuthStep.PHONE_INPUT);
    } else if (currentStep === AuthStep.PIN_INPUT) {
      setCurrentStep(AuthStep.PHONE_INPUT);
    } else if (currentStep === AuthStep.REGISTER_FORM) {
      setCurrentStep(AuthStep.PIN_INPUT);
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case AuthStep.PHONE_INPUT:
        return (
          <PhoneInput 
            onSubmit={handlePhoneSubmit} 
            loading={loading} 
          />
        );
      case AuthStep.OTP_VERIFICATION:
        return (
          <OtpInput 
            phoneNumber={phoneNumber} 
            onSubmit={handleOtpSubmit} 
            loading={loading} 
            onBack={handleBack}
            resendCode={handleResendCode}
          />
        );
      case AuthStep.PIN_INPUT:
        return (
          <PinInput 
            phoneNumber={phoneNumber} 
            isLogin={isExistingUser} 
            onSubmit={isExistingUser ? handleLoginPinSubmit : handleRegisterPinSubmit} 
            loading={loading} 
            onBack={handleBack} 
          />
        );
      case AuthStep.REGISTER_FORM:
        return (
          <RegisterForm 
            phoneNumber={phoneNumber} 
            pin={pin}
            verificationCode={verificationCode}
            onSubmit={handleRegisterSubmit} 
            loading={loading} 
            onBack={handleBack} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
        padding: 2
      }}
    >
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center' }}>
        {renderCurrentStep()}
      </Container>
      
      {/* Error and success messages */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AuthFlow;