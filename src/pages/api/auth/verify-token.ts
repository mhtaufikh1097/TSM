import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth-utils';
import {prisma} from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check if user still exists in the database using Prisma
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phoneNumber: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'Token valid',
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber
      }
    });
    
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
