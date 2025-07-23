const axios = require('axios');

// Configuration
const API_BASE = 'http://botlinko.biz.id';
const API_KEY = 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// Debug function to inspect responses
const debugRequest = async (method, url, data = null, customHeaders = headers) => {
  console.log(`\n🔍 Testing ${method.toUpperCase()} ${url}`);
  console.log(`📤 Headers:`, customHeaders);
  if (data) console.log(`📤 Data:`, JSON.stringify(data, null, 2));
  
  try {
    const config = {
      method: method.toLowerCase(),
      url: url,
      headers: customHeaders
    };
    
    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📥 Response Headers:`, response.headers);
    console.log(`📥 Response Data:`, typeof response.data === 'string' ? 
      response.data.substring(0, 200) + '...' : response.data);
    
    return { success: true, response };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`📥 Error Status: ${error.response.status}`);
      console.log(`📥 Error Headers:`, error.response.headers);
      console.log(`📥 Error Data:`, typeof error.response.data === 'string' ? 
        error.response.data.substring(0, 200) + '...' : error.response.data);
    }
    return { success: false, error };
  }
};

const runDebugTests = async () => {
  console.log('🔍 Debug Test Suite for WhatsApp Storage API');
  console.log('==============================================');
  
  // Test 1: Health check with detailed inspection
  await debugRequest('GET', `${API_BASE}/health`);
  
  // Test 2: Check if it's actually the WhatsApp Storage API
  await debugRequest('GET', `${API_BASE}/api/whatsapp/sessions`);
  
  // Test 3: Test without API key
  await debugRequest('GET', `${API_BASE}/api/whatsapp/sessions`, null, {
    'Content-Type': 'application/json'
  });
  
  // Test 4: Check root endpoint
  await debugRequest('GET', `${API_BASE}/`);
  
  // Test 5: Check if it's Next.js app instead of our API
  await debugRequest('GET', `${API_BASE}/api`);
  
  // Test 6: Try PUT method
  await debugRequest('PUT', `${API_BASE}/api/whatsapp/credentials/test`, {
    credentials: { test: 'data' }
  });
  
  // Test 7: Try DELETE method
  await debugRequest('DELETE', `${API_BASE}/api/whatsapp/credentials/test`);
  
  // Test 8: Check server info
  await debugRequest('OPTIONS', `${API_BASE}/`);
  
  console.log('\n🎯 Analysis:');
  console.log('1. Check if responses contain Next.js server code');
  console.log('2. Verify if correct API is deployed');
  console.log('3. Check HTTP methods support');
  console.log('4. Verify API authentication');
};

runDebugTests().catch(console.error);
