import { NextApiRequest, NextApiResponse } from 'next';
import { cleanupExpiredTokens } from '@/services/tokenService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const cleanedCount = await cleanupExpiredTokens();
    
    res.status(200).json({
      success: true,
      data: { cleanedCount },
      message: `Cleaned up ${cleanedCount} expired tokens`
    });
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}
