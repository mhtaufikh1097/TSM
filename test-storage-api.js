#!/usr/bin/env node

const { storageApiService } = require('./services/storage-api')

async function testStorageApiIntegration() {
  console.log('🧪 Testing Storage API Integration...\n')

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...')
    const isHealthy = await storageApiService.healthCheck()
    console.log(`   Health check: ${isHealthy ? '✅ PASS' : '❌ FAIL'}\n`)

    // Test 2: Authentication test
    console.log('2️⃣ Testing authentication...')
    const authTest = await storageApiService.testConnection()
    console.log(`   Authentication: ${authTest.success ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   Message: ${authTest.message}\n`)

    if (!authTest.success) {
      console.log('❌ Cannot proceed with further tests due to authentication failure')
      return
    }

    // Test 3: WhatsApp credentials CRUD operations
    console.log('3️⃣ Testing WhatsApp credentials operations...')
    
    const testSessionId = 'test-session-' + Date.now()
    const testCredentials = {
      noiseKey: 'test-noise-key',
      pairingEphemeralKeyPair: 'test-pairing-key',
      signedIdentityKey: 'test-signed-key',
      signedPreKey: 'test-signed-prekey',
      registrationId: 12345
    }

    // Create credentials
    console.log('   📝 Creating test credentials...')
    const createResult = await storageApiService.saveWhatsAppCredentials(testSessionId, testCredentials)
    console.log(`   Create: ${createResult.success ? '✅ PASS' : '❌ FAIL'}`)

    // Read credentials
    console.log('   📖 Reading test credentials...')
    const readResult = await storageApiService.getWhatsAppCredentials(testSessionId)
    console.log(`   Read: ${readResult ? '✅ PASS' : '❌ FAIL'}`)

    // Update credentials
    console.log('   🔄 Updating test credentials...')
    const updatedCredentials = { ...testCredentials, registrationId: 54321 }
    const updateResult = await storageApiService.updateWhatsAppCredentials(testSessionId, updatedCredentials)
    console.log(`   Update: ${updateResult.success ? '✅ PASS' : '❌ FAIL'}`)

    // List sessions
    console.log('   📋 Listing sessions...')
    const sessions = await storageApiService.listWhatsAppSessions()
    const hasTestSession = sessions.some(s => s.sessionId === testSessionId)
    console.log(`   List sessions: ${hasTestSession ? '✅ PASS' : '❌ FAIL'}`)

    // Delete credentials
    console.log('   🗑️ Deleting test credentials...')
    const deleteResult = await storageApiService.deleteWhatsAppCredentials(testSessionId)
    console.log(`   Delete: ${deleteResult.success ? '✅ PASS' : '❌ FAIL'}`)

    // Test 4: File upload
    console.log('\n4️⃣ Testing file upload...')
    
    const testFileContent = Buffer.from('This is a test file content for storage API testing.')
    const testFileName = 'test-file.txt'
    const testMimeType = 'text/plain'

    console.log('   📤 Uploading test file...')
    const uploadResult = await storageApiService.uploadFile(testFileContent, testFileName, testMimeType)
    console.log(`   Upload: ${uploadResult.success ? '✅ PASS' : '❌ FAIL'}`)

    if (uploadResult.success && uploadResult.file) {
      console.log(`   File details:`)
      console.log(`     - Original name: ${uploadResult.file.originalName}`)
      console.log(`     - Storage name: ${uploadResult.file.filename}`)
      console.log(`     - Size: ${uploadResult.file.size} bytes`)
      console.log(`     - Type: ${uploadResult.file.mimetype}`)
    }

    console.log('\n✅ Storage API integration test completed!')

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    console.error('Full error:', error)
  }
}

// Run the test
if (require.main === module) {
  testStorageApiIntegration()
    .then(() => {
      console.log('\n🎉 Test execution finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error)
      process.exit(1)
    })
}

module.exports = { testStorageApiIntegration }
