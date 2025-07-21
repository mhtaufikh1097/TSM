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

    const userId = session.user.id
    const userRole = session.user.role

    // Get total inspections
    const totalInspections = await prisma.incident.count()

    // Get inspections by status
    const [
      pendingQC,
      pendingPM,
      resolved,
      myReports,
      recentInspections
    ] = await Promise.all([
      // Pending QC review
      prisma.incident.count({
        where: {
          status: {
            in: ['OPEN', 'PENDING_QC']
          }
        }
      }),
      // Pending PM approval
      prisma.incident.count({
        where: {
          status: 'QC_APPROVED'
        }
      }),
      // Resolved inspections
      prisma.incident.count({
        where: {
          status: {
            in: ['PM_APPROVED']
          }
        }
      }),
      // My reports (for reporters)
      userRole === 'REPORTER' ? prisma.incident.count({
        where: {
          reporterId: userId
        }
      }) : 0,
      // Recent inspections
      // Recent inspections
      prisma.incident.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          ticketId: true,
          status: true,
          priority: true,
          createdAt: true,
          reporter: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Get monthly growth
    const currentMonth = new Date()
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const thisMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      prisma.incident.count({
        where: {
          createdAt: {
            gte: thisMonthStart
          }
        }
      }),
      prisma.incident.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: thisMonthStart
          }
        }
      })
    ])

    const monthlyGrowth = thisMonthCount - lastMonthCount

    // Get user-specific stats based on role
    let roleSpecificStats = {}
    
    if (userRole === 'QC') {
      const myQCReviews = await prisma.incident.count({
        where: {
          qcId: userId
        }
      })
      roleSpecificStats = { myQCReviews }
    } else if (userRole === 'PM') {
      const myPMApprovals = await prisma.incident.count({
        where: {
          pmId: userId
        }
      })
      roleSpecificStats = { myPMApprovals }
    }

    return NextResponse.json({
      totalInspections,
      pendingQC,
      pendingPM,
      resolved,
      myReports,
      monthlyGrowth,
      recentInspections: recentInspections.map(inspection => ({
        id: inspection.id,
        title: inspection.title,
        status: inspection.status,
        priority: inspection.priority,
        createdAt: inspection.createdAt,
        reporter: inspection.reporter.name
      })),
      ...roleSpecificStats
    })
    
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
