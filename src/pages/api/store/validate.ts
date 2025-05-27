
// pages/api/tokens/validate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { validateApprovalTokenFromDB } from '@/services/tokenService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await validateApprovalTokenFromDB(token);
    
    if (!result) {
      return res.status(404).json({ error: 'Token not found or expired' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in validate token API:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
}
