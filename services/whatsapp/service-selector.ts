// Service selector - SINGLETON PATTERN to prevent multiple instances
// This ensures only ONE WhatsApp service instance exists globally

console.log(`📱 WhatsApp Service Mode: REAL`)
console.log(`💾 WhatsApp Storage Mode: SIMPLE`)
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`)

// SINGLETON PATTERN - Only create ONE instance globally
let whatsappServiceInstance: any = null

function getWhatsAppServiceInstance() {
  if (whatsappServiceInstance === null) {
    console.log('🔥 Creating SINGLE WhatsApp Service instance')
    
    // Always use simple service for stability
    const { SimpleWhatsAppService } = require('./simple-service')
    whatsappServiceInstance = new SimpleWhatsAppService()
    
    console.log('✅ Single WhatsApp Service instance created')
  } else {
    console.log('♻️ Reusing existing WhatsApp Service instance')
  }
  
  return whatsappServiceInstance
}

// Export singleton instance
export const whatsappService = getWhatsAppServiceInstance()
