// Service selector - switches between real and mock WhatsApp service
// Set WHATSAPP_MOCK_MODE=true in .env.local to use mock service
// Set WHATSAPP_STORAGE_MODE=upload|enhanced|simple to choose storage method

const useMockService = process.env.WHATSAPP_MOCK_MODE === 'true'
const storageMode = process.env.WHATSAPP_STORAGE_MODE || 'simple'

console.log(`📱 WhatsApp Service Mode: ${useMockService ? 'MOCK' : 'REAL'}`)
console.log(`💾 WhatsApp Storage Mode: ${storageMode.toUpperCase()}`)
console.log(`🔧 WHATSAPP_MOCK_MODE: ${process.env.WHATSAPP_MOCK_MODE}`)
console.log(`🗂️  WHATSAPP_STORAGE_MODE: ${storageMode}`)
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`)

let whatsappService: any

if (useMockService) {
  console.log('⚠️  Using Mock WhatsApp Service for development')
  console.log('💡 Set WHATSAPP_MOCK_MODE=false to use real WhatsApp integration')
  
  // Import and use mock service
  const { whatsappService: mockService } = require('./mock-service')
  whatsappService = mockService
} else {
  if (storageMode === 'upload') {
    console.log('📱 Using Real WhatsApp Service with UPLOAD storage (Storage API)')
    
    // Import and create real service with upload storage
    const { WhatsAppService } = require('./index')
    whatsappService = new WhatsAppService()
  } else if (storageMode === 'enhanced') {
    console.log('🚀 Using ENHANCED WhatsApp Service with latest Baileys features (File System)')
    
    // Import and create enhanced service
    const { EnhancedWhatsAppService } = require('./enhanced-service')
    whatsappService = new EnhancedWhatsAppService()
  } else if (storageMode === 'simple') {
    console.log('🔥 Using SIMPLE WhatsApp Service with stable connection (File System)')
    
    // Import and create simple service
    const { SimpleWhatsAppService } = require('./simple-service')
    whatsappService = new SimpleWhatsAppService()
  } else {
    console.log('🔥 Using Default SIMPLE WhatsApp Service (stable connection)')
    
    // Default to simple service
    const { SimpleWhatsAppService } = require('./simple-service')
    whatsappService = new SimpleWhatsAppService()
  }
}

export { whatsappService }
