import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { storageApiService } from "@/services/storage-api"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Test storage API connection
    const connectionTest = await storageApiService.testConnection()
    
    // Get WhatsApp sessions list
    const sessions = await storageApiService.listWhatsAppSessions()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      storageApi: {
        connection: connectionTest,
        whatsappSessions: {
          count: sessions.length,
          sessions: sessions
        }
      }
    })

  } catch (error: any) {
    console.error("Storage API test error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
