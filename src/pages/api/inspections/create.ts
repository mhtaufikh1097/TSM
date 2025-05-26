// pages/api/inspections/create.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createInspection } from '@/lib/inspectionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { inspectionData, files } = req.body;

    // Validate required fields
    if (!inspectionData || !inspectionData.inspectorId) {
      return res.status(400).json({ message: 'Missing required inspection data' });
    }

    const result = await createInspection(inspectionData, files || []);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Inspection created successfully'
    });
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}