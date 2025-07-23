const axios = require('axios');

// Configuration - Change these values as needed
const API_BASE = 'https://botlinko.biz.id'; // Production API found!
// const API_BASE = 'http://localhost:3001'; // For local testing
const API_KEY = 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M='; // Production API key

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

console.log('🔧 Configuration:');
console.log(`📡 API Base: ${API_BASE}`);
console.log(`🔑 API Key: ${API_KEY}`);
console.log('');

// Test functions
const tests = {
  async healthCheck() {
    console.log('🔍 Testing health check...');
    try {
      const response = await axios.get(`${API_BASE}/health`);
      console.log('✅ Health check passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  },

  async saveCredentials() {
    console.log('💾 Testing save credentials...');
    try {
      const testCredentials = {
        sessionId: 'test-session-' + Date.now(),
        credentials: {
          creds: {
            noiseKey: 'test-noise-key',
            pairingEphemeralKeyPair: 'test-pairing-key',
            registrationId: 12345
          },
          keys: {
            'test-key-1': 'test-value-1',
            'test-key-2': 'test-value-2'
          }
        }
      };

      const response = await axios.post(`${API_BASE}/api/whatsapp/credentials`, testCredentials, { headers });
      console.log('✅ Save credentials passed:', response.data);
      return testCredentials.sessionId;
    } catch (error) {
      console.error('❌ Save credentials failed:', error.response?.data || error.message);
      return null;
    }
  },

  async getCredentials(sessionId) {
    console.log('📖 Testing get credentials...');
    try {
      const response = await axios.get(`${API_BASE}/api/whatsapp/credentials/${sessionId}`, { headers });
      console.log('✅ Get credentials passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Get credentials failed:', error.response?.data || error.message);
      return false;
    }
  },

  async updateCredentials(sessionId) {
    console.log('🔄 Testing update credentials...');
    try {
      const updatedCredentials = {
        credentials: {
          creds: {
            noiseKey: 'updated-noise-key',
            pairingEphemeralKeyPair: 'updated-pairing-key',
            registrationId: 54321
          },
          keys: {
            'updated-key-1': 'updated-value-1',
            'updated-key-2': 'updated-value-2',
            'new-key': 'new-value'
          }
        }
      };

      const response = await axios.put(`${API_BASE}/api/whatsapp/credentials/${sessionId}`, updatedCredentials, { headers });
      console.log('✅ Update credentials passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Update credentials failed:', error.response?.data || error.message);
      return false;
    }
  },

  async listSessions() {
    console.log('📋 Testing list sessions...');
    try {
      const response = await axios.get(`${API_BASE}/api/whatsapp/sessions`, { headers });
      console.log('✅ List sessions passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ List sessions failed:', error.response?.data || error.message);
      return false;
    }
  },

  async deleteCredentials(sessionId) {
    console.log('🗑️ Testing delete credentials...');
    try {
      const response = await axios.delete(`${API_BASE}/api/whatsapp/credentials/${sessionId}`, { headers });
      console.log('✅ Delete credentials passed:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Delete credentials failed:', error.response?.data || error.message);
      return false;
    }
  },

  async unauthorized() {
    console.log('🚫 Testing unauthorized access...');
    try {
      const response = await axios.get(`${API_BASE}/api/whatsapp/sessions`);
      console.error('❌ Unauthorized test failed: should have been blocked');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Unauthorized test passed: correctly blocked');
        return true;
      } else {
        console.error('❌ Unexpected error:', error.message);
        return false;
      }
    }
  }
};

// Run all tests
const runTests = async () => {
  console.log('🧪 Starting WhatsApp Storage API Tests');
  console.log('=====================================');

  const results = [];
  let sessionId = null;

  // Test health check
  results.push(await tests.healthCheck());

  // Test unauthorized access
  results.push(await tests.unauthorized());

  // Test save credentials
  sessionId = await tests.saveCredentials();
  results.push(!!sessionId);

  if (sessionId) {
    // Test get credentials
    results.push(await tests.getCredentials(sessionId));

    // Test update credentials
    results.push(await tests.updateCredentials(sessionId));

    // Test list sessions
    results.push(await tests.listSessions());

    // Test delete credentials
    results.push(await tests.deleteCredentials(sessionId));
  }

  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above.');
  }

  process.exit(passed === total ? 0 : 1);
};

// Start tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
