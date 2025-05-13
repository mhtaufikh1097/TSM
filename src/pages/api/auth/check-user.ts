import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;
  
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'PhoneNumber is required' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT id,phone_number FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    connection.release();

    const userExists = Array.isArray(users) && users.length > 0;
    
    return res.status(200).json({ 
      userExists,
      message: userExists ? 'User exists' : 'User does not exist'
    });
    
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}