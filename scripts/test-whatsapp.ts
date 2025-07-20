// Test WhatsApp Connection Script
// Run this with: npx tsx scripts/test-whatsapp.ts

import { whatsappService } from '../services/whatsapp'

async function testWhatsApp() {
  try {
    console.log('🔍 Testing WhatsApp Connection...')
    
    // Get current status
    const status = await whatsappService.getConnectionStatus()
    console.log('📊 Current Status:', JSON.stringify(status, null, 2))
    
    // If not connected, try to initialize
    if (!status.isConnected) {
      console.log('🔌 Attempting to connect...')
      await whatsappService.initialize()
      
      // Wait for connection status update
      setTimeout(async () => {
        const newStatus = await whatsappService.getConnectionStatus()
        console.log('📊 Updated Status:', JSON.stringify(newStatus, null, 2))
        
        if (newStatus.qrCode) {
          console.log('📱 QR Code generated! Scan it in the browser at /admin/whatsapp')
        }
      }, 3000)
    } else {
      console.log('✅ WhatsApp is already connected!')
      
      // Test sending a message
      console.log('📤 Testing message sending...')
      const result = await whatsappService.sendMessage(
        '081224077855',
        'Test message from TSM WhatsApp Bot - Connection Test ✅',
        'TEST'
      )
      console.log('📨 Send Result:', result)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testWhatsApp()
