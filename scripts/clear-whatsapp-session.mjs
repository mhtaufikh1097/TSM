#!/usr/bin/env node
/**
 * WhatsApp Session Manager
 * Clear and restart WhatsApp session with GitHub Gist
 */
import 'dotenv/config'
import { clearGistAuthState } from '../services/whatsapp/gist-auth-state'

async function clearAndRestart() {
  console.log('🧹 Clearing WhatsApp session from GitHub Gist...')
  
  try {
    // Clear Gist auth state
    await clearGistAuthState()
    console.log('✅ WhatsApp session cleared from GitHub Gist')
    
    // Make request to clear session via API
    console.log('🔄 Requesting session clear via API...')
    const clearResponse = await fetch('http://localhost:3000/api/whatsapp/clear-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (clearResponse.ok) {
      console.log('✅ Session cleared via API')
    } else {
      console.log('⚠️ API clear failed (might need auth), but Gist is cleared')
    }
    
    console.log('\n🚀 Session cleared! You can now:')
    console.log('1. Go to WhatsApp admin panel')
    console.log('2. Click "Connect WhatsApp" to get fresh QR code')
    console.log('3. Scan with your phone to connect')
    
  } catch (error) {
    console.error('❌ Error clearing session:', error)
  }
}

clearAndRestart()
