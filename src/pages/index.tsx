import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthFlow from '@/components/auth/AuthFlow';
import { useAuth } from '@/lib/auth-context';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Display loading spinner while checking auth status
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show auth flow if not authenticated
  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  // Return null while redirecting
  return null;
}