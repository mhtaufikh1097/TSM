#!/usr/bin/env node

// Test SSL connection to storage API
// require('dotenv').config();

const https = require('https');
const axios = require('axios');

console.log('🧪 Testing SSL connection to storage API...\n');

// Manually set environment variables for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'development';

const apiUrl = 'https://botlinko.biz.id';
const apiKey = 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=';

console.log('📍 API URL:', apiUrl);
console.log('🔑 API Key:', apiKey ? 'SET' : 'NOT SET');
console.log('🌍 NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

// Create HTTPS agent
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
  keepAlive: true,
  timeout: 30000
});

// Create axios instance
const client = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  httpsAgent: httpsAgent,
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  }
});

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing health check...');
    const healthResponse = await client.get('/health');
    console.log('✅ Health check successful:', healthResponse.data);

    console.log('\n2️⃣ Testing authentication...');
    const authResponse = await client.get('/test-auth');
    console.log('✅ Authentication successful:', authResponse.data);

    console.log('\n3️⃣ Testing WhatsApp sessions list...');
    const sessionsResponse = await client.get('/api/whatsapp/sessions');
    console.log('✅ Sessions list successful:', sessionsResponse.data);

    console.log('\n🎉 All tests passed! Storage API is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testConnection();
