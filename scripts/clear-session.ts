// Clear WhatsApp Session Script
// This script safely clears WhatsApp session to resolve conflicts

import { promises as fs } from 'fs'
import path from 'path'

async function clearWhatsAppSession() {
  try {
    console.log('🧹 Starting WhatsApp session cleanup...')
    
    const authPath = path.join(process.cwd(), 'auth_info_baileys')
    
    // Check if auth directory exists
    try {
      await fs.access(authPath)
      console.log('📁 Found auth directory:', authPath)
    } catch (error) {
      console.log('ℹ️ No auth directory found, nothing to clean')
      return
    }
    
    // Read directory contents
    const files = await fs.readdir(authPath)
    console.log(`🔍 Found ${files.length} files in auth directory`)
    
    // Remove session files but keep basic creds structure
    let removedCount = 0
    for (const file of files) {
      if (file.startsWith('session-') || file.includes('app-state-sync')) {
        const filePath = path.join(authPath, file)
        await fs.unlink(filePath)
        console.log(`🗑️ Removed: ${file}`)
        removedCount++
      }
    }
    
    console.log(`✅ Session cleanup completed! Removed ${removedCount} files`)
    console.log('ℹ️ Credentials structure preserved for re-authentication')
    
  } catch (error) {
    console.error('❌ Error during session cleanup:', error)
  }
}

clearWhatsAppSession()
