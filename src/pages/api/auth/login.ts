// pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';
import { verifyPin, generateToken, validatePhoneNumber } from '@/utils/auth-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, pin } = req.body;

    // Validate inputs
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }

    const connection = await pool.getConnection();
    
    try {
      // Find user by phone number
      const [users] = await connection.execute(
        'SELECT id, phone_number, pin, full_name FROM users WHERE phone_number = ?',
        [phoneNumber]
      );

      const usersArray = users as any[];
      if (usersArray.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = usersArray[0];

      // Verify PIN
      const isValidPin = await verifyPin(pin, user.pin);
      if (!isValidPin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.phone_number, user.full_name );

      return res.status(200).json({ 
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          phoneNumber: user.phone_number,
          fullName: user.full_name,
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}