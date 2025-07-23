const axios = require('axios');

const API_BASE = 'https://botlinko.biz.id';

// Test different possible API keys
const possibleAPIKeys = [
  'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=',
  'your-super-secret-api-key-here',
  'your-api-secret-key',
  'whatsapp-storage-api-key',
  'botlinko-api-key',
  ''
];

const testAPIKey = async (apiKey) => {
  console.log(`\n🔑 Testing API Key: ${apiKey || '(empty)'}`);
  
  try {
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};
    
    const response = await axios.get(`${API_BASE}/api/whatsapp/sessions`, {
      headers,
      timeout: 5000
    });
    
    console.log(`✅ API Key works!`, response.data);
    return { key: apiKey, status: 'valid', data: response.data };
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`❌ Unauthorized`);
      return { key: apiKey, status: 'unauthorized' };
    } else {
      console.log(`⚠️ Other error:`, error.response?.data || error.message);
      return { key: apiKey, status: 'error', message: error.message };
    }
  }
};

const findValidAPIKey = async () => {
  console.log('🔍 WhatsApp Storage API - API Key Finder');
  console.log('========================================');
  
  for (const apiKey of possibleAPIKeys) {
    const result = await testAPIKey(apiKey);
    
    if (result.status === 'valid') {
      console.log(`\n🎯 Found valid API key: ${apiKey}`);
      console.log('✅ Update your test.js with this API key');
      return apiKey;
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n❌ No valid API key found from common options');
  console.log('💡 Suggestions:');
  console.log('1. Check your .env file on the server');
  console.log('2. Look for API_SECRET in cPanel environment variables');
  console.log('3. Check the deployment logs for the actual API key');
  
  return null;
};

findValidAPIKey().catch(console.error);
