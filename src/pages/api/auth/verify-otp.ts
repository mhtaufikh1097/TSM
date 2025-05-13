// pages/api/auth/verify-otp.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';
import { validatePhoneNumber } from '@/utils/auth-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, code } = req.body;

    // Validate inputs
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    if (!code) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    const connection = await pool.getConnection();
    
    try {
      // Verify the code
      const [codes] = await connection.execute(
        'SELECT * FROM verification_codes WHERE phone_number = ? AND code = ? AND expires_at > NOW()',
        [phoneNumber, code]
      );

      const codesArray = codes as any[];
      if (codesArray.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }

      // Check if user exists (for login flow)
      const [users] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );

      const usersArray = users as any[];
      const userExists = usersArray.length > 0;

      return res.status(200).json({ 
        message: 'Verification successful',
        userExists
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}