import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get message statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      total,
      sent,
      pending,
      failed,
      todayCount
    ] = await Promise.all([
      prisma.whatsAppMessage.count(),
      prisma.whatsAppMessage.count({ where: { status: 'SENT' } }),
      prisma.whatsAppMessage.count({ where: { status: 'PENDING' } }),
      prisma.whatsAppMessage.count({ where: { status: 'FAILED' } }),
      prisma.whatsAppMessage.count({ 
        where: { 
          createdAt: { gte: today } 
        } 
      })
    ])

    return NextResponse.json({
      total,
      sent,
      pending,
      failed,
      today: todayCount
    })
  } catch (error) {
    console.error("WhatsApp stats error:", error)
    return NextResponse.json(
      { error: "Failed to get WhatsApp stats" },
      { status: 500 }
    )
  }
}
