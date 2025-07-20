import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { notificationService } from "@/services/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { phones, message, type } = await request.json()

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json(
        { error: "Phone numbers array is required" },
        { status: 400 }
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const results = await notificationService.sendBulkNotification(
      phones,
      message.trim(),
      type || 'SYSTEM_NOTIFICATION'
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `Bulk message processed. ${successCount} successful, ${failureCount} failed.`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        details: results
      }
    })

  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
