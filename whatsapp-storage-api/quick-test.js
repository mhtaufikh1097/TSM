// Quick API test script
const axios = require('axios');

const API_BASE = 'https://botlinko.biz.id';
const API_SECRET = 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=';

const quickTest = async () => {
  console.log('🔍 Quick API Authentication Test');
  console.log('================================');
  
  try {
    console.log('Testing health endpoint...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health:', health.data.message);
    
    console.log('\nTesting authentication...');
    const auth = await axios.get(`${API_BASE}/api/whatsapp/sessions`, {
      headers: { 'X-API-Key': API_SECRET }
    });
    console.log('✅ Authentication successful!');
    console.log('📋 Sessions:', auth.data);
    
    console.log('\n🎉 API is working correctly!');
    console.log('💡 You can now run: node test.js');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication failed - API key not recognized');
      console.log('💡 Make sure to restart Node.js app in cPanel after updating environment variables');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
};

quickTest();
