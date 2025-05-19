import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';
import { hashPin, generateToken, validatePhoneNumber } from '@/utils/auth-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, pin, verificationCode, fullName, email, role } = req.body;

    // Validate inputs
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    if (!pin || pin.length < 4) {
      return res.status(400).json({ message: 'PIN must be at least 4 digits' });
    }

    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate role - default to inspector if not provided or invalid
    const validRoles = ['inspector', 'qc', 'pm'];
    const userRole = validRoles.includes(role) ? role : 'inspector';

    const connection = await pool.getConnection();
    
    try {
      // Check if verification code is valid
      const [codes] = await connection.execute(
        'SELECT * FROM verification_codes WHERE phone_number = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
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
        return res.status(409).json({ message: 'User already exists' });
      }

      // Hash the PIN
      const hashedPin = await hashPin(pin);

      // Insert new user
      const [result] = await connection.execute(
        'INSERT INTO users (phone_number, pin, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
        [phoneNumber, hashedPin, fullName, email, userRole]
      );

      const resultObj = result as any;
      const userId = resultObj.insertId;

      // Generate JWT token
      const token = generateToken(userId, phoneNumber, fullName, userRole);

      return res.status(201).json({ 
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          phoneNumber,
          fullName,
          role: userRole
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}