// pages/api/auth/verify-phone.ts
import { NextApiRequest, NextApiResponse } from 'next';
import {prisma} from '@/lib/prisma';
import { validatePhoneNumber, generateVerificationCode } from '@/utils/auth-utils';
import { sendVerificationCode } from '@/services/whatsappService';

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

    // Delete any existing verification codes for this phone number
    await prisma.verificationCode.deleteMany({
      where: { phoneNumber: phoneNumber },
    });

    // Insert new verification code
    await prisma.verificationCode.create({
      data: {
        phoneNumber: phoneNumber,
        code: verificationCode,
        expiresAt: expiresAt,
      },
    });

    await sendVerificationCode(verificationCode, phoneNumber);
    return res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
