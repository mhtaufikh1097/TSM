#!/usr/bin/env node
/**
 * Fix WhatsApp Crypto Error
 * Clear session to fix crypto/buffer corruption issues
 */
import 'dotenv/config'
import { clearGistAuthState } from '../services/whatsapp/gist-auth-state'

async function fixCryptoError() {
  console.log('🔧 Fixing WhatsApp crypto/buffer error...\n')
  
  try {
    // 1. Clear GitHub Gist auth state completely
    console.log('1️⃣ Clearing corrupted auth state from GitHub Gist...')
    await clearGistAuthState()
    console.log('   ✅ Auth state cleared from GitHub Gist')
    
    // 2. Clear any local session files if they exist
    console.log('\n2️⃣ Checking for local session files...')
    const fs = require('fs')
    const path = require('path')
    
    const sessionPath = path.join(process.cwd(), 'whatsapp_session')
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true })
        console.log('   ✅ Local session files cleared')
      } catch (error) {
        console.log('   ⚠️ Could not clear local files:', (error as Error).message)
      }
    } else {
      console.log('   ℹ️ No local session files found')
    }
    
    // 3. Wait for cleanup
    console.log('\n3️⃣ Waiting for cleanup to complete...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n✅ Crypto error fix completed!')
    console.log('📋 What was done:')
    console.log('   - Cleared corrupted GitHub Gist auth state')
    console.log('   - Removed any local session files')
    console.log('   - Reset all authentication data')
    
    console.log('\n🚀 Next steps:')
    console.log('   1. The WhatsApp service will auto-restart with fresh credentials')
    console.log('   2. Go to admin panel: http://localhost:3000/admin/whatsapp')
    console.log('   3. Wait for new QR code generation')
    console.log('   4. Scan with your phone to reconnect')
    
    console.log('\n🎯 This should resolve the crypto/buffer error permanently!')
    
  } catch (error) {
    console.error('❌ Error fixing crypto issue:', error)
  }
}

fixCryptoError()
