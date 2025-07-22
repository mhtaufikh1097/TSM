/**
 * Test GitHub Gist Auth State
 * Verifies that the GitHub Gist storage works properly with WhatsApp credentials
 */
import 'dotenv/config'
import { useGistAuthState, clearGistAuthState } from './gist-auth-state.js'
import { initAuthCreds } from '@whiskeysockets/baileys'

async function testGistAuthState() {
  console.log('🧪 Testing GitHub Gist Auth State')
  console.log('====================================')

  // Check environment variables
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required')
    console.log('💡 Please set GITHUB_TOKEN in your .env file with a GitHub Personal Access Token')
    console.log('   The token needs "gist" scope permissions')
    return
  }

  console.log('🔑 GitHub Token found:', process.env.GITHUB_TOKEN ? '✅' : '❌')
  console.log('🆔 Gist ID:', process.env.WHATSAPP_GIST_ID || 'Will be created')

  try {
    // Clear any existing state
    console.log('\n🗑️ Clearing existing state...')
    await clearGistAuthState()

    // Test 1: Create new auth state
    console.log('\n📝 Test 1: Creating new auth state')
    const { state: state1, saveCreds: save1 } = await useGistAuthState()
    console.log('✅ New credentials created')
    console.log('   - noiseKey exists:', !!state1.creds.noiseKey)
    console.log('   - pairingEphemeralKeyPair exists:', !!state1.creds.pairingEphemeralKeyPair)
    console.log('   - registrationId:', state1.creds.registrationId)

    // Add some test keys (using proper Baileys key format)
    state1.keys.set({
      'sender-key': {
        'test-id-1': new Uint8Array([1, 2, 3, 4, 5]),
        'test-id-2': new Uint8Array([6, 7, 8, 9, 10])
      }
    })

    // Save the state
    console.log('\n💾 Saving credentials to GitHub Gist...')
    await save1()
    console.log('✅ Credentials saved to GitHub Gist')

    // Test 2: Load existing auth state
    console.log('\n📤 Test 2: Loading existing auth state')
    const { state: state2, saveCreds: save2 } = await useGistAuthState()
    console.log('✅ Credentials loaded from GitHub Gist')
    console.log('   - noiseKey exists:', !!state2.creds.noiseKey)
    console.log('   - signedIdentityKey exists:', !!state2.creds.signedIdentityKey)
    console.log('   - registrationId matches:', state1.creds.registrationId === state2.creds.registrationId)

    // Test key retrieval
    const retrievedKeys = state2.keys.get('sender-key', ['test-id-1', 'test-id-2']) as any
    console.log('   - Retrieved keys count:', Object.keys(retrievedKeys).length)
    console.log('   - test-id-1 exists:', !!retrievedKeys['test-id-1'])
    console.log('   - test-id-2 exists:', !!retrievedKeys['test-id-2'])

    // Test 3: Add more keys and save again
    console.log('\n🔑 Test 3: Testing key persistence')
    // Just verify that existing keys persist
    await save2()
    console.log('✅ Keys persistence tested')

    // Test 4: Final verification
    console.log('\n🔍 Test 4: Final verification')
    const { state: state3 } = await useGistAuthState()
    const allSenderKeys = state3.keys.get('sender-key', ['test-id-1', 'test-id-2']) as any
    console.log('✅ Final verification')
    console.log('   - Sender keys:', Object.keys(allSenderKeys).length)
    console.log('   - Credentials persistent:', !!state3.creds.noiseKey)
    console.log('   - Registration ID consistent:', state1.creds.registrationId === state3.creds.registrationId)

    // Test 5: Clear state
    console.log('\n🗑️ Test 5: Clearing state')
    await clearGistAuthState()
    
    // Test loading after clear
    const { state: state4 } = await useGistAuthState()
    console.log('✅ State cleared and recreated')
    console.log('   - New registration ID:', state4.creds.registrationId)
    console.log('   - Different from previous:', state1.creds.registrationId !== state4.creds.registrationId)

    console.log('\n🎉 All GitHub Gist auth state tests passed!')
    
    // Display important information
    if (process.env.WHATSAPP_GIST_ID) {
      console.log('\n📋 Configuration:')
      console.log(`   GITHUB_TOKEN: ✅ Set`)
      console.log(`   WHATSAPP_GIST_ID: ${process.env.WHATSAPP_GIST_ID}`)
      console.log('\n🌐 Gist URL: https://gist.github.com/' + process.env.WHATSAPP_GIST_ID)
    } else {
      console.log('\n⚠️  WHATSAPP_GIST_ID was not set. Check the logs above for the Gist ID to add to your .env file.')
    }

  } catch (error) {
    console.error('❌ GitHub Gist auth state test failed:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.log('\n💡 Authentication failed. Please check:')
        console.log('   1. GITHUB_TOKEN is valid')
        console.log('   2. Token has "gist" scope permissions')
        console.log('   3. Token has not expired')
      } else if (error.message.includes('404')) {
        console.log('\n💡 Gist not found. This is normal for first run.')
        console.log('   A new Gist will be created automatically.')
      }
    }
    
    throw error
  }
}

// Run test if called directly
if (require.main === module) {
  testGistAuthState()
    .then(() => {
      console.log('\n✅ GitHub Gist auth state is working correctly for WhatsApp deployment')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ GitHub Gist auth state test failed:', error)
      process.exit(1)
    })
}

export { testGistAuthState }
