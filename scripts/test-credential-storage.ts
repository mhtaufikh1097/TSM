// scripts/test-credential-storage.ts
import { CredentialManager } from '../lib/whatsapp/credential-manager';

async function testCredentialStorage() {
  console.log('🧪 Testing Credential Storage System');
  console.log('====================================\n');

  try {
    // 1. Get current status
    console.log('1. Getting current storage status...');
    const status = await CredentialManager.getStorageStatus();
    console.log('📊 Current Status:', JSON.stringify(status, null, 2));
    console.log();

    // 2. Test migration from file to database (if file exists)
    if (status.file.exists && !status.database.exists) {
      console.log('2. Testing migration from file to database...');
      const migrateResult = await CredentialManager.migrateFileToDatabase();
      console.log('📦 Migration Result:', JSON.stringify(migrateResult, null, 2));
      console.log();
    }

    // 3. Test storage status after migration
    console.log('3. Getting storage status after operations...');
    const statusAfter = await CredentialManager.getStorageStatus();
    console.log('📊 Status After Operations:', JSON.stringify(statusAfter, null, 2));
    console.log();

    // 4. Test mode switching
    console.log('4. Testing storage mode switching...');
    const currentMode = process.env.WHATSAPP_CREDENTIAL_STORAGE || 'file';
    const newMode = currentMode === 'file' ? 'database' : 'file';
    
    console.log(`   Current mode: ${currentMode}`);
    console.log(`   Switching to: ${newMode}`);
    
    const switchResult = await CredentialManager.switchStorageMode(newMode as 'file' | 'database');
    console.log('🔄 Switch Result:', JSON.stringify(switchResult, null, 2));
    console.log();

    // 5. Final status
    console.log('5. Final storage status...');
    const finalStatus = await CredentialManager.getStorageStatus();
    console.log('📊 Final Status:', JSON.stringify(finalStatus, null, 2));

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  testCredentialStorage();
}

export { testCredentialStorage };
