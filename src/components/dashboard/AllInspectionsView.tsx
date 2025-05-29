import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/router';

interface InspectionSummary {
  id: number;
  inspectionType: string;
  location: string;
  severity: string;
  status: string;
  createdAt: string;
  inspector: {
    id: number;
    fullName: string;
    phoneNumber: string;
  };
  qcApprovedBy?: {
    id: number;
    fullName: string;
  };
  pmApprovedBy?: {
    id: number;
    fullName: string;
  };
  rejectedBy?: {
    id: number;
    fullName: string;
  };
  onHoldBy?: {
    id: number;
    fullName: string;
  };
  onHoldAt?: string;
  onHoldReason?: string;
}

interface AllInspectionsViewProps {
  onViewInspection?: (inspectionId: number) => void;
}

const AllInspectionsView: React.FC<AllInspectionsViewProps> = ({ onViewInspection }) => {
  const { isInspector, isQc, isPm, user } = useAuth();
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load inspections when debounced search term or filters change
  useEffect(() => {
    loadInspections();
  }, [page, statusFilter, severityFilter, debouncedSearchTerm]);

  const loadInspections = useCallback(async () => {
    try {
      const isInitialLoad = loading;
      const isSearching = searchTerm !== debouncedSearchTerm;
      const isFiltering = !isInitialLoad && !isSearching;

      if (!isInitialLoad) {
        if (isSearching || searchTerm !== '') {
          setSearchLoading(true);
        } else if (isFiltering) {
          setFilterLoading(true);
        }
      }
      
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(severityFilter !== 'all' && { severity: severityFilter })
      });

      console.log('Making API request to:', `/api/inspections?${params}`);

      const response = await fetch(`/api/inspections?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('API Error Details:', errorData);
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
        }
        
        // Handle specific status codes
        if (response.status === 401) {
          localStorage.removeItem('token');
          setError('Session expired. Please log in again.');
          return;
        } else if (response.status === 403) {
          setError('Access denied. Please check your permissions.');
          return;
        } else if (response.status === 500) {
          setError('Server error. Please try again later.');
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || !Array.isArray(data.inspections)) {
        throw new Error('Invalid response format from server');
      }
      
      setInspections(data.inspections || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error('Error loading inspections:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load inspections';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setSearchLoading(false);
      setFilterLoading(false);
    }
  }, [page, statusFilter, severityFilter, debouncedSearchTerm, loading, searchTerm]);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'qc_approved': return 'QC Approved';
      case 'pm_approved': return 'PM Approved';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'qc_approved': return 'QC Approved';
      case 'pm_approved': return 'PM Approved';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  // Handle search with debounce to avoid calling API on every keystroke
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Reset to first page when search changes
    setPage(1);
  };

  // Handle filter changes with loading state
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    setFilterLoading(true);
  };

  const handleSeverityFilterChange = (value: string) => {
    setSeverityFilter(value);
    setPage(1);
    setFilterLoading(true);
  };

  const handleViewInspection = (inspectionId: number) => {
    if (onViewInspection) {
      onViewInspection(inspectionId);
    } else {
      // Fallback to navigation if no callback provided
      router.push(`/inspections/detail/${inspectionId}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ padding: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={150} height={24} />
        </Box>
        
        {/* Filters Skeleton */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <Skeleton variant="rectangular" width={250} height={40} />
            <Skeleton variant="rectangular" width={150} height={40} />
            <Skeleton variant="rectangular" width={150} height={40} />
          </Stack>
        </Paper>
        
        {/* Table Skeleton */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  {(isQc || isPm) && <TableCell><Skeleton variant="text" /></TableCell>}
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    {(isQc || isPm) && <TableCell><Skeleton variant="text" /></TableCell>}
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={100} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={32} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadInspections}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          All Inspections
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalCount} inspection{totalCount !== 1 ? 's' : ''} found
          {isInspector && ' (your inspections)'}
        </Typography>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searchLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SearchIcon />
                  )}
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              label="Status"
              disabled={filterLoading}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="qc_approved">QC Approved</MenuItem>
              <MenuItem value="pm_approved">PM Approved</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severityFilter}
              onChange={(e) => handleSeverityFilterChange(e.target.value)}
              label="Severity"
              disabled={filterLoading}
            >
              <MenuItem value="all">All Severity</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>

          {filterLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Filtering...
              </Typography>
            </Box>
          )}
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
              {(searchLoading || filterLoading) ? (
                // Show skeleton loading when searching or filtering
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    {(isQc || isPm) && <TableCell><Skeleton variant="text" /></TableCell>}
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={100} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isQc || isPm ? 8 : 7} align="center">
                    No inspections found.
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((inspection: InspectionSummary) => (
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
        
        {/* Show search/filter status */}
        {(searchLoading || filterLoading) && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {searchLoading ? 'Searching...' : 'Filtering data...'}
            </Typography>
          </Box>
        )}
        
        {/* Show debounce hint */}
        {searchTerm && searchTerm !== debouncedSearchTerm && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Type to search... (will search automatically after you stop typing)
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AllInspectionsView;
