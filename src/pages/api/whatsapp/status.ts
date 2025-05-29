import { NextApiRequest, NextApiResponse } from 'next';
import { getConnectionStatus, isWhatsAppConnected } from '@/lib/whatsapp/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = getConnectionStatus();
    
    return res.status(200).json({ 
      success: true, 
      connected: status.connected,
      connecting: status.connecting,
      connectionAttempts: status.attempts,
      user: status.user ? {
        id: status.user.id,
        name: status.user.name
      } : null,
      message: status.connected 
        ? 'WhatsApp is connected and ready' 
        : status.connecting 
          ? 'WhatsApp is connecting...' 
          : 'WhatsApp is not connected'
    });

  } catch (error: any) {
    console.error('WhatsApp status check error:', error);
    return res.status(500).json({ 
      success: false, 
      connected: false, 
      error: 'Failed to check WhatsApp status', 
      details: error.message 
    });
  }
}
