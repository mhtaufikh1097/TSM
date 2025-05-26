// pages/api/auth/verify-otp.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
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

    // Verify the code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        phoneNumber: phoneNumber,
        code: code,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationCode) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if user exists (for login flow)
    const user = await prisma.user.findUnique({
      where: {
        phoneNumber: phoneNumber,
      },
      select: {
        id: true,
      },
    });

    const userExists = !!user;

    return res.status(200).json({
      message: 'Verification successful',
      userExists,
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}