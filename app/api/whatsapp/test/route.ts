import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { whatsappService } from "@/services/whatsapp"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phone, message } = await request.json()

    if (!phone || !message) {
      return NextResponse.json({ 
        error: "Phone and message are required" 
      }, { status: 400 })
    }

    // Send test message
    const result = await whatsappService.sendMessage(
      phone,
      message,
      'TEST',
      undefined
    )

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Test message sent successfully",
        messageId: result.messageId
      })
    } else {
      return NextResponse.json({ 
        success: false,
        error: result.error || "Failed to send message"
      }, { status: 500 })
    }
  } catch (error) {
    console.error("WhatsApp test error:", error)
    return NextResponse.json(
      { error: "Failed to send test message" },
      { status: 500 }
    )
  }
}
