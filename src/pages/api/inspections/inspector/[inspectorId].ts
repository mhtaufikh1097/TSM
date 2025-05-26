// pages/api/inspections/inspector/[inspectorId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getInspectorInspections } from '@/lib/inspectionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { inspectorId } = req.query;

    // Validate inspectorId parameter
    if (!inspectorId || isNaN(Number(inspectorId))) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid inspector ID' 
      });
    }

    const inspections = await getInspectorInspections(Number(inspectorId));
    
    res.status(200).json({
      success: true,
      data: inspections,
      message: `Found ${inspections.length} inspections for inspector ${inspectorId}`
    });
  } catch (error) {
    console.error('Error fetching inspector inspections:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}