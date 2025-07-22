import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/services/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || 'refresh'
    
    console.log(`🔄 API: ${action} requested`)
    
    if (action === 'stream515') {
      // Handle Stream Error 515 specifically
      const result = await whatsappService.handleStreamError515()
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Stream Error 515 recovery initiated',
          data: result
        })
      } else {
        return NextResponse.json({
          success: false,
          message: result.message,
          error: result.error
        }, { status: 400 })
      }
    } else if (action === 'browser-test') {
      // Test different browser versions
      console.log('🧪 Testing different browser versions for WhatsApp Web compatibility')
      const result = await whatsappService.tryDifferentBrowserVersions()
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Found compatible browser version',
          data: result
        })
      } else {
        return NextResponse.json({
          success: false,
          message: result.message
        }, { status: 400 })
      }
    } else {
      // Default refresh QR code
      const result = await whatsappService.forceRefreshQR()
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'QR code refreshed successfully',
          data: result
        })
      } else {
        return NextResponse.json({
          success: false,
          message: result.message,
          error: result.error
        }, { status: 400 })
      }
    }
    
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to process request',
      error: String(error)
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 API: Get WhatsApp connection diagnostics')
    
    const diagnostics = whatsappService.getConnectionDiagnostics()
    
    return NextResponse.json({
      success: true,
      message: 'Connection diagnostics retrieved',
      data: diagnostics
    })
    
  } catch (error) {
    console.error('❌ API Error getting diagnostics:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get diagnostics',
      error: String(error)
    }, { status: 500 })
  }
}
