#!/usr/bin/env node

/**
 * WhatsApp Connection Diagnostic Script
 * 
 * This script helps diagnose WhatsApp connection issues by:
 * 1. Checking session files
 * 2. Testing connection
 * 3. Providing troubleshooting steps
 */

const fs = require('fs')
const path = require('path')

const sessionPath = path.join(process.cwd(), 'whatsapp_session')

console.log('🔍 WhatsApp Connection Diagnostics')
console.log('=' .repeat(50))

// Check if session directory exists
console.log('\n📁 Session Directory Check:')
if (fs.existsSync(sessionPath)) {
  console.log('✅ Session directory exists:', sessionPath)
  
  const files = fs.readdirSync(sessionPath)
  console.log(`📄 Session files (${files.length}):`)
  
  if (files.length === 0) {
    console.log('⚠️  No session files found - this is normal for first connection')
  } else {
    files.forEach(file => {
      const filePath = path.join(sessionPath, file)
      const stats = fs.statSync(filePath)
      console.log(`   - ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`)
    })
  }
} else {
  console.log('❌ Session directory not found:', sessionPath)
  console.log('   This will be created automatically on first connection')
}

// Check Node.js version
console.log('\n🟢 Node.js Version Check:')
const nodeVersion = process.version
console.log(`Node.js version: ${nodeVersion}`)

const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''))
if (majorVersion >= 16) {
  console.log('✅ Node.js version is compatible')
} else {
  console.log('⚠️  Node.js version might be too old. Recommended: v16+')
}

// Check package dependencies
console.log('\n📦 Package Dependencies Check:')
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  const requiredPackages = [
    '@whiskeysockets/baileys',
    '@hapi/boom',
    'qrcode-terminal',
    'qrcode'
  ]
  
  requiredPackages.forEach(pkg => {
    if (dependencies[pkg]) {
      console.log(`✅ ${pkg}: ${dependencies[pkg]}`)
    } else {
      console.log(`❌ ${pkg}: Not found`)
    }
  })
} catch (error) {
  console.log('❌ Could not read package.json')
}

// Troubleshooting recommendations
console.log('\n🛠️  Troubleshooting Recommendations:')
console.log('1. If connection keeps failing:')
console.log('   - Clear session: DELETE the whatsapp_session folder')
console.log('   - Restart the application')
console.log('   - Scan QR code quickly (within 45 seconds)')

console.log('\n2. For "Stream Errored" or connection timeouts:')
console.log('   - Check internet connection')
console.log('   - Try using mobile hotspot instead of WiFi')
console.log('   - Ensure firewall allows outbound connections')

console.log('\n3. For "Session conflict" errors:')
console.log('   - Close WhatsApp Web on all other devices')
console.log('   - Clear session and reconnect')

console.log('\n4. For persistent issues:')
console.log('   - Update @whiskeysockets/baileys to latest version')
console.log('   - Check if WhatsApp Web is down: https://web.whatsapp.com')

console.log('\n📱 Next Steps:')
console.log('1. Open your admin panel: http://localhost:3000/admin/whatsapp')
console.log('2. Click "Reset Connection" if needed')
console.log('3. Scan the QR code with your phone quickly')
console.log('4. Monitor the connection status')

console.log('\n✅ Diagnostic complete!')
