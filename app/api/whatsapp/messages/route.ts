import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { whatsappService } from "@/services/whatsapp"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const skip = (page - 1) * limit

    const where: Prisma.WhatsAppMessageWhereInput = {}
    if (status) where.status = status as "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
    if (type) where.type = type as "INCIDENT_SUBMITTED" | "QC_APPROVED" | "QC_REJECTED" | "PM_APPROVED" | "PM_REJECTED" | "SYSTEM_NOTIFICATION"

    const [messages, total, stats] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where,
        include: {
          incident: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.whatsAppMessage.count({ where }),
      whatsappService.getMessageStats()
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error) {
    console.error("Error getting messages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
