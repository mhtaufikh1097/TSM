// pages/api/inspections/[id]/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { updateInspectionStatus } from '@/lib/inspectionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'Invalid inspection ID' });
    }

    const { status, approverId, comment } = req.body;

    // Validate required fields
    if (!status || !approverId) {
      return res.status(400).json({ message: 'Missing required fields: status and approverId' });
    }

    // Validate status values
    const validStatuses = ['qc_approved', 'pm_approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedInspection = await updateInspectionStatus(
      Number(id),
      status,
      Number(approverId),
      comment
    );

    res.status(200).json({
      success: true,
      data: updatedInspection,
      message: 'Inspection status updated successfully'
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