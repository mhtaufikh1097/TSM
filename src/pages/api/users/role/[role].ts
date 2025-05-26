// pages/api/users/role/[role].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getUsersByRole } from '@/lib/inspectionService';

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

    const users = await getUsersByRole(role as 'qc' | 'pm');
    
    res.status(200).json({
      success: true,
      data: users,
      message: `Found ${users.length} users with role ${role}`
    });
  } catch (error) {
    console.error(`Error fetching ${req.query.role} users:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}