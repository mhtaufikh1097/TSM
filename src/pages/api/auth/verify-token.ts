import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/auth-utils';
import pool from '@/db/connection';

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

    // Check if user still exists in the database
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id, phone_number FROM users WHERE id = ?',
      [decoded.userId]
    );
    connection.release();

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0] as { id: number; phone_number: string };
    
    res.status(200).json({ 
      message: 'Token valid',
      user: {
        id: user.id,
        phoneNumber: user.phone_number
      }
    });
    
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}