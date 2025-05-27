// pages/api/whatsapp/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { isWhatsAppConnected } from '@/lib/whatsapp/connection';

interface StatusResponse {
  connected: boolean;
  message: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      connected: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const connected = isWhatsAppConnected();
    
    return res.status(200).json({
      connected,
      message: connected 
        ? 'WhatsApp is connected and ready' 
        : 'WhatsApp is not connected. Please scan QR code.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Status check error:', error);
    
    return res.status(500).json({
      connected: false,
      message: 'Error checking WhatsApp status',
      timestamp: new Date().toISOString()
    });
  }
}