// Test simple WhatsApp connection
import { getWhatsAppSocket, getCurrentQRCode, isWhatsAppConnected } from './lib/whatsapp/connection'

async function testSimpleConnection() {
  try {
    console.log('🧪 Testing Simple WhatsApp Connection...')
    
    // Test connection
    const socket = await getWhatsAppSocket()
    console.log('✅ Socket created successfully')
    
    // Check connection status
    const connected = isWhatsAppConnected()
    console.log('📱 Connection status:', connected ? 'CONNECTED' : 'DISCONNECTED')
    
    // Check QR code
    const qrCode = getCurrentQRCode()
    console.log('🔐 QR Code available:', qrCode ? 'YES' : 'NO')
    
    if (qrCode) {
      console.log('📱 QR Code ready for scanning')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSimpleConnection()
