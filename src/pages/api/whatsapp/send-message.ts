// pages/api/whatsapp/send-message.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getWhatsAppSocket, isWhatsAppConnected } from '@/lib/whatsapp/connection';

interface SendMessageRequest {
  message: string;
  to: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  details?: string;
  requiresQR?: boolean;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, to }: SendMessageRequest = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Valid message is required' });
    }

    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'Valid recipient number is required' });
    }

    // Check if already connected
    if (!isWhatsAppConnected()) {
      console.log('WhatsApp not connected, attempting to connect...');
    }

    // Get WhatsApp socket with timeout
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 30000);
    });

    let sock;
    try {
      sock = await Promise.race([
        getWhatsAppSocket(),
        connectTimeout
      ]);
    } catch (error: any) {
      console.error('Failed to get WhatsApp socket:', error.message);
      
      if (error.message.includes('scan QR code')) {
        return res.status(503).json({ 
          error: 'WhatsApp requires QR code scan. Please check server logs.',
          requiresQR: true
        });
      }
      
      return res.status(503).json({ 
        error: 'WhatsApp service temporarily unavailable. Please try again.',
        details: error.message
      });
    }

    // Verify connection is still active
    if (!sock || !sock.user) {
      return res.status(503).json({ 
        error: 'WhatsApp connection not established. Please try again.' 
      });
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(to);
    if (!formattedNumber) {
      return res.status(400).json({ 
        error: 'Invalid phone number format' 
      });
    }

    const jid = `${formattedNumber}@s.whatsapp.net`;

    // Send message with retry logic
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Sending message attempt ${attempt}/${maxRetries} to ${jid}`);
        
        const result = await sock.sendMessage(jid, { 
          text: message.trim() 
        });

        if (result) {
          console.log('Message sent successfully:', result.key?.id);
          return res.status(200).json({ 
            success: true, 
            message: 'Message sent successfully via WhatsApp' 
          });
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Send attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    console.error('All send attempts failed:', lastError?.message);
    return res.status(500).json({ 
      error: 'Failed to send message after multiple attempts',
      details: lastError?.message 
    });

  } catch (error: any) {
    console.error('WhatsApp API handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function formatPhoneNumber(phoneNumber: string): string | null {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Must be at least 10 digits (minimum valid phone number)
  if (cleaned.length < 10) {
    return null;
  }
  
  // If it starts with country code, use as is
  // If it doesn't start with country code, you might want to add default country code
  // For example, if most users are from Indonesia (+62), you could add that
  
  return cleaned;
}

// Health check endpoint
export const config = {
  api: {
    responseLimit: false,
  },
}