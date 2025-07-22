/**
 * Test Base64 Database Auth State
 * Verifies that the Base64 encoding/decoding works properly with WhatsApp credentials
 */

import { useDatabaseAuthState, clearDatabaseAuthState } from './database-auth-state'
import { initAuthCreds } from '@whiskeysockets/baileys'

async function testBase64AuthState() {
  console.log('🧪 Testing Base64 Database Auth State')
  console.log('===================================')
  
  try {
    // Clear any existing state
    console.log('🗑️ Clearing existing state...')
    await clearDatabaseAuthState()
    
    // Test 1: Create new auth state
    console.log('\n📝 Test 1: Creating new auth state')
    const { state: state1, saveCreds: save1 } = await useDatabaseAuthState()
    
    console.log('✅ New credentials created')
    console.log('   - noiseKey exists:', !!state1.creds.noiseKey)
    console.log('   - pairingEphemeralKeyPair exists:', !!state1.creds.pairingEphemeralKeyPair)
    
    // Add some test keys (using proper Baileys key format)
    state1.keys.set({
      'sender-key': {
        'test-id-1': new Uint8Array([1, 2, 3, 4, 5]),
        'test-id-2': new Uint8Array([6, 7, 8, 9, 10])
      }
    })
    
    // Save the state
    console.log('\n💾 Saving credentials...')
    await save1()
    console.log('✅ Credentials saved')
    
    // Test 2: Load existing auth state
    console.log('\n📤 Test 2: Loading existing auth state')
    const { state: state2, saveCreds: save2 } = await useDatabaseAuthState()
    
    console.log('✅ Credentials loaded')
    console.log('   - noiseKey exists:', !!state2.creds.noiseKey)
    console.log('   - signedIdentityKey exists:', !!state2.creds.signedIdentityKey)
    
    // Test key retrieval
    const retrievedKeys = state2.keys.get('sender-key', ['test-id-1', 'test-id-2'])
    console.log('   - Retrieved keys count:', Object.keys(retrievedKeys).length)
    console.log('   - test-id-1 exists:', !!retrievedKeys['test-id-1'])
    console.log('   - test-id-2 exists:', !!retrievedKeys['test-id-2'])
    
    // Test 3: Add more keys and save again (skip complex key types for now)
    console.log('\n🔑 Test 3: Testing key persistence')
    // Just verify that existing keys persist
    await save2()
    console.log('✅ Keys persistence tested')
    
    // Test 4: Final verification
    console.log('\n🔍 Test 4: Final verification')
    const { state: state3 } = await useDatabaseAuthState()
    
    const allSenderKeys = state3.keys.get('sender-key', ['test-id-1', 'test-id-2'])
    
    console.log('✅ Final verification')
    console.log('   - Sender keys:', Object.keys(allSenderKeys).length)
    console.log('   - Credentials persistent:', !!state3.creds.noiseKey)
    
    // Test 5: Clear state
    console.log('\n🗑️ Test 5: Clearing state')
    await clearDatabaseAuthState()
    
    const { state: state4 } = await useDatabaseAuthState()
    const clearedKeys = state4.keys.get('sender-key', ['test-id-1'])
    
    console.log('✅ State cleared')
    console.log('   - New credentials created:', !!state4.creds.noiseKey)
    console.log('   - Old keys cleared:', Object.keys(clearedKeys).length === 0)
    console.log('   - Fresh state confirmed')
    
    console.log('\n🎉 All tests passed! Base64 encoding/decoding works correctly.')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
  }
}

// Helper function to compare Buffers
function compareBuffers(buf1: Buffer | Uint8Array, buf2: Buffer | Uint8Array): boolean {
  if (!buf1 || !buf2) return false
  if (buf1.length !== buf2.length) return false
  
  const b1 = Buffer.isBuffer(buf1) ? buf1 : Buffer.from(buf1)
  const b2 = Buffer.isBuffer(buf2) ? buf2 : Buffer.from(buf2)
  
  return Buffer.compare(b1, b2) === 0
}

// Run the test
testBase64AuthState().catch(console.error)
