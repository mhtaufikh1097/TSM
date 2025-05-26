// pages/api/inspections/[id]/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { updateInspectionStatus } from '@/lib/inspectionService';

const VALID_STATUSES = ['qc_approved', 'pm_approved', 'rejected'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { status, approverId, comment } = req.body;

    // Validate ID parameter
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid inspection ID' 
      });
    }

    // Validate required fields
    if (!status || !approverId) {
      return res.status(400).json({ 
        success: false,
        message: 'Status and approverId are required' 
      });
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be one of: qc_approved, pm_approved, rejected' 
      });
    }

    const result = await updateInspectionStatus(
      Number(id),
      status,
      Number(approverId),
      comment
    );
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Inspection status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating inspection status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}