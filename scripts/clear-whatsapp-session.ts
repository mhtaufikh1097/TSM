import { prisma } from '../lib/db'

async function clearWhatsAppSession() {
  try {
    console.log('🗑️ Clearing corrupted WhatsApp session data...')
    
    await prisma.whatsAppSession.deleteMany({})
    console.log('✅ All WhatsApp session data cleared')
    
    // Create a fresh session entry
    await prisma.whatsAppSession.create({
      data: {
        id: 'main',
        isConnected: false,
        creds: {},
        keys: {}
      }
    })
    console.log('✅ Fresh WhatsApp session entry created')
    
  } catch (error) {
    console.error('❌ Error clearing session:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearWhatsAppSession()
