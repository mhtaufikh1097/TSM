// Force session reset script to resolve stream conflicts
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '../lib/db'

async function forceSessionReset() {
  console.log('🔥 [FORCE RESET] Starting complete session reset...')
  
  try {
    // 1. Clear database credentials
    console.log('🗄️ [FORCE RESET] Clearing database credentials...')
    await prisma.whatsAppCredential.deleteMany({})
    console.log('✅ [FORCE RESET] Database credentials cleared')
    
    // 2. Remove auth_info_baileys directory completely
    const authDir = path.join(process.cwd(), 'auth_info_baileys')
    try {
      await fs.rmdir(authDir, { recursive: true })
      console.log('✅ [FORCE RESET] auth_info_baileys directory removed')
    } catch (error) {
      console.log('ℹ️ [FORCE RESET] auth_info_baileys directory already removed or not found')
    }
    
    // 3. Wait a moment to ensure cleanup
    console.log('⏳ [FORCE RESET] Waiting 2 seconds for cleanup...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 4. Clear any WhatsApp session records
    console.log('📋 [FORCE RESET] Clearing WhatsApp session records...')
    await prisma.whatsAppSession.deleteMany({})
    console.log('✅ [FORCE RESET] Session records cleared')
    
    // 5. Clear any pending messages
    console.log('💬 [FORCE RESET] Clearing pending messages...')
    await prisma.whatsAppMessage.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'FAILED' }
    })
    console.log('✅ [FORCE RESET] Pending messages cleared')
    
    console.log('🎉 [FORCE RESET] Complete session reset finished!')
    console.log('📱 [FORCE RESET] Next step: Restart server and scan new QR code')
    
  } catch (error) {
    console.error('❌ [FORCE RESET] Error during reset:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  forceSessionReset().catch(console.error)
}

export { forceSessionReset }
