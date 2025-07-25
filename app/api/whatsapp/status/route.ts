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
    const qrCode = await whatsappService.getQRCode()

    console.log('ℹ️ Connection state:', status.isConnected)
    console.log('ℹ️ QR Code available:', !!qrCode)

    return NextResponse.json({
      success: true,
      service: {
        isConnected: status.isConnected,
        lastConnected: status.lastConnected,
        lastError: status.lastError,
        sessionExists: status.sessionExists,
        storageMode: status.storageMode
      },
      qrCode: qrCode || 'No QR code available',
      stats: {
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed, 
        totalPending: stats.totalPending,
        totalDelivered: stats.totalDelivered,
        totalRead: stats.totalRead
      }
    })

  } catch (error) {
    console.error("Error getting WhatsApp status:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      service: {
        isConnected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
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
