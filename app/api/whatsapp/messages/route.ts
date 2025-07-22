import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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

    const [messages, total, messageStats] = await Promise.all([
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
      // Get WhatsApp message statistics instead of notification stats
      Promise.all([
        prisma.whatsAppMessage.count({ where: { status: 'SENT' } }),
        prisma.whatsAppMessage.count({ where: { status: 'PENDING' } }),
        prisma.whatsAppMessage.count({ where: { status: 'FAILED' } }),
        prisma.whatsAppMessage.count({ where: { status: 'DELIVERED' } }),
        prisma.whatsAppMessage.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]).then(([sent, pending, failed, delivered, today]) => ({
        sent,
        pending, 
        failed,
        delivered,
        today
      }))
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: messageStats
    })

  } catch (error) {
    console.error("Error getting messages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
