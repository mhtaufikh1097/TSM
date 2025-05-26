// pages/api/inspections/approve/[token].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateApprovalToken } from '@/services/whatsappService';
import { updateInspectionStatus, getInspectionById } from '@/services/inspectionService';
import { sendApprovalNotification } from '@/services/whatsappService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid token' });
  }
  
  // Validate the token
  const approvalDetails = validateApprovalToken(token);
  
  if (!approvalDetails) {
    return res.status(404).json({ error: 'Token not found or expired' });
  }
  
  const { inspectionId, role } = approvalDetails;
  
  if (req.method === 'GET') {
    try {
      // Get inspection details
      const inspection = await getInspectionById(inspectionId);
      
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      
      // Return just enough information for the approval page
      return res.status(200).json({
        inspection: {
          id: inspection.id,
          inspectionType: inspection.inspectionType,
          location: inspection.location,
          findings: inspection.findings,
          actionRequired: inspection.actionRequired,
          severity: inspection.severity,
          status: inspection.status,
          inspectorName: inspection.inspector.fullName,
          createdAt: inspection.createdAt,
          files: inspection.files
        },
        role,
        canApprove: (role === 'qc' && inspection.status === 'pending') || 
                   (role === 'pm' && inspection.status === 'qc_approved')
      });
    } catch (error) {
      console.error('Error fetching inspection:', error);
      return res.status(500).json({ error: 'Failed to fetch inspection details' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action, comment, approverId } = req.body;
      
      if (!action || !['approve', 'reject'].includes(action) || !approverId) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      // Get current inspection status to validate the action
      const inspection = await getInspectionById(inspectionId);
      
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      
      // Validate role permissions
      if (role === 'qc' && inspection.status !== 'pending') {
        return res.status(400).json({ error: 'This inspection is not pending QC approval' });
      }
      
      if (role === 'pm' && inspection.status !== 'qc_approved') {
        return res.status(400).json({ error: 'This inspection is not ready for PM approval' });
      }
      
      // Perform the approval/rejection
      const status = action === 'approve' 
        ? (role === 'qc' ? 'qc_approved' : 'pm_approved')
        : 'rejected';
      
      const updatedInspection = await updateInspectionStatus(
        inspectionId,
        status,
        approverId,
        comment
      );
      
      // Get approver name from the database
      const approverName = (role === 'qc' && updatedInspection.qcApprover?.fullName) || 
                         (role === 'pm' && updatedInspection.pmApprover?.fullName) ||
                         'Unknown';
      
      // Send notification to inspector about the approval/rejection
      await sendApprovalNotification(
        inspectionId,
        action === 'approve' ? 'approved' : 'rejected',
        comment || '',
        approverName,
        role,
        [updatedInspection.inspector.phoneNumber]
      );
      
      return res.status(200).json({
        success: true,
        message: `Inspection ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        status: updatedInspection.status
      });
    } catch (error) {
      console.error('Error updating inspection status:', error);
      return res.status(500).json({ error: 'Failed to update inspection status' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}