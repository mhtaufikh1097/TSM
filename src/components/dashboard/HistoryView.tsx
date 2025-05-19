import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useAuth } from '@/lib/auth-context';

const HistoryView: React.FC = () => {
  const {isInspector, isQc, isPm } = useAuth();

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        History
      </Typography>
      
      <Paper sx={{ width: '100%', overflow: 'hidden', mt: 3 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="history table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>ID</TableCell>
                {isPm && <TableCell>Inspector</TableCell>}
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No history records available.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isInspector && "This page shows your inspection history."}
          {isQc && "This page shows your review history."}
          {isPm && "This page shows the complete project inspection history."}
        </Typography>
      </Box>
    </Box>
  );
};

export default HistoryView;