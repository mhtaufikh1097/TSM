import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { id } = req.query;
    const { action, comment } = req.body;

    if (!id || !action) {
      return res.status(400).json({ error: 'Inspection ID and action are required' });
    }

    const inspectionId = parseInt(id as string);
    
    // Get current inspection
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        inspector: true,
        qcApprovedBy: true,
        pmApprovedBy: true,
        onHoldBy: true

      }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    let updateData: any = {};
    
    if (action === 'approve' && user.role == 'qc') {

      if (inspection.status !== 'pending' && inspection.status !== 'on_hold') {
        return res.status(400).json({ error: `Can only approve pending or on-hold inspections`});
      }

      updateData = {
        status: 'qc_approved',
        qcApprovedById: user.id,
        qcApprovedAt: new Date(),
        qcComment: comment || null,
        // Clear on hold data if coming from on_hold status
        onHoldById: null,
        onHoldAt: null,
        onHoldReason: null
      };

    } else if (action === 'approve' && user.role == 'pm') {
      // Only PM can approve from qc_approved status
      
      if (inspection.status !== 'qc_approved') {
        return res.status(400).json({ error: 'Can only approve QC approved inspections' });
      }

      updateData = {
        status: 'pm_approved',
        pmApprovedById: user.id,
        pmApprovedAt: new Date(),
        pmComment: comment || null
      };

    } else if (action === 'hold') {
      // Only QC can put inspection on hold from pending status
      if (user.role !== 'qc') {
        return res.status(403).json({ error: 'Only QC can hold inspections' });
      }

      if (inspection.status !== 'pending') {
        return res.status(400).json({ error: 'Can only hold pending inspections' });
      }

      if (!comment) {
        return res.status(400).json({ error: 'Reason is required for holding inspection' });
      }

      updateData = {
        status: 'on_hold',
        onHoldById: user.id,
        onHoldAt: new Date(),
        onHoldReason: comment
      };

    } else if (action === 'resume') {
      // Only the person who put it on hold or inspector can resume
      if (user.role === 'inspector' && inspection.inspectorId !== user.id) {
        return res.status(403).json({ error: 'Only the inspector who created this can resume' });
      }
      
      if (!['inspector', 'qc', 'pm'].includes(user.role)) {
        return res.status(403).json({ error: 'Not authorized to resume inspection' });
      }

      if (inspection.status !== 'on_hold') {
        return res.status(400).json({ error: 'Can only resume on-hold inspections' });
      }

      updateData = {
        status: 'pending',
        onHoldById: null,
        onHoldAt: null,
        onHoldReason: null
      };

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update inspection
    const updatedInspection = await prisma.inspection.update({
      where: { id: inspectionId },
      data: updateData,
      include: {
        inspector: { select: { id: true, fullName: true, phoneNumber: true } },
        qcApprovedBy: { select: { id: true, fullName: true } },
        pmApprovedBy: { select: { id: true, fullName: true } },
        onHoldBy: { select: { id: true, fullName: true } },
        files: true
      }
    });

    return res.status(200).json({
      message: 'Inspection status updated successfully',
      inspection: updatedInspection
    });

  } catch (error) {
    console.error('Error updating inspection status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
