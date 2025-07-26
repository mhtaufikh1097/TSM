// Test to see what file storage returns vs database storage
import { createCredentialStorage } from './lib/whatsapp/credential-storage';

async function compareStorages() {
  console.log('🔄 Comparing File vs Database storage...');
  
  // Test file storage
  process.env.WHATSAPP_CREDENTIAL_STORAGE = 'file';
  const fileStorage = createCredentialStorage();
  const { state: fileState } = await fileStorage.getAuthState();
  
  console.log('\n📂 FILE STORAGE:');
  console.log('  Keys get function:', typeof fileState.keys.get);
  
  // Test getting a key
  const fileKeys = fileState.keys.get('app-state-sync-key', ['AAAAAFl+']);
  console.log('  Retrieved keys:', Object.keys(fileKeys));
  if (fileKeys['AAAAAFl+']) {
    const key = fileKeys['AAAAAFl+'];
    console.log('  Key type:', typeof key);
    console.log('  Key constructor:', key.constructor?.name);
    console.log('  Key properties:', Object.keys(key));
    if (key.keyData) {
      console.log('  keyData type:', typeof key.keyData);
      console.log('  keyData constructor:', key.keyData.constructor?.name);
      console.log('  keyData is Buffer:', Buffer.isBuffer(key.keyData));
      console.log('  keyData is Uint8Array:', key.keyData instanceof Uint8Array);
    }
  }
  
  // Test database storage  
  process.env.WHATSAPP_CREDENTIAL_STORAGE = 'database';
  const dbStorage = createCredentialStorage();
  const { state: dbState } = await dbStorage.getAuthState();
  
  console.log('\n🗄️ DATABASE STORAGE:');
  console.log('  Keys get function:', typeof dbState.keys.get);
  
  // Test getting a key
  const dbKeys = dbState.keys.get('app-state-sync-key', ['AAAAAFl+']);
  console.log('  Retrieved keys:', Object.keys(dbKeys));
  if (dbKeys['AAAAAFl+']) {
    const key = dbKeys['AAAAAFl+'];
    console.log('  Key type:', typeof key);
    console.log('  Key constructor:', key.constructor?.name);
    console.log('  Key properties:', Object.keys(key));
    if (key.keyData) {
      console.log('  keyData type:', typeof key.keyData);
      console.log('  keyData constructor:', key.keyData.constructor?.name);
      console.log('  keyData is Buffer:', Buffer.isBuffer(key.keyData));
      console.log('  keyData is Uint8Array:', key.keyData instanceof Uint8Array);
    }
  }
}

compareStorages().catch(console.error);
