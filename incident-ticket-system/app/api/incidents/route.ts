import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const priority = searchParams.get("priority") || ""
    const reporterId = searchParams.get("reporterId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (reporterId) {
      where.reporterId = reporterId
    }

    if (startDate || endDate) {
      where.occurredAt = {}
      if (startDate) {
        where.occurredAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.occurredAt.lte = new Date(endDate)
      }
    }

    // Role-based filtering
    if (session.user.role === "REPORTER") {
      where.reporterId = session.user.id
    }

    // Get incidents with pagination
    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          qc: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          pm: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              path: true,
              mimeType: true
            }
          },
          _count: {
            select: {
              attachments: true
            }
          }
        }
      }),
      prisma.incident.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      incidents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error("Error fetching incidents:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
