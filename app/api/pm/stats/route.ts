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

    // Check if user has PM or ADMIN role
    if (!["PM", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Get current month start and end
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get stats for current month
    const [
      pendingPM,
      approvedPM,
      rejectedPM,
      totalIncidents
    ] = await Promise.all([
      // Pending PM approval
      prisma.incident.count({
        where: {
          status: "PENDING_PM",
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      
      // Approved by PM
      prisma.incident.count({
        where: {
          status: "APPROVED_PM",
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      
      // Rejected by PM
      prisma.incident.count({
        where: {
          status: "REJECTED_PM",
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      
      // Total incidents this month
      prisma.incident.count({
        where: {
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      })
    ])

    // Get monthly stats for the last 6 months
    const monthlyStats = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      
      const [pending, approved, rejected] = await Promise.all([
        prisma.incident.count({
          where: {
            status: "PENDING_PM",
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.incident.count({
          where: {
            status: "APPROVED_PM",
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.incident.count({
          where: {
            status: "REJECTED_PM", 
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ])
      
      monthlyStats.push({
        month: monthStart.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }),
        pending,
        approved,
        rejected
      })
    }

    // Calculate average resolution time (for approved incidents)
    const approvedIncidents = await prisma.incident.findMany({
      where: {
        status: "APPROVED_PM",
        pmAt: { not: null },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      select: {
        createdAt: true,
        pmAt: true
      }
    })

    const avgResolutionTime = approvedIncidents.length > 0 
      ? approvedIncidents.reduce((total, incident) => {
          const resolutionTime = incident.pmAt 
            ? new Date(incident.pmAt).getTime() - incident.createdAt.getTime()
            : 0
          return total + resolutionTime
        }, 0) / approvedIncidents.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    return NextResponse.json({
      pendingPM,
      approvedPM,
      rejectedPM,
      totalIncidents,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal place
      monthlyStats
    })

  } catch (error) {
    console.error("Error fetching PM stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
