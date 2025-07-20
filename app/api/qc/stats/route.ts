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

    // Check if user has QC or ADMIN role
    if (!["QC", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get stats
    const [pending, approved, rejected, totalThisMonth] = await Promise.all([
      // Pending QC count
      prisma.incident.count({
        where: { status: "PENDING_QC" }
      }),
      
      // Approved this month
      prisma.incident.count({
        where: {
          status: { in: ["APPROVED_QC", "PENDING_PM", "APPROVED_PM", "REJECTED_PM"] },
          qcAt: { gte: startOfMonth }
        }
      }),
      
      // Rejected this month
      prisma.incident.count({
        where: {
          status: "REJECTED_QC",
          qcAt: { gte: startOfMonth }
        }
      }),
      
      // Total reviewed this month
      prisma.incident.count({
        where: {
          qcAt: { gte: startOfMonth }
        }
      })
    ])

    return NextResponse.json({
      stats: {
        pending,
        approved,
        rejected,
        totalThisMonth
      }
    })

  } catch (error) {
    console.error("Error fetching QC stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
