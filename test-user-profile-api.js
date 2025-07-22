/**
 * Test API endpoint untuk user profile
 */

const http = require('http')

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          })
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })
    
    req.end()
  })
}

async function testUserProfileAPI() {
  console.log('🧪 Testing User Profile API')
  console.log('===========================')
  
  try {
    console.log('📡 Testing GET /api/users/profile without auth...')
    const response = await makeRequest('GET', '/api/users/profile')
    
    console.log('📊 Response:')
    console.log('   Status:', response.status)
    console.log('   Data:', response.data)
    
    if (response.status === 401) {
      console.log('✅ Correct behavior - unauthorized access blocked')
    } else if (response.status === 404) {
      console.log('⚠️  Got 404 - this might indicate session/auth issue')
    } else {
      console.log('🤔 Unexpected response status')
    }
    
    // Test other endpoints for comparison
    console.log('\n📡 Testing GET /api/auth/session for comparison...')
    const sessionResponse = await makeRequest('GET', '/api/auth/session')
    console.log('   Session Status:', sessionResponse.status)
    console.log('   Session Data:', sessionResponse.data)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('')
    console.log('💡 Make sure the development server is running:')
    console.log('   npm run dev')
  }
}

testUserProfileAPI().catch(console.error)
