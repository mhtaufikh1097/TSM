import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { whatsappService } from "@/services/whatsapp"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can clear WhatsApp session
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    await whatsappService.clearSessionManually()

    return NextResponse.json({ 
      success: true, 
      message: "WhatsApp session cleared successfully. Please scan QR code to reconnect." 
    })
  } catch (error) {
    console.error("Error clearing WhatsApp session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
