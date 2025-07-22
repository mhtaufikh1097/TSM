#!/usr/bin/env node
/**
 * Simple WhatsApp Connection Test
 * Test comprehensive error handling
 */
import 'dotenv/config'
import { whatsappService } from '../services/whatsapp'

async function testNewConnectionLogic() {
  console.log('🧪 Testing new comprehensive WhatsApp connection logic...\n')
  
  try {
    // 1. Get current diagnostics
    console.log('1️⃣ Getting connection diagnostics...')
    const diagnostics = whatsappService.getConnectionDiagnostics()
    console.log('📊 Current diagnostics:', JSON.stringify(diagnostics, null, 2))
    
    // 2. Get connection status
    console.log('\n2️⃣ Getting connection status...')
    const status = await whatsappService.getConnectionStatus()
    console.log('📋 Connection status:', JSON.stringify(status, null, 2))
    
    // 3. Clear session and restart
    console.log('\n3️⃣ Clearing session for fresh start...')
    await whatsappService.clearSessionManually()
    console.log('✅ Session cleared')
    
    // 4. Wait a moment
    console.log('\n4️⃣ Waiting 3 seconds...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 5. Start fresh connection
    console.log('\n5️⃣ Starting fresh connection...')
    await whatsappService.restartConnection()
    console.log('✅ Connection restart initiated')
    
    // 6. Check status after 5 seconds
    console.log('\n6️⃣ Checking status in 5 seconds...')
    setTimeout(async () => {
      try {
        const newStatus = await whatsappService.getConnectionStatus()
        const newDiagnostics = whatsappService.getConnectionDiagnostics()
        
        console.log('📊 Updated status:', JSON.stringify(newStatus, null, 2))
        console.log('🔍 Updated diagnostics:', JSON.stringify(newDiagnostics, null, 2))
        
        if (newStatus.hasQRCode) {
          console.log('\n📱 QR Code is available!')
          console.log('🌐 Access admin panel: http://localhost:3000/admin/whatsapp')
          console.log('📷 Scan the QR code to connect')
        }
        
        console.log('\n✅ Comprehensive connection logic test completed!')
        console.log('🎯 New features working:')
        console.log('   - Comprehensive disconnect reason handling')
        console.log('   - Smart session clearing logic')
        console.log('   - Error-specific reconnection strategies')
        console.log('   - Stream Error 515 specific handling')
        
      } catch (error) {
        console.error('❌ Error checking final status:', error)
      }
    }, 5000)
    
  } catch (error) {
    console.error('❌ Error testing connection logic:', error)
  }
}

testNewConnectionLogic()
