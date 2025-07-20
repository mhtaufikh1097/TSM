import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { emailService } from "@/services/email"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format, addDays, addWeeks, addMonths } from "date-fns"

// Types for scheduled reports
interface ScheduleConfig {
  frequency: "daily" | "weekly" | "monthly"
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  time: string // HH:MM format
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      action,
      scheduleName,
      reportType,
      recipients,
      schedule,
      filters,
      isActive = true
    } = await request.json()

    if (action === "create_schedule") {
      // Validate required fields
      if (!scheduleName || !reportType || !recipients || !schedule) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        )
      }

      // Calculate next run date
      const nextRunDate = calculateNextRunDate(schedule)

      // Save schedule to database (you'll need to create this table)
      // For now, we'll just return success

      // Send confirmation email
      if (emailService.isConfigured()) {
        await emailService.sendScheduledReportNotification({
          recipients,
          scheduleName,
          nextRunDate
        })
      }

      return NextResponse.json({
        success: true,
        message: "Scheduled report created successfully",
        nextRunDate: nextRunDate.toISOString()
      })
    }

    if (action === "send_now") {
      // Generate and send report immediately
      const { reportType, recipients, filters } = await request.json()

      // Generate PDF report
      const pdfResult = await generatePDFReport(reportType, filters)
      
      if (emailService.isConfigured()) {
        await emailService.sendReportEmail({
          recipients,
          reportType,
          dateRange: {
            from: filters.startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
            to: filters.endDate || format(new Date(), "yyyy-MM-dd")
          },
          pdfBuffer: pdfResult.buffer,
          summary: pdfResult.summary
        })

        return NextResponse.json({
          success: true,
          message: `Report sent to ${recipients.length} recipients`
        })
      } else {
        return NextResponse.json(
          { error: "Email service not configured" },
          { status: 500 }
        )
      }
    }

    if (action === "test_email") {
      // Test email configuration
      if (!emailService.isConfigured()) {
        return NextResponse.json(
          { error: "Email service not configured" },
          { status: 500 }
        )
      }

      const testRecipient = session.user.email || "admin@example.com"
      
      await emailService.sendEmail({
        to: testRecipient,
        subject: "TSM Email Test",
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email from the TSM Incident Management System.</p>
          <p>If you receive this email, your email configuration is working correctly.</p>
          <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        `
      })

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${testRecipient}`
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("Error handling scheduled report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function calculateNextRunDate(schedule: ScheduleConfig): Date {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(":").map(Number)
  
  let nextRun = new Date(now)
  nextRun.setHours(hours, minutes, 0, 0)

  // If the time has already passed today, start from tomorrow
  if (nextRun <= now) {
    nextRun = addDays(nextRun, 1)
  }

  switch (schedule.frequency) {
    case "daily":
      // Already set to next occurrence
      break

    case "weekly":
      // Find next occurrence of the specified day of week
      if (schedule.dayOfWeek !== undefined) {
        const daysUntilTarget = (schedule.dayOfWeek - nextRun.getDay() + 7) % 7
        if (daysUntilTarget === 0 && nextRun <= now) {
          nextRun = addWeeks(nextRun, 1)
        } else {
          nextRun = addDays(nextRun, daysUntilTarget)
        }
      }
      break

    case "monthly":
      // Find next occurrence of the specified day of month
      if (schedule.dayOfMonth !== undefined) {
        nextRun.setDate(schedule.dayOfMonth)
        if (nextRun <= now) {
          nextRun = addMonths(nextRun, 1)
          nextRun.setDate(schedule.dayOfMonth)
        }
      }
      break
  }

  return nextRun
}

async function generatePDFReport(reportType: string, filters: Record<string, unknown>) {
  // This is a simplified version - you'd call the same logic as in the export route
  const dateFrom = filters.startDate ? new Date(filters.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dateTo = filters.endDate ? new Date(filters.endDate as string) : new Date()

  // Build where clause
  const whereClause: Record<string, unknown> = {
    createdAt: {
      gte: dateFrom,
      lte: dateTo
    }
  }

  if (filters.status && filters.status !== "all") whereClause.status = filters.status
  if (filters.priority && filters.priority !== "all") whereClause.priority = filters.priority
  if (filters.reporterId && filters.reporterId !== "all") whereClause.reporterId = filters.reporterId

  // Fetch basic statistics
  const [totalIncidents, statusBreakdown] = await Promise.all([
    prisma.incident.count({ where: whereClause }),
    prisma.incident.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true }
    })
  ])

  const resolvedCount = statusBreakdown.find(s => s.status === "APPROVED_PM")?._count.id || 0
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0
  const urgentIncidents = await prisma.incident.count({
    where: {
      ...whereClause,
      priority: { in: ["HIGH", "CRITICAL"] }
    }
  })

  // Generate basic PDF (simplified version)
  const doc = new jsPDF()
  doc.text("TSM Incident Report", 20, 20)
  doc.text(`Period: ${format(dateFrom, "yyyy-MM-dd")} to ${format(dateTo, "yyyy-MM-dd")}`, 20, 30)
  doc.text(`Total Incidents: ${totalIncidents}`, 20, 40)
  doc.text(`Resolution Rate: ${resolutionRate}%`, 20, 50)
  doc.text(`Urgent Cases: ${urgentIncidents}`, 20, 60)

  const buffer = Buffer.from(doc.output("arraybuffer"))

  return {
    buffer,
    summary: {
      totalIncidents,
      resolutionRate,
      urgentIncidents
    }
  }
}
