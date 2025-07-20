import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { whatsappService } from "@/services/whatsapp"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const status = await whatsappService.getConnectionStatus()
    const stats = await whatsappService.getMessageStats()

    return NextResponse.json({
      connection: status,
      stats
    })

  } catch (error) {
    console.error("Error getting WhatsApp status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    switch (action) {
      case "connect":
        await whatsappService.initialize()
        return NextResponse.json({ message: "WhatsApp connection initiated" })

      case "retry_failed":
        const retriedCount = await whatsappService.retryFailedMessages()
        return NextResponse.json({ 
          message: `${retriedCount} failed messages queued for retry` 
        })

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Error handling WhatsApp action:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
