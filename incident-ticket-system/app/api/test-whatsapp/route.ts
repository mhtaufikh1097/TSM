import { NextResponse } from 'next/server'
import { whatsappService } from '@/services/whatsapp'

export async function GET() {
  try {
    console.log('🧪 Testing WhatsApp service...')
    
    // Test initialization
    await whatsappService.initialize()
    
    // Get status
    const status = await whatsappService.getConnectionStatus()
    
    console.log('📊 WhatsApp Status:', status)
    
    return NextResponse.json({
      success: true,
      status,
      message: 'WhatsApp service test completed'
    })
    
  } catch (error) {
    console.error('❌ WhatsApp test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json()
    
    if (!phone || !message) {
      return NextResponse.json({
        success: false,
        error: 'Phone and message are required'
      }, { status: 400 })
    }
    
    console.log(`🧪 Testing message send to ${phone}: ${message}`)
    
    const result = await whatsappService.sendMessage(phone, message, 'TEST_MESSAGE')
    
    console.log('📤 Send result:', result)
    
    return NextResponse.json({
      success: true,
      result,
      message: 'Test message sent'
    })
    
  } catch (error) {
    console.error('❌ Test send error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
