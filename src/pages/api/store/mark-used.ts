
// pages/api/tokens/mark-used.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { markTokenAsUsed } from '@/services/tokenService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const success = await markTokenAsUsed(token);
    
    if (!success) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in mark token as used API:', error);
    res.status(500).json({ error: 'Failed to mark token as used' });
  }
}