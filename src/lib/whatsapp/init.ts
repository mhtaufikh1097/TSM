// lib/whatsapp/init.ts
import { getWhatsAppSocket } from './connection';

getWhatsAppSocket().then(() => {
  console.log('✅ WhatsApp ready on startup');
}).catch(err => {
  console.error('❌ Failed to initialize WhatsApp socket:', err);
});
