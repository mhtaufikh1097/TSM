// pages/api/inspections/pending.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getPendingInspections } from '@/lib/inspectionService';

const VALID_ROLES = ['qc', 'pm'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { role } = req.query;

    // Validate role parameter
    if (!role || !VALID_ROLES.includes(role as any)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role. Must be either "qc" or "pm"' 
      });
    }

    const inspections = await getPendingInspections(role as 'qc' | 'pm');
    
    res.status(200).json({
      success: true,
      data: inspections,
      message: `Found ${inspections.length} pending inspections for ${role}`
    });
  } catch (error) {
    console.error('Error fetching pending inspections:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}