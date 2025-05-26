import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'PhoneNumber is required' });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: phoneNumber },
      select: { id: true, phoneNumber: true }
    });

    const userExists = !!user;

    return res.status(200).json({ 
      userExists,
      message: userExists ? 'User exists' : 'User does not exist'
    });

  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
