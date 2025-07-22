#!/usr/bin/env node
/**
 * WhatsApp Fresh Connection Script
 * Clear session and initiate fresh WhatsApp connection
 */
import 'dotenv/config'
import { clearGistAuthState } from '../services/whatsapp/gist-auth-state'

async function startFreshConnection() {
  console.log('🚀 Starting fresh WhatsApp connection...\n')
  
  try {
    // 1. Clear existing session
    console.log('1️⃣ Clearing existing session...')
    await clearGistAuthState()
    console.log('   ✅ Session cleared from GitHub Gist')
    
    // 2. Make API call to initialize new connection
    console.log('\n2️⃣ Initializing new WhatsApp connection...')
    
    try {
      const response = await fetch('http://localhost:3000/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'connect' })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('   ✅ Connection initiated successfully')
        console.log(`   📄 Response: ${JSON.stringify(data)}`)
      } else {
        console.log('   ⚠️ API response not OK, might need authentication')
        console.log(`   📄 Status: ${response.status}`)
      }
    } catch (apiError) {
      console.log('   ⚠️ API call failed (server might not be running)')
      console.log(`   📄 Error: ${(apiError as Error).message}`)
    }
    
    // 3. Instructions
    console.log('\n3️⃣ Next steps:')
    console.log('   👨‍💼 1. Login as admin: http://localhost:3000/auth/login')
    console.log('   📱 2. Go to WhatsApp admin: http://localhost:3000/admin/whatsapp')
    console.log('   🔌 3. Click "Connect WhatsApp" to get QR code')
    console.log('   📷 4. Scan QR code with your phone')
    console.log('')
    console.log('   🎯 This should resolve Stream Error 515 by creating fresh session')
    
  } catch (error) {
    console.error('❌ Error starting fresh connection:', error)
  }
}

startFreshConnection()
