const axios = require('axios');

// Test different possible URLs for the deployed API
const possibleURLs = [
  'https://botlinko.biz.id/wa',
  'https://botlinko.biz.id/storage',
  'https://botlinko.biz.id/api',
  'https://botlinko.biz.id',
  'http://botlinko.biz.id/wa',
  'http://botlinko.biz.id:3001',
  'http://botlinko.biz.id:3002',
  'http://botlinko.biz.id:8080'
];

const API_KEY = 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=';

const testURL = async (baseURL) => {
  console.log(`\n🔍 Testing: ${baseURL}`);
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseURL}/health`, {
      timeout: 5000,
      headers: { 'X-API-Key': API_KEY }
    });
    
    console.log(`✅ Health check success:`, healthResponse.data);
    return { url: baseURL, status: 'healthy', data: healthResponse.data };
    
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ Response ${error.response.status}:`, error.response.data);
      return { url: baseURL, status: 'responded', error: error.response.status };
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ Connection refused`);
      return { url: baseURL, status: 'refused' };
    } else if (error.code === 'ENOTFOUND') {
      console.log(`❌ Host not found`);
      return { url: baseURL, status: 'not_found' };
    } else {
      console.log(`❌ Error:`, error.message);
      return { url: baseURL, status: 'error', message: error.message };
    }
  }
};

const runDiagnostic = async () => {
  console.log('🔍 WhatsApp Storage API - Diagnostic Tool');
  console.log('=========================================');
  
  const results = [];
  
  for (const url of possibleURLs) {
    const result = await testURL(url);
    results.push(result);
    
    // If we found a working URL, test more endpoints
    if (result.status === 'healthy') {
      console.log(`\n🎯 Found working API! Testing more endpoints...`);
      
      try {
        // Test sessions endpoint
        const sessionsResponse = await axios.get(`${url}/api/whatsapp/sessions`, {
          headers: { 'X-API-Key': API_KEY },
          timeout: 5000
        });
        console.log(`✅ Sessions endpoint works:`, sessionsResponse.data);
        
        // Test unauthorized access
        try {
          await axios.get(`${url}/api/whatsapp/sessions`, { timeout: 5000 });
          console.log(`❌ Security issue: Unauthorized access allowed`);
        } catch (authError) {
          if (authError.response?.status === 401) {
            console.log(`✅ Security working: Unauthorized access blocked`);
          }
        }
        
      } catch (endpointError) {
        console.log(`⚠️ API endpoints issue:`, endpointError.response?.data || endpointError.message);
      }
      
      break; // Found working URL, no need to test others
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Diagnostic Summary');
  console.log('====================');
  
  const working = results.filter(r => r.status === 'healthy');
  const responding = results.filter(r => r.status === 'responded');
  
  if (working.length > 0) {
    console.log(`✅ Working URLs found: ${working.length}`);
    working.forEach(w => console.log(`   - ${w.url}`));
  } else if (responding.length > 0) {
    console.log(`⚠️ Responding but not healthy: ${responding.length}`);
    responding.forEach(r => console.log(`   - ${r.url} (${r.error})`));
  } else {
    console.log(`❌ No working URLs found`);
  }
  
  console.log('\n💡 Recommendations:');
  if (working.length > 0) {
    console.log('1. ✅ API is working! Update test.js with the working URL');
    console.log('2. ✅ Run your test suite with the correct URL');
  } else if (responding.length > 0) {
    console.log('1. 🔧 API is deployed but endpoints may be wrong');
    console.log('2. 🔧 Check cPanel Node.js app configuration');
    console.log('3. 🔧 Verify startup file and routing');
  } else {
    console.log('1. ❌ API is not deployed or not accessible');
    console.log('2. ❌ Check cPanel deployment and Node.js app status');
    console.log('3. ❌ Verify domain configuration and firewall settings');
  }
};

runDiagnostic().catch(console.error);
