// pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

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

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        pin: true,
        fullName: true,
        role : true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPinValid = await verifyPin(pin, user.pin);
    if (!isPinValid) {
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    const token = generateToken(user.id, user.phoneNumber ?? '', user.fullName ?? '', user.role);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        role: user.role,
      },
    });
    
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}