// pages/inspections/approve/[token].tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Grid,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  ImageList,
  ImageListItem,
  Stack,
  Link
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '@/lib/auth-context';

// Severity color mapping
const severityColors = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'error'
} as const;

// Status mapping
const statusLabels = {
  pending: 'Pending',
  qc_approved: 'QC Approved - Awaiting PM',
  pm_approved: 'Fully Approved',
  rejected: 'Rejected'
} as const;

const ApprovalPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [role, setRole] = useState<'qc' | 'pm'>('qc');
  const [canApprove, setCanApprove] = useState(false);
  
  // Fetch inspection details
  useEffect(() => {
    if (!token) return;
    
    const fetchInspection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/inspections/approve/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch inspection');
        }
        
        const data = await response.json();
        setInspection(data.inspection);
        setRole(data.role);
        setCanApprove(data.canApprove);
      } catch (err: any) {
        setError(err.message || 'Failed to load inspection details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInspection();
  }, [token]);
  
  // Handle approval/rejection
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!user) {
      setError('You must be logged in to perform this action');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/inspections/approve/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment,
          approverId: user.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }
      
      const data = await response.json();
      setSuccess(data.message);
      setCanApprove(false);
      
      // Refresh inspection details
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error && !inspection) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }
  
  if (!inspection) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Inspection not found
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Inspection Approval
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {role === 'qc' ? 'Quality Control' : 'Project Manager'} Review
          </Typography>
        </Box>
        
        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Inspection Details */}
        <Grid container spacing={3}>
          <Grid size={{xs : 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Inspection #{inspection.id}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip 
                  label={statusLabels[inspection.status as keyof typeof statusLabels]} 
                  color={inspection.status === 'pm_approved' ? 'success' : 'default'}
                />
                <Chip 
                  label={inspection.severity.toUpperCase()} 
                  color={severityColors[inspection.severity as keyof typeof severityColors]}
                />
              </Stack>
            </Box>
          </Grid>
          
          <Grid size={{xs : 12, md:6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Inspection Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              {inspection.inspectionType}
            </Typography>
          </Grid>
          
          <Grid size={{xs : 12, md:6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Location
            </Typography>
            <Typography variant="body1" gutterBottom>
              {inspection.location}
            </Typography>
          </Grid>
          
          <Grid size={{xs : 12, md:6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Inspector
            </Typography>
            <Typography variant="body1" gutterBottom>
              {inspection.inspectorName}
            </Typography>
          </Grid>
          
          <Grid size={{xs : 12, md:6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Date
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(inspection.createdAt).toLocaleDateString()}
            </Typography>
          </Grid>
          
          <Grid size={{xs : 12 }}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid size={{xs : 12 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Findings
            </Typography>
            <Typography variant="body1" paragraph>
              {inspection.findings}
            </Typography>
          </Grid>
          
          <Grid size={{xs : 12 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Action Required
            </Typography>
            <Typography variant="body1" paragraph>
              {inspection.actionRequired}
            </Typography>
          </Grid>
          
          {/* Attachments */}
          {inspection.files && inspection.files.length > 0 && (
            <Grid size={{xs : 12 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Attachments ({inspection.files.length})
              </Typography>
              <Stack spacing={1}>
                {inspection.files.map((file: any) => (
                  <Box key={file.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon fontSize="small" />
                    <Link 
                      href={file.filePath} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      underline="hover"
                    >
                      {file.fileName}
                    </Link>
                    <Chip 
                      label={file.fileType.toUpperCase()} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                ))}
              </Stack>
            </Grid>
          )}
          
          {/* Image previews for images */}
          {inspection.files && inspection.files.filter((f: any) => f.fileType === 'image').length > 0 && (
            <Grid size={{xs : 12 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Image Previews
              </Typography>
              <ImageList cols={3} rowHeight={164} sx={{ maxHeight: 400 }}>
                {inspection.files
                  .filter((file: any) => file.fileType === 'image')
                  .map((file: any) => (
                    <ImageListItem key={file.id}>
                      <img
                        src={file.filePath}
                        alt={file.fileName}
                        loading="lazy"
                        style={{ objectFit: 'cover' }}
                      />
                    </ImageListItem>
                  ))}
              </ImageList>
            </Grid>
          )}
          
          {canApprove && (
            <>
              <Grid size={{xs : 12 }}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid size={{xs : 12 }}>
                <Typography variant="h6" gutterBottom>
                  {role === 'qc' ? 'Quality Control' : 'Project Manager'} Decision
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Comment (Optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your comments here..."
                  disabled={submitting}
                  sx={{ mb: 3 }}
                />
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleAction('approve')}
                    disabled={submitting}
                    size="large"
                  >
                    {submitting ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleAction('reject')}
                    disabled={submitting}
                    size="large"
                  >
                    {submitting ? 'Processing...' : 'Reject'}
                  </Button>
                </Stack>
              </Grid>
            </>
          )}
          
          {!canApprove && (
            <Grid size={{xs : 12 }}>
              <Alert severity="info">
                {inspection.status === 'pm_approved' 
                  ? 'This inspection has been fully approved.'
                  : inspection.status === 'rejected'
                  ? 'This inspection has been rejected.'
                  : role === 'pm' && inspection.status === 'pending'
                  ? 'This inspection is still pending QC approval.'
                  : 'You cannot approve this inspection at this time.'
                }
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};

export default ApprovalPage;