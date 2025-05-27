

import { NextApiRequest, NextApiResponse } from 'next';
import { storeApprovalToken } from '@/services/tokenService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inspectionId, role, expirationHours } = req.body;
    
    if (!inspectionId || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = await storeApprovalToken(inspectionId, role, expirationHours);
    
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error in store token API:', error);
    res.status(500).json({ error: 'Failed to store token' });
  }
}