// pages/api/send-message.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getWhatsAppSocket } from '@/lib/whatsapp/connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, to } = req.body;

    if (!message || !to) {
      return res.status(400).json({ error: 'Message and recipient are required' });
    }

    const sock = await getWhatsAppSocket();

    if (!sock) {
      return res.status(500).json({ error: 'WhatsApp connection not established' });
    }

    const formattedNumber = to.startsWith('+') ? to.substring(1) : to;
    const jid = `${formattedNumber}@s.whatsapp.net`;

    if (!sock.user) {
      return res.status(500).json({ error: 'WhatsApp connection not established yet' });
    }

    await sock.sendMessage(jid, { text: message });

    return res.status(200).json({ success: true, message: 'Message sent via WhatsApp' });

  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return res.status(500).json({ error: 'Failed to send WhatsApp message', details: error.message });
  }
}
