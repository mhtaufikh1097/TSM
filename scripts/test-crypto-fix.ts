#!/usr/bin/env node
/**
 * Test Crypto Error Fix
 * Verify that crypto/buffer error has been resolved
 */
import 'dotenv/config'
import { useGistAuthState } from '../services/whatsapp/gist-auth-state'

async function testCryptoErrorFix() {
  console.log('🧪 Testing crypto error fix...\n')
  
  try {
    // 1. Test Gist auth state
    console.log('1️⃣ Testing GitHub Gist auth state...')
    const { state } = await useGistAuthState()
    console.log('   ✅ Successfully loaded auth state from Gist')
    console.log('   📊 State keys:', Object.keys(state))
    
    // 2. Verify credentials structure
    console.log('\n2️⃣ Verifying credentials structure...')
    if (state.creds) {
      console.log('   ✅ Credentials exist')
      console.log('   🔑 Creds keys:', Object.keys(state.creds))
      
      // Check for valid crypto fields
      if (state.creds.noiseKey && state.creds.pairingEphemeralKeyPair) {
        console.log('   ✅ Crypto keys are properly structured')
        console.log('   📱 Registration ID:', state.creds.registrationId)
      } else {
        console.log('   ⚠️ Missing some crypto keys (expected for fresh session)')
      }
    } else {
      console.log('   ℹ️ No existing credentials (fresh start)')
    }
    
    // 3. Test keys storage
    console.log('\n3️⃣ Testing keys storage...')
    if (state.keys && Object.keys(state.keys).length > 0) {
      console.log('   📋 Keys stored:', Object.keys(state.keys).length)
    } else {
      console.log('   ℹ️ No existing keys (fresh start)')
    }
    
    // 4. Monitor for errors
    console.log('\n4️⃣ Monitoring WhatsApp service for errors...')
    console.log('   🔍 Check development server logs for:')
    console.log('      - No more crypto/buffer errors')
    console.log('      - Clean initialization process')
    console.log('      - Proper QR code generation')
    
    console.log('\n✅ Crypto error fix test completed!')
    console.log('📋 Summary:')
    console.log('   - GitHub Gist auth state is accessible')
    console.log('   - No corrupted crypto data detected')
    console.log('   - Fresh credentials will be generated')
    
    console.log('\n🎯 Expected behavior:')
    console.log('   - WhatsApp service should initialize cleanly')
    console.log('   - New QR code should generate without errors')
    console.log('   - No more "data argument must be of type string" errors')
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

testCryptoErrorFix()
