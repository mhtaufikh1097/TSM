import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const reporterId = searchParams.get("reporterId")

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date()
    const defaultStartDate = subDays(defaultEndDate, 30)

    const dateFrom = startDate ? startOfDay(new Date(startDate)) : defaultStartDate
    const dateTo = endDate ? endOfDay(new Date(endDate)) : defaultEndDate

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    };

    if (status && status !== "all") whereClause.status = status
    if (priority && priority !== "all") whereClause.priority = priority
    if (reporterId && reporterId !== "all") whereClause.reporterId = reporterId

    // Get basic statistics
    const [
      totalIncidents,
      statusBreakdown,
      priorityBreakdown,
      userBreakdown,
      dailyTrend,
      avgResolutionTime,
      recentIncidents
    ] = await Promise.all([
      // Total incidents count
      prisma.incident.count({ where: whereClause }),

      // Status breakdown
      prisma.incident.groupBy({
        by: ["status"],
        where: whereClause,
        _count: { id: true }
      }),

      // Priority breakdown
      prisma.incident.groupBy({
        by: ["priority"],
        where: whereClause,
        _count: { id: true }
      }),

      // User/Reporter breakdown
      prisma.incident.groupBy({
        by: ["reporterId"],
        where: whereClause,
        _count: { id: true },
        _max: { createdAt: true }
      }),

      // Daily trend (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'APPROVED_PM' THEN 1 ELSE 0 END) as resolved
        FROM Incident 
        WHERE createdAt >= ${dateFrom} AND createdAt <= ${dateTo}
        ${status && status !== "all" ? `AND status = '${status}'` : ''}
        ${priority && priority !== "all" ? `AND priority = '${priority}'` : ''}
        ${reporterId && reporterId !== "all" ? `AND reporterId = '${reporterId}'` : ''}
        GROUP BY DATE(createdAt) 
        ORDER BY date ASC
      `,

      // Average resolution time - remove invalid aggregate
      null,

      // Recent incidents for drill-down
      prisma.incident.findMany({
        where: whereClause,
        include: {
          reporter: {
            select: { name: true, email: true }
          },
          qc: {
            select: { name: true }
          },
          pm: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ])

    // Get user details for user breakdown
    const userIds = userBreakdown.map(item => item.reporterId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    })

    // Format user breakdown with names
    const formattedUserBreakdown = userBreakdown.map(item => {
      const user = users.find(u => u.id === item.reporterId)
      return {
        userId: item.reporterId,
        userName: user?.name || "Unknown User",
        userEmail: user?.email || "",
        count: item._count.id,
        lastIncident: item._max.createdAt
      }
    })

    // Calculate KPI metrics
    const resolvedCount = statusBreakdown.find(s => s.status === "APPROVED_PM")?._count.id || 0
    const resolutionRate = totalIncidents > 0 ? ((resolvedCount / totalIncidents) * 100).toFixed(1) : "0"
    
    const highPriorityCount = priorityBreakdown.find(p => p.priority === "HIGH")?._count.id || 0
    const criticalPriorityCount = priorityBreakdown.find(p => p.priority === "CRITICAL")?._count.id || 0
    const urgentIncidents = highPriorityCount + criticalPriorityCount

    // Format daily trend
    const formattedDailyTrend = (dailyTrend as Array<{ date: string; count: string; resolved: string }>).map(item => ({
      date: format(new Date(item.date), "yyyy-MM-dd"),
      incidents: parseInt(item.count),
      resolved: parseInt(item.resolved)
    }))

    // Calculate average resolution time (in hours) using pmAt instead of pmApprovedAt
    const resolvedIncidents = await prisma.incident.findMany({
      where: {
        ...whereClause,
        status: "APPROVED_PM",
        pmAt: { not: null }
      },
      select: {
        createdAt: true,
        pmAt: true
      }
    })

    const avgResolutionHours = resolvedIncidents.length > 0 
      ? resolvedIncidents.reduce((acc, incident) => {
          const diff = new Date(incident.pmAt!).getTime() - new Date(incident.createdAt).getTime()
          return acc + (diff / (1000 * 60 * 60)) // Convert to hours
        }, 0) / resolvedIncidents.length
      : 0

    const kpiMetrics = {
      totalIncidents,
      resolutionRate: parseFloat(resolutionRate),
      avgResolutionTime: Math.round(avgResolutionHours * 10) / 10, // Round to 1 decimal
      urgentIncidents,
      pendingQC: statusBreakdown.find(s => s.status === "PENDING_QC")?._count.id || 0,
      pendingPM: statusBreakdown.find(s => s.status === "PENDING_PM")?._count.id || 0
    }

    return NextResponse.json({
      dateRange: {
        from: format(dateFrom, "yyyy-MM-dd"),
        to: format(dateTo, "yyyy-MM-dd")
      },
      kpiMetrics,
      charts: {
        statusBreakdown: statusBreakdown.map(item => ({
          status: item.status,
          count: item._count.id
        })),
        priorityBreakdown: priorityBreakdown.map(item => ({
          priority: item.priority,
          count: item._count.id
        })),
        userBreakdown: formattedUserBreakdown,
        dailyTrend: formattedDailyTrend
      },
      recentIncidents,
      filters: {
        status,
        priority,
        reporterId,
        startDate: format(dateFrom, "yyyy-MM-dd"),
        endDate: format(dateTo, "yyyy-MM-dd")
      }
    })

  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
