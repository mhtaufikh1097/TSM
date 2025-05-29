// pages/api/whatsapp/send-message.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getWhatsAppSocket, isWhatsAppConnected } from '@/lib/whatsapp/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, to } = req.body;

    if (!message || !to) {
      return res.status(400).json({ error: 'Message and recipient are required' });
    }

    // Check if already connected before trying to get socket
    if (!isWhatsAppConnected()) {
      console.log('📱 WhatsApp not connected, attempting to connect...');
    }

    const sock = await getWhatsAppSocket();

    if (!sock || !sock.user) {
      return res.status(503).json({ 
        error: 'WhatsApp connection not established',
        message: 'Please ensure WhatsApp is properly connected and authenticated'
      });
    }

    // Format phone number properly
    const formattedNumber = to.replace(/[^\d]/g, ''); // Remove all non-digits
    const jid = `${formattedNumber}@s.whatsapp.net`;

    console.log('📤 Sending WhatsApp message:', { to: formattedNumber, messageLength: message.length });

    await sock.sendMessage(jid, { text: message });

    console.log('✅ WhatsApp message sent successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Message sent via WhatsApp',
      to: formattedNumber
    });

  } catch (error: any) {
    console.error('❌ WhatsApp API error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Connection timeout')) {
      return res.status(408).json({ 
        error: 'WhatsApp connection timeout', 
        details: 'Unable to establish connection within timeout period'
      });
    } else if (error.message.includes('logged out')) {
      return res.status(401).json({ 
        error: 'WhatsApp session expired', 
        details: 'Please scan QR code to re-authenticate'
      });
    } else if (error.message.includes('Max reconnection attempts')) {
      return res.status(503).json({ 
        error: 'WhatsApp service unavailable', 
        details: 'Please restart the WhatsApp service'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to send WhatsApp message', 
      details: error.message 
    });
  }
}
