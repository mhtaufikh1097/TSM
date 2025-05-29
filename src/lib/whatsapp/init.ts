// lib/whatsapp/init.ts
import { getWhatsAppSocket, getConnectionStatus } from './connection';

// Initialize WhatsApp connection only if not already connected
export const initializeWhatsApp = async () => {
  const status = getConnectionStatus();
  
  if (status.connected) {
    console.log('✅ WhatsApp already connected');
    return;
  }

  if (status.connecting) {
    console.log('⏳ WhatsApp connection already in progress');
    return;
  }

  try {
    console.log('🚀 Starting WhatsApp initialization...');
    await getWhatsAppSocket();
    console.log('✅ WhatsApp initialization completed');
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp:', error);
    // Don't throw error to prevent app crash
  }
};

// Auto-initialize only in production or when explicitly requested
if (process.env.NODE_ENV === 'production' || process.env.INIT_WHATSAPP === 'true') {
  initializeWhatsApp();
}
