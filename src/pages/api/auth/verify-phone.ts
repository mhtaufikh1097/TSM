// pages/api/auth/verify-phone.ts
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/db/connection';
import { validatePhoneNumber, generateVerificationCode } from '@/utils/auth-utils';
import { sendInspectionReport, sendVerificationCode } from '@/services/whatsappService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    // Store verification code in database
    const connection = await pool.getConnection();
    
    try {
      // Delete any existing verification codes for this phone number
      await connection.execute(
        'DELETE FROM verification_codes WHERE phone_number = ?',
        [phoneNumber]
      );
      
      // Insert new verification code
      await connection.execute(
        'INSERT INTO verification_codes (phone_number, code, expires_at) VALUES (?, ?, ?)',
        [phoneNumber, verificationCode, expiresAt]
      );
      
      // In a real application, you would send this code via SMS
      // For demo purposes, we'll return it in the response
      // NOTE: In production, NEVER return the verification code to the client
      // if (process.env.NODE_ENV === 'development') {
      //   return res.status(200).json({ 
      //     message: 'Verification code sent successfully',
      //     code: verificationCode // Only for development!
      //   });
      // } else {
          await sendVerificationCode(verificationCode, phoneNumber);
          return res.status(200).json({ message: 'Verification code sent successfully' });
      // }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}