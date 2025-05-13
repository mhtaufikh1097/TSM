import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth-context';
import Dashboard from '@/components/Dashboard';
import { Box, CircularProgress } from '@mui/material';

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Dashboard /> : null;
}