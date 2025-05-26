// pages/api/inspections/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getInspectionById } from '@/lib/inspectionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    // Validate ID parameter
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid inspection ID' 
      });
    }

    const inspection = await getInspectionById(Number(id));
    
    if (!inspection) {
      return res.status(404).json({ 
        success: false,
        message: 'Inspection not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}