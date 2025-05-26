import { NextApiRequest, NextApiResponse } from 'next';
import {prisma} from '@/lib/prisma';
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

    // Check if verification code is valid
    const code = await prisma.verificationCode.findFirst({
      where: {
        phoneNumber: phoneNumber,
        code: verificationCode,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!code) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: phoneNumber },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the PIN
    const hashedPin = await hashPin(pin);

    // Insert new user
    const user = await prisma.user.create({
      data: {
        phoneNumber: phoneNumber,
        pin: hashedPin,
        fullName: fullName,
        email,
        role: userRole,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, phoneNumber, fullName, userRole);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        phoneNumber,
        fullName,
        role: userRole,
      },
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
