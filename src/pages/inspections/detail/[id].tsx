// pages/inspections/detail/[id].tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Container
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as DateIcon,
  Assignment as TypeIcon,
  Warning as SeverityIcon,
  AttachFile as AttachIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { getInspectionById, updateInspectionStatus } from '@/services/clientInspectionService';
import { validateApprovalToken } from '@/services/whatsappService';
import { sendApprovalNotification } from '@/services/whatsappService';

interface InspectionData {
  id: number;
  inspectionType: string;
  location: string;
  findings: string;
  actionRequired: string;
  severity: string;
  status: string;
  createdAt: string;
  inspector: {
    id: number;
    fullName: string;
    phoneNumber: string;
  };
  files: Array<{
    id: number;
    fileName: string;
    filePath: string;
    fileType: string;
  }>;
  qcApprovedBy?: {
    id: number;
    fullName: string;
  };
  pmApprovedBy?: {
    id: number;
    fullName: string;
  };
}

const InspectionDetailPage: React.FC = () => {
  const router = useRouter();
  const { id, token, role } = router.query;
  
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [userRole, setUserRole] = useState<'qc' | 'pm' | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  useEffect(() => {
    if (id && token && role) {
      loadInspectionData();
      validateToken();
    }
  }, [id, token, role]);

  const validateToken = async () => {
    if (typeof token === 'string') {
      const tokenData = await validateApprovalToken(token);

      console.log('Token Data:', tokenData);
      console.log('number id :', Number(id));
      
      if (tokenData && tokenData.inspectionId === Number(id)) {
        setIsValidToken(true);
        setUserRole(tokenData.role);
      } else {
        setSnackbar({
          open: true,
          message: 'Invalid or expired access token',
          severity: 'error'
        });
      }
    }
  };

  const loadInspectionData = async () => {
    try {
      setLoading(true);
      const data = await getInspectionById(Number(id));
      setInspection(data);
    } catch (error) {
      console.error('Error loading inspection:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load inspection details',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: 'approve' | 'reject') => {
    setActionType(action);
    setDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!inspection || !userRole) return;
    
    try {
      setActionLoading(true);
      
      const status = actionType === 'approve' 
        ? (userRole === 'qc' ? 'qc_approved' : 'pm_approved')
        : 'rejected';
      
      // For this example, we'll use a dummy approver ID
      // In a real app, you'd get this from authentication
      const approverId = 1;
      
      await updateInspectionStatus(inspection.id, status, approverId, comment);
      
      // Send notification
      await sendApprovalNotification(
        inspection.id,
        actionType === 'approve' ? 'approved' : 'rejected',
        comment,
        `${userRole.toUpperCase()} User`, // In real app, get actual user name
        userRole,
        [inspection.inspector.phoneNumber] // Notify the inspector
      );
      
      setSnackbar({
        open: true,
        message: `Inspection ${actionType}d successfully and notification sent!`,
        severity: 'success'
      });
      
      // Reload data to show updated status
      await loadInspectionData();
      
    } catch (error) {
      console.error('Error updating inspection:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${actionType} inspection`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
      setDialogOpen(false);
      setComment('');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'qc_approved': return 'info';
      case 'pm_approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const canTakeAction = () => {
    if (!inspection || !userRole || !isValidToken) return false;
    
    if (userRole === 'qc' && inspection.status === 'pending') return true;
    if (userRole === 'pm' && inspection.status === 'qc_approved') return true;
    
    return false;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') return <ImageIcon />;
    if (fileType === 'pdf') return <PdfIcon />;
    return <AttachIcon />;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading inspection details...
        </Typography>
      </Container>
    );
  }

  if (!inspection) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Inspection not found or access denied.
        </Alert>
      </Container>
    );
  }

  if (!isValidToken) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Invalid or expired access token. Please use the link from WhatsApp message.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Inspection Report #{inspection.id}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip 
              label={inspection.severity.toUpperCase()} 
              color={getSeverityColor(inspection.severity) as any}
              icon={<SeverityIcon />}
            />
            <Chip 
              label={inspection.status.replace('_', ' ').toUpperCase()} 
              color={getStatusColor(inspection.status) as any}
            />
          </Stack>
        </Box>
        
        {/* Action Buttons */}
        {canTakeAction() && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
            >
              Approve
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => handleAction('reject')}
              disabled={actionLoading}
            >
              Reject
            </Button>
          </Stack>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Main Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Inspection Details
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TypeIcon color="primary" />
                <Typography variant="body1">
                  <strong>Type:</strong> {inspection.inspectionType}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon color="primary" />
                <Typography variant="body1">
                  <strong>Location:</strong> {inspection.location}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="body1">
                  <strong>Inspector:</strong> {inspection.inspector.fullName}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateIcon color="primary" />
                <Typography variant="body1">
                  <strong>Created:</strong> {new Date(inspection.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Findings */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Findings
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {inspection.findings}
            </Typography>
          </Paper>

          {/* Actions Required */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Actions Required
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {inspection.actionRequired}
            </Typography>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid size={{xs:12, md:4}}>
          {/* Approval Status */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Approval Status
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">QC Approval:</Typography>
                <Chip 
                  label={inspection.qcApprovedBy ? 'Approved' : 'Pending'}
                  color={inspection.qcApprovedBy ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">PM Approval:</Typography>
                <Chip 
                  label={inspection.pmApprovedBy ? 'Approved' : 'Pending'}
                  color={inspection.pmApprovedBy ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>

          {/* Attachments */}
          {inspection.files && inspection.files.length > 0 && (
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Attachments ({inspection.files.length})
              </Typography>
              
              <List dense>
                {inspection.files.map((file) => (
                  <ListItem key={file.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      {getFileIcon(file.fileType)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={file.fileName}
                      secondary={file.fileType}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Inspection' : 'Reject Inspection'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a comment for this {actionType === 'approve' ? 'approval' : 'rejection'}:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={actionType === 'approve' ? 'Optional approval comment...' : 'Reason for rejection...'}
            required={actionType === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={actionLoading || (actionType === 'reject' && !comment.trim())}
          >
            {actionLoading ? <CircularProgress size={20} /> : 
             actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default InspectionDetailPage;