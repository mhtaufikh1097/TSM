const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCredentials() {
  try {
    const session = await prisma.whatsAppCredential.findUnique({
      where: { sessionId: 'main' }
    });
    
    if (!session) {
      console.log('❌ No session found');
      return;
    }
    
    console.log('📊 Session data sizes:');
    console.log('- Creds:', session.creds ? JSON.stringify(session.creds).length : 0, 'chars');
    console.log('- Keys:', session.keys ? JSON.stringify(session.keys).length : 0, 'chars');
    
    if (session.keys) {
      const keys = JSON.parse(session.keys);
      console.log('\n🔑 Keys structure:');
      console.log('- Total keys:', Object.keys(keys).length);
      
      // Look for pre-key entries
      const preKeys = Object.keys(keys).filter(k => k.includes('pre-key'));
      console.log('- Pre-keys found:', preKeys.length);
      
      if (preKeys.length > 0) {
        const firstPreKey = preKeys[0];
        const keyData = keys[firstPreKey];
        console.log('\n🔍 Sample pre-key:', firstPreKey);
        console.log('- Type:', typeof keyData);
        console.log('- Structure:', Object.keys(keyData || {}));
        
        if (keyData && keyData.private) {
          console.log('- private key type:', typeof keyData.private);
          if (typeof keyData.private === 'string') {
            const buffer = Buffer.from(keyData.private, 'base64');
            console.log('- Base64 length:', keyData.private.length, 'chars');
            console.log('- Decoded length:', buffer.length, 'bytes');
            console.log('- First 10 bytes:', Array.from(buffer.slice(0, 10)));
          } else if (keyData.private && keyData.private.type === 'Buffer') {
            console.log('- Buffer data length:', keyData.private.data.length, 'elements');
            const buffer = Buffer.from(keyData.private.data);
            console.log('- Buffer length:', buffer.length, 'bytes');
            console.log('- First 10 bytes:', Array.from(buffer.slice(0, 10)));
          } else {
            console.log('- private key value:', keyData.private);
          }
          
          console.log('- public key type:', typeof keyData.public);
          if (typeof keyData.public === 'string') {
            const buffer = Buffer.from(keyData.public, 'base64');
            console.log('- Public Base64 length:', keyData.public.length, 'chars');
            console.log('- Public Decoded length:', buffer.length, 'bytes');
          }
        }
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCredentials();
