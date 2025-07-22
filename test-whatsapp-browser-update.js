#!/usr/bin/env node

/**
 * Test script for WhatsApp connection with updated browser version
 * This script tests the updated browser configuration and connection
 */

const { whatsappService } = require('./services/whatsapp/index.ts')

async function testWhatsAppBrowserUpdate() {
  console.log('🧪 Testing WhatsApp connection with updated browser version...')
  console.log('📱 Browser: Ubuntu Chrome 20.0.04')
  console.log('⏳ Starting connection test...\n')

  try {
    // Clear any existing session first
    console.log('🗑️ Clearing existing session...')
    await whatsappService.clearSessionManually()
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Get initial diagnostics
    console.log('📊 Initial diagnostics:')
    const initialDiagnostics = whatsappService.getConnectionDiagnostics()
    console.log(JSON.stringify(initialDiagnostics, null, 2))
    console.log('')

    // Test connection
    console.log('🔄 Initializing WhatsApp with updated browser version...')
    await whatsappService.initialize()

    // Wait for connection status
    let attempts = 0
    const maxAttempts = 30 // 30 seconds
    
    while (attempts < maxAttempts) {
      const status = await whatsappService.getConnectionStatus()
      
      console.log(`📊 Status check ${attempts + 1}/${maxAttempts}:`)
      console.log(`   Connected: ${status.isConnected}`)
      console.log(`   Has QR: ${status.hasQRCode}`)
      console.log(`   Session Exists: ${status.sessionExists}`)
      
      if (status.isConnected) {
        console.log('\n✅ Connection successful with updated browser version!')
        console.log('🎉 WhatsApp Web version issue resolved!')
        break
      }
      
      if (status.hasQRCode) {
        console.log('\n📱 QR Code generated successfully!')
        console.log('✨ Updated browser version is working - QR code is ready for scanning')
        console.log('⏰ QR will expire in 2 minutes if not scanned')
        
        // Wait longer for QR scan
        attempts = Math.max(attempts, maxAttempts - 20) // Give 20 seconds for QR scan
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }

    // Final diagnostics
    console.log('\n📊 Final diagnostics:')
    const finalDiagnostics = whatsappService.getConnectionDiagnostics()
    console.log(JSON.stringify(finalDiagnostics, null, 2))

    const finalStatus = await whatsappService.getConnectionStatus()
    
    if (finalStatus.isConnected) {
      console.log('\n🎉 SUCCESS: WhatsApp connected with updated browser version!')
      
      // Test sending a message
      console.log('\n📤 Testing message sending...')
      const testResult = await whatsappService.sendMessage(
        '6281234567890', // Test number
        '🧪 Test message with updated browser version\n✅ WhatsApp Web version updated successfully!'
      )
      console.log('Message test result:', testResult)
      
    } else if (finalStatus.hasQRCode) {
      console.log('\n📱 QR Code ready for scanning with updated browser version')
      console.log('✅ Browser version update successful - connection pending QR scan')
    } else {
      console.log('\n⚠️ Connection not established - checking for errors...')
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    
    // Check if it's a browser version related error
    if (error.message && error.message.includes('version')) {
      console.log('\n💡 Suggestions:')
      console.log('1. Update @whiskeysockets/baileys to latest version')
      console.log('2. Try different browser configurations')
      console.log('3. Clear WhatsApp session and retry')
    }
  }

  console.log('\n🔍 Test completed. Check the results above.')
}

// Run the test
testWhatsAppBrowserUpdate().catch(console.error)
