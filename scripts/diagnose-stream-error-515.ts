#!/usr/bin/env node
/**
 * WhatsApp Stream Error 515 Diagnostic
 * Diagnose and fix Stream Error 515 connection issues
 */
import 'dotenv/config'
import { useGistAuthState, clearGistAuthState } from '../services/whatsapp/gist-auth-state'

async function diagnoseStreamError515() {
  console.log('🔍 Diagnosing WhatsApp Stream Error 515...\n')
  
  try {
    // 1. Check Gist auth state
    console.log('1️⃣ Checking GitHub Gist auth state...')
    const { state } = await useGistAuthState()
    
    const hasValidCredentials = state && state.creds && 
                               state.creds.noiseKey && 
                               state.creds.pairingEphemeralKeyPair
    
    console.log(`   ✅ Gist ID: ${process.env.WHATSAPP_GIST_ID}`)
    console.log(`   📋 State keys: [${Object.keys(state).join(', ')}]`)
    console.log(`   🔐 Valid credentials: ${hasValidCredentials}`)
    
    if (state.creds) {
      console.log(`   📱 Registration ID: ${state.creds.registrationId}`)
      console.log(`   🔑 Keys stored: ${Object.keys(state.keys || {}).length}`)
    }
    
    // 2. Check potential issues
    console.log('\n2️⃣ Analyzing potential issues...')
    
    // Issue 1: Invalid or corrupted credentials after migration
    if (!hasValidCredentials) {
      console.log('   ❌ Credentials invalid or missing - requires fresh session')
      console.log('   💡 Solution: Clear session and generate new QR code')
      return 'INVALID_CREDENTIALS'
    }
    
    // Issue 2: Check if credentials are stale
    if (state.creds && state.creds.registrationId) {
      console.log('   ✅ Credentials exist and seem valid')
      console.log('   ⚠️  Stream Error 515 is typically a WhatsApp server issue')
      console.log('   💭 Possible causes:')
      console.log('      - WhatsApp server overload')
      console.log('      - Rate limiting from server side')
      console.log('      - Session needs refresh due to inactivity')
      console.log('      - Network connectivity issues')
    }
    
    // 3. Test network connectivity 
    console.log('\n3️⃣ Testing network connectivity...')
    try {
      const response = await fetch('https://web.whatsapp.com', { method: 'HEAD' })
      console.log(`   ✅ WhatsApp web accessible: ${response.status}`)
    } catch (error) {
      console.log('   ❌ Network issue reaching WhatsApp servers')
      console.log(`   Error: ${(error as Error).message}`)
      return 'NETWORK_ERROR'
    }
    
    // 4. Recommendations
    console.log('\n4️⃣ Recommendations for Stream Error 515:')
    console.log('   🔄 Short-term fixes:')
    console.log('      1. Wait 30-60 seconds and retry connection')
    console.log('      2. Clear session and generate fresh QR code')
    console.log('      3. Ensure phone has stable internet connection')
    console.log('')
    console.log('   🛠️  Long-term improvements:')
    console.log('      1. Implement exponential backoff (already implemented)')
    console.log('      2. Add connection health monitoring')
    console.log('      3. Implement session refresh strategy')
    console.log('')
    console.log('   ⚡ Quick fix command:')
    console.log('      npx tsx scripts/clear-whatsapp-session.ts')
    
    return 'DIAGNOSIS_COMPLETE'
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
    return 'DIAGNOSIS_ERROR'
  }
}

async function main() {
  const result = await diagnoseStreamError515()
  
  console.log('\n' + '='.repeat(50))
  switch (result) {
    case 'INVALID_CREDENTIALS':
      console.log('🎯 SOLUTION: Clear credentials and restart')
      console.log('Run: npx tsx scripts/clear-whatsapp-session.ts')
      break
    case 'NETWORK_ERROR':
      console.log('🌐 SOLUTION: Check internet connection')
      break
    case 'DIAGNOSIS_COMPLETE':
      console.log('✅ Diagnosis complete - see recommendations above')
      break
    default:
      console.log('⚠️ Please check logs for issues')
  }
}

main()
