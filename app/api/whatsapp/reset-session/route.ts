// API endpoint for resolving WhatsApp session conflicts
import { NextRequest, NextResponse } from "next/server"
import { forceSessionReset } from "@/scripts/force-session-reset"

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 [API] Force session reset requested')
    
    // Execute force session reset
    await forceSessionReset()
    
    return NextResponse.json({
      success: true,
      message: 'Session reset completed successfully'
    })
    
  } catch (error) {
    console.error('❌ [API] Force session reset failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to trigger session reset',
    endpoints: {
      'POST /api/whatsapp/reset-session': 'Force reset WhatsApp session to resolve conflicts'
    }
  })
}
