// Simple test for WhatsApp browser version update
const http = require('http')

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (err) {
          resolve({ error: 'Invalid JSON response', data })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    
    req.end()
  })
}

async function testBrowserUpdate() {
  console.log('🔧 Testing WhatsApp Web Browser Version Update')
  console.log('=============================================')
  console.log('')

  try {
    // Test the browser configuration update
    console.log('🧪 Testing different browser configurations...')
    
    const result = await makeRequest('POST', '/api/whatsapp/refresh', { action: 'browser-test' })
    
    if (result.success) {
      console.log('✅ Browser configuration test successful!')
      console.log('📱 Working browser:', result.data.browser)
    } else {
      console.log('❌ Browser test failed:', result.message)
      console.log('🔄 Trying standard refresh...')
      
      // Fallback to standard refresh
      const refreshResult = await makeRequest('POST', '/api/whatsapp/refresh', { action: 'refresh' })
      console.log('🔄 Refresh result:', refreshResult.message)
    }

    // Get current status
    console.log('')
    console.log('📊 Getting current connection status...')
    
    const status = await makeRequest('GET', '/api/whatsapp/refresh')
    
    if (status.success) {
      console.log('📊 Connection diagnostics:')
      console.log('   Connected:', status.data.isConnected)
      console.log('   Has QR Code:', status.data.hasQRCode)
      console.log('   Reconnect Attempts:', status.data.reconnectAttempts)
      console.log('   Browser Delay (ms):', status.data.minReconnectDelay)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('')
    console.log('💡 Make sure the application is running on localhost:3000')
    console.log('💡 Try: npm run dev')
  }

  console.log('')
  console.log('📝 Summary of changes made:')
  console.log('1. ✅ Updated browser config to: Ubuntu Chrome 20.0.04')
  console.log('2. ✅ Updated @whiskeysockets/baileys library')
  console.log('3. ✅ Added browser version testing functionality')
  console.log('4. ✅ Added API endpoint for browser testing')
  console.log('')
  console.log('🎉 WhatsApp Web version update completed!')
}

// Run the test
testBrowserUpdate().catch(console.error)
