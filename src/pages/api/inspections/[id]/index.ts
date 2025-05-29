import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    if (!id) {
      return res.status(400).json({ error: 'Inspection ID is required' });
    }

    const inspectionId = parseInt(id as string);
    
    // Get inspection with all related data
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        inspector: { 
          select: { 
            id: true, 
            fullName: true, 
            phoneNumber: true,
            role: true 
          } 
        },
        qcApprovedBy: { 
          select: { 
            id: true, 
            fullName: true 
          } 
        },
        pmApprovedBy: { 
          select: { 
            id: true, 
            fullName: true 
          } 
        },
        onHoldBy: { 
          select: { 
            id: true, 
            fullName: true 
          } 
        },
        files: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permissions - inspectors can only see their own inspections
    if (user.role === 'inspector' && inspection.inspectorId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.status(200).json({ inspection });

  } catch (error) {
    console.error('Error getting inspection detail:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
