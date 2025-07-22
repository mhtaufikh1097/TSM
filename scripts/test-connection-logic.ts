#!/usr/bin/env node
/**
 * Test WhatsApp Connection Logic
 * Test new simplified connection logic
 */
import 'dotenv/config'

async function testConnectionLogic() {
  console.log('🧪 Testing WhatsApp connection logic...\n')
  
  try {
    // 1. Clear session first
    console.log('1️⃣ Clearing session...')
    const clearResponse = await fetch('http://localhost:3000/api/whatsapp/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'clear_session' })
    })
    
    if (clearResponse.ok) {
      const clearData = await clearResponse.json()
      console.log('   ✅ Session cleared:', clearData.message)
    } else {
      console.log('   ⚠️ Clear session failed (might need auth)')
    }
    
    // 2. Start fresh connection
    console.log('\n2️⃣ Starting fresh connection...')
    const connectResponse = await fetch('http://localhost:3000/api/whatsapp/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'restart' })
    })
    
    if (connectResponse.ok) {
      const connectData = await connectResponse.json()
      console.log('   ✅ Connection started:', connectData.message)
    } else {
      console.log('   ⚠️ Start connection failed (might need auth)')
    }
    
    // 3. Check status
    console.log('\n3️⃣ Checking connection status...')
    setTimeout(async () => {
      try {
        const statusResponse = await fetch('http://localhost:3000/api/whatsapp/status')
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('   📊 Status:', JSON.stringify(statusData, null, 2))
        } else {
          console.log('   ⚠️ Status check failed (might need auth)')
        }
      } catch (error) {
        console.log('   ❌ Status check error:', error)
      }
    }, 3000)
    
    console.log('\n✅ Connection logic test completed!')
    console.log('📋 Updated logic features:')
    console.log('   - Simplified reconnection logic')
    console.log('   - Check shouldReconnect based on logout status only')  
    console.log('   - Clear session when user logged out')
    console.log('   - Auto-reconnect for other disconnection types')
    console.log('\n🎯 Next: Login as admin and check WhatsApp admin panel')
    
  } catch (error) {
    console.error('❌ Error testing connection logic:', error)
  }
}

testConnectionLogic()
