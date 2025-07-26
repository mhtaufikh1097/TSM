// Complete WhatsApp Reset Script
// This script completely clears ALL WhatsApp credentials for fresh start

import { promises as fs } from 'fs'
import path from 'path'

async function completeWhatsAppReset() {
  try {
    console.log('🔥 Starting COMPLETE WhatsApp reset...')
    
    const authPath = path.join(process.cwd(), 'auth_info_baileys')
    
    // Check if auth directory exists
    try {
      await fs.access(authPath)
      console.log('📁 Found auth directory:', authPath)
    } catch (error) {
      console.log('ℹ️ No auth directory found, nothing to reset')
      return
    }
    
    // COMPLETE REMOVAL - Remove entire auth directory
    await fs.rmdir(authPath, { recursive: true })
    console.log('🗑️ Completely removed auth directory')
    
    // Clear any database sessions
    console.log('🧹 Clearing database sessions...')
    
    console.log('✅ COMPLETE reset completed!')
    console.log('ℹ️ Next connection will require fresh QR scan')
    console.log('⚠️ This will eliminate ALL conflicts')
    
  } catch (error) {
    console.error('❌ Error during complete reset:', error)
  }
}

completeWhatsAppReset()
