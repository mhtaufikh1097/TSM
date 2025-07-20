import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { whatsappService } from "@/services/whatsapp"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    switch (action) {
      case "restart":
        await whatsappService.restartConnection()
        return NextResponse.json({ 
          success: true, 
          message: "WhatsApp connection restarted" 
        })

      case "clear_session":
        await whatsappService.clearSession()
        return NextResponse.json({ 
          success: true, 
          message: "Session cleared. Please restart the service." 
        })

      case "initialize":
        await whatsappService.initialize()
        return NextResponse.json({ 
          success: true, 
          message: "WhatsApp service initialized" 
        })

      default:
        return NextResponse.json({ 
          error: "Invalid action" 
        }, { status: 400 })
    }
  } catch (error) {
    console.error("WhatsApp control error:", error)
    return NextResponse.json(
      { error: "Failed to control WhatsApp service" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await whatsappService.getConnectionStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("WhatsApp status error:", error)
    return NextResponse.json(
      { error: "Failed to get WhatsApp status" },
      { status: 500 }
    )
  }
}
