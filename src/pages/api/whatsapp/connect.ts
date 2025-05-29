import { NextApiRequest, NextApiResponse } from 'next';
import { getWhatsAppSocket, disconnectWhatsApp, getConnectionStatus } from '@/lib/whatsapp/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Connect or reconnect WhatsApp
    try {
      console.log('🔄 Manual WhatsApp connection requested');
      const sock = await getWhatsAppSocket();
      
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp connected successfully',
        user: sock.user ? {
          id: sock.user.id,
          name: sock.user.name
        } : null
      });
    } catch (error: any) {
      console.error('❌ Manual connection failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to connect WhatsApp', 
        details: error.message 
      });
    }
  } 
  
  else if (req.method === 'DELETE') {
    // Disconnect WhatsApp
    try {
      await disconnectWhatsApp();
      return res.status(200).json({ 
        success: true, 
        message: 'WhatsApp disconnected successfully'
      });
    } catch (error: any) {
      console.error('❌ Manual disconnection failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to disconnect WhatsApp', 
        details: error.message 
      });
    }
  }
  
  else if (req.method === 'GET') {
    // Get current status
    const status = getConnectionStatus();
    return res.status(200).json({ 
      success: true, 
      ...status
    });
  }
  
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
