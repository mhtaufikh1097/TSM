import { NextApiRequest, NextApiResponse } from 'next';
import { validateApprovalToken } from '@/services/whatsappService';
import { markTokenAsUsed } from '@/services/tokenService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token, markAsUsed = false } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const tokenData = await validateApprovalToken(token);

    if (!tokenData) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }

    // Optional: Mark token as used
    if (markAsUsed) {
      await markTokenAsUsed(token);
    }

    res.status(200).json({
      success: true,
      data: tokenData,
      message: 'Token validated successfully'
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}