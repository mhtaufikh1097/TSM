import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  IconButton,
  Avatar,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  ImageList,
  ImageListItem,
  Skeleton,
  Tooltip,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Pause as HoldIcon,
  PlayArrow as ResumeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as DateIcon,
  Assignment as TypeIcon,
  Warning as SeverityIcon,
  AttachFile as AttachIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  ArrowBack as BackIcon,
  ZoomIn as ZoomIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Schedule as ScheduleIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import { getInspectionById, updateInspectionStatus } from '@/services/clientInspectionService';
import { useAuth } from '@/lib/auth-context';

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
  qcApprovedAt?: string;
  pmApprovedBy?: {
    id: number;
    fullName: string;
  };
  pmApprovedAt?: string;
  onHoldBy?: {
    id: number;
    fullName: string;
  };
  onHoldAt?: string;
  onHoldReason?: string;
}

interface InspectionDetailViewProps {
  inspectionId: number;
  onBack: () => void;
  token?: string;
  externalRole?: 'qc' | 'pm';
}

const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({ 
  inspectionId, 
  onBack, 
  token, 
  externalRole 
}) => {
  const { user, isQc, isPm } = useAuth();
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'hold' | 'resume'>('approve');
  const [comment, setComment] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Determine user role - either from auth context or external token
  const userRole = externalRole || (isQc ? 'qc' : isPm ? 'pm' : null);
  
  // Updated can approve logic for new workflow
  const canApprove = userRole && inspection && (
    (userRole === 'qc' && (inspection.status === 'pending' || inspection.status === 'on_hold')) ||
    (userRole === 'pm' && inspection.status === 'qc_approved')
  );
  
  const canHold = userRole === 'qc' && inspection && inspection.status === 'pending';
  const canResume = userRole === 'qc' && inspection && inspection.status === 'on_hold';

  useEffect(() => {
    if (inspectionId) {
      loadInspectionData();
    }
  }, [inspectionId]);

  const loadInspectionData = async () => {
    try {
      setLoading(true);
      const data = await getInspectionById(inspectionId);
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

  const handleAction = (action: 'approve' | 'hold' | 'resume') => {
    setActionType(action);
    setDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!inspection || (!user && !token)) return;
    
    try {
      setActionLoading(true);
      
      // Use user ID if authenticated, or dummy ID for external users
      const userId = user?.id || 1;
      
      // Get JWT token from localStorage or use external token
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }
      
      // Call the updated API with the new workflow
      const response = await fetch(`/api/inspections/${inspection.id}/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: actionType,
          userId: userId,
          comment: comment || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      setSnackbar({
        open: true,
        message: `Inspection ${actionType}${actionType === 'approve' ? 'd' : actionType === 'hold' ? ' put on hold' : 'd'} successfully!`,
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
      case 'on_hold': return 'secondary';
      default: return 'default';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') return <ImageIcon />;
    if (fileType === 'pdf') return <PdfIcon />;
    return <AttachIcon />;
  };

  const handleImageClick = (filePath: string) => {
    setSelectedImage(filePath);
    setImageDialogOpen(true);
  };

  const getWorkflowSteps = () => {
    const steps = [
      { label: 'Created', completed: true },
      { label: 'QC Review', completed: inspection?.qcApprovedBy !== undefined },
      { label: 'PM Approval', completed: inspection?.pmApprovedBy !== undefined }
    ];
    return steps;
  };

  const getActiveStep = () => {
    if (!inspection) return 0;
    if (inspection.status === 'pending' || inspection.status === 'on_hold') return 1;
    if (inspection.status === 'qc_approved') return 2;
    if (inspection.status === 'pm_approved') return 3;
    return 0;
  };

  if (loading) {
    return (
      <Box sx={{ padding: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading inspection details...
        </Typography>
      </Box>
    );
  }

  if (!inspection) {
    return (
      <Box sx={{ padding: 3 }}>
        <Alert severity="error">
          Inspection not found.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      {/* Header with Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Inspection Report #{inspection.id}
        </Typography>
      </Box>

      {/* Status and Action Buttons */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
        {(canApprove || canHold || canResume) && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {canApprove && (
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
              >
                Approve
              </Button>
            )}
            {canHold && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<HoldIcon />}
                onClick={() => handleAction('hold')}
                disabled={actionLoading}
              >
                Put on Hold
              </Button>
            )}
            {canResume && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<ResumeIcon />}
                onClick={() => handleAction('resume')}
                disabled={actionLoading}
              >
                Resume
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      {/* Workflow Progress */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Approval Workflow
        </Typography>
        <Stepper activeStep={getActiveStep()} alternativeLabel>
          {getWorkflowSteps().map((step, index) => (
            <Step key={step.label} completed={step.completed}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Hold status indicator */}
        {inspection?.status === 'on_hold' && inspection.onHoldBy && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>On Hold:</strong> Put on hold by {inspection.onHoldBy.fullName} on {new Date(inspection.onHoldAt!).toLocaleString()}
              {inspection.onHoldReason && (
                <><br /><strong>Reason:</strong> {inspection.onHoldReason}</>
              )}
            </Typography>
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Main Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TypeIcon color="primary" />
              Inspection Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TypeIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Type</Typography>
                    <Typography variant="body1">{inspection.inspectionType}</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Typography variant="body1">{inspection.location}</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Inspector</Typography>
                    <Typography variant="body1">{inspection.inspector.fullName}</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DateIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                    <Typography variant="body1">{new Date(inspection.createdAt).toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Findings */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Findings
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {inspection.findings}
            </Typography>
          </Paper>

          {/* Actions Required */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Actions Required
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {inspection.actionRequired}
            </Typography>
          </Paper>

          {/* Evidence Images */}
          {inspection.files && inspection.files.filter(f => f.fileType === 'image').length > 0 && (
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon color="primary" />
                Evidence Images ({inspection.files.filter(f => f.fileType === 'image').length})
              </Typography>
              
              <ImageList variant="masonry" cols={3} gap={8}>
                {inspection.files.filter(f => f.fileType === 'image').map((file) => (
                  <ImageListItem key={file.id}>
                    <Card elevation={2}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={file.filePath.startsWith('/') ? file.filePath : `/uploads/${file.filePath}`}
                        alt={file.fileName}
                        sx={{ cursor: 'pointer', objectFit: 'cover' }}
                        onClick={() => handleImageClick(file.filePath.startsWith('/') ? file.filePath : `/uploads/${file.filePath}`)}
                      />
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                        <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                          {file.fileName}
                        </Typography>
                        <Tooltip title="View full size">
                          <IconButton 
                            size="small" 
                            onClick={() => handleImageClick(file.filePath.startsWith('/') ? file.filePath : `/uploads/${file.filePath}`)}
                          >
                            <ZoomIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </ImageListItem>
                ))}
              </ImageList>
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid size={{xs:12, md:4}}>
          {/* Approval Status */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" />
              Approval History
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1
              }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">QC Review</Typography>
                  {inspection.qcApprovedBy && inspection.qcApprovedAt && (
                    <Typography variant="caption" color="text.secondary">
                      by {inspection.qcApprovedBy.fullName}<br />
                      {new Date(inspection.qcApprovedAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Chip 
                  label={inspection.qcApprovedBy ? 'Approved' : inspection.status === 'on_hold' ? 'On Hold' : 'Pending'}
                  color={inspection.qcApprovedBy ? 'success' : inspection.status === 'on_hold' ? 'secondary' : 'warning'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1
              }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">PM Approval</Typography>
                  {inspection.pmApprovedBy && inspection.pmApprovedAt && (
                    <Typography variant="caption" color="text.secondary">
                      by {inspection.pmApprovedBy.fullName}<br />
                      {new Date(inspection.pmApprovedAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Chip 
                  label={inspection.pmApprovedBy ? 'Approved' : 'Pending'}
                  color={inspection.pmApprovedBy ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>

          {/* All Attachments */}
          {inspection.files && inspection.files.length > 0 && (
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachIcon color="primary" />
                All Files ({inspection.files.length})
              </Typography>
              
              <List dense>
                {inspection.files.map((file) => (
                  <ListItem 
                    key={file.id} 
                    sx={{ 
                      px: 0, 
                      py: 1,
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      {getFileIcon(file.fileType)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="body2" noWrap>
                          {file.fileName}
                        </Typography>
                      }
                      secondary={
                        <Chip 
                          label={file.fileType} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      }
                    />
                    <Tooltip title="Download">
                      <IconButton 
                        size="small" 
                        component="a"
                        href={file.filePath.startsWith('/') ? file.filePath : `/uploads/${file.filePath}`}
                        download={file.fileName}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Image Preview Dialog */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Image Preview</Typography>
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <BackIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img 
                src={selectedImage} 
                alt="Evidence" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain' 
                }} 
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Inspection' : 
           actionType === 'hold' ? 'Put Inspection on Hold' : 'Resume Inspection'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionType === 'approve' ? 'Please provide a comment for this approval:' :
             actionType === 'hold' ? 'Please provide a reason for putting this inspection on hold:' :
             'Please provide a comment for resuming this inspection:'}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              actionType === 'approve' ? 'Optional approval comment...' :
              actionType === 'hold' ? 'Reason for hold...' :
              'Optional resume comment...'
            }
            required={actionType === 'hold'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={
              actionType === 'approve' ? 'success' :
              actionType === 'hold' ? 'warning' : 'primary'
            }
            disabled={actionLoading || (actionType === 'hold' && !comment.trim())}
          >
            {actionLoading ? <CircularProgress size={20} /> : 
             actionType === 'approve' ? 'Approve' :
             actionType === 'hold' ? 'Put on Hold' : 'Resume'}
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
    </Box>
  );
};

export default InspectionDetailView;
