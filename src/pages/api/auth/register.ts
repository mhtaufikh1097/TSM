// pages/api/auth/register.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';
import { hashPin, validatePhoneNumber, validatePin } from '@/utils/auth-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, pin, verificationCode, fullName, email } = req.body;

    // Validate inputs
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    if (!pin || !validatePin(pin)) {
      return res.status(400).json({ message: 'PIN must be 6 digits' });
    }

    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    const connection = await pool.getConnection();
    
    try {
      // Verify the verification code
      const [codes] = await connection.execute(
        'SELECT * FROM verification_codes WHERE phone_number = ? AND code = ? AND expires_at > NOW()',
        [phoneNumber, verificationCode]
      );

      const codesArray = codes as any[];
      if (codesArray.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }

      // Check if user already exists
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );

      const existingUsersArray = existingUsers as any[];
      if (existingUsersArray.length > 0) {
        return res.status(409).json({ message: 'User with this phone number already exists' });
      }

      // Hash the PIN
      const hashedPin = await hashPin(pin);

      // Create new user
      await connection.execute(
        'INSERT INTO users (phone_number, pin, full_name, email) VALUES (?, ?, ?, ?)',
        [phoneNumber, hashedPin, fullName || null, email || null]
      );

      // Delete the used verification code
      await connection.execute(
        'DELETE FROM verification_codes WHERE phone_number = ?',
        [phoneNumber]
      );

      return res.status(201).json({ message: 'User registered successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}