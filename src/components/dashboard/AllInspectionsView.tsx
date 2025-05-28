import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Pagination,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/router';

// Mock data - replace with actual API call
interface InspectionSummary {
  id: number;
  inspectionType: string;
  location: string;
  severity: string;
  status: string;
  createdAt: string;
  inspector: {
    fullName: string;
  };
}

interface AllInspectionsViewProps {
  onViewInspection?: (inspectionId: number) => void;
}

const AllInspectionsView: React.FC<AllInspectionsViewProps> = ({ onViewInspection }) => {
  const { isInspector, isQc, isPm } = useAuth();
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadInspections();
  }, [page, statusFilter, severityFilter, searchTerm]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData: InspectionSummary[] = [
        {
          id: 1,
          inspectionType: 'Safety Inspection',
          location: 'Building A - Floor 3',
          severity: 'high',
          status: 'pending',
          createdAt: '2024-01-15T10:30:00Z',
          inspector: { fullName: 'John Doe' }
        },
        {
          id: 2,
          inspectionType: 'Quality Control',
          location: 'Production Line 2',
          severity: 'medium',
          status: 'qc_approved',
          createdAt: '2024-01-14T14:20:00Z',
          inspector: { fullName: 'Jane Smith' }
        },
        {
          id: 3,
          inspectionType: 'Equipment Check',
          location: 'Workshop Area',
          severity: 'low',
          status: 'pm_approved',
          createdAt: '2024-01-13T09:15:00Z',
          inspector: { fullName: 'Mike Johnson' }
        }
      ];
      
      setInspections(mockData);
      setTotalPages(1);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'qc_approved': return 'QC Approved';
      case 'pm_approved': return 'PM Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const handleViewInspection = (inspectionId: number) => {
    if (onViewInspection) {
      onViewInspection(inspectionId);
    } else {
      // Fallback to navigation if no callback provided
      router.push(`/inspections/detail/${inspectionId}`);
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspectionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspector.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || inspection.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (loading) {
    return (
      <Box sx={{ padding: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading inspections...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Inspections
      </Typography>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="qc_approved">QC Approved</MenuItem>
              <MenuItem value="pm_approved">PM Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              label="Severity"
            >
              <MenuItem value="all">All Severity</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>
      
      {/* Inspections Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="inspections table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                {(isQc || isPm) && <TableCell>Inspector</TableCell>}
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isQc || isPm ? 8 : 7} align="center">
                    No inspections found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id} hover>
                    <TableCell>#{inspection.id}</TableCell>
                    <TableCell>{inspection.inspectionType}</TableCell>
                    <TableCell>{inspection.location}</TableCell>
                    {(isQc || isPm) && <TableCell>{inspection.inspector.fullName}</TableCell>}
                    <TableCell>
                      <Chip
                        label={inspection.severity.toUpperCase()}
                        color={getSeverityColor(inspection.severity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(inspection.status)}
                        color={getStatusColor(inspection.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(inspection.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewInspection(inspection.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isInspector && "View all your inspection reports and their current status."}
          {isQc && "Review and approve inspection reports from all inspectors."}
          {isPm && "Monitor all inspection reports across the organization."}
        </Typography>
      </Box>
    </Box>
  );
};

export default AllInspectionsView;
