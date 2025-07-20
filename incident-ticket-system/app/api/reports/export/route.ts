import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { id } from "date-fns/locale"

// Type for jsPDF with autoTable plugin
interface PDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      reportType, 
      startDate, 
      endDate, 
      status, 
      priority, 
      reporterId,
      includeCharts = false,
      template = "standard"
    } = await request.json()

    // Validate required fields
    if (!reportType) {
      return NextResponse.json(
        { error: "Report type is required" },
        { status: 400 }
      )
    }

    // Default date range (last 30 days)
    const defaultEndDate = new Date()
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const dateFrom = startDate ? new Date(startDate) : defaultStartDate
    const dateTo = endDate ? new Date(endDate) : defaultEndDate

    // Build where clause
    const whereClause: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    }

    if (status && status !== "all") whereClause.status = status
    if (priority && priority !== "all") whereClause.priority = priority
    if (reporterId && reporterId !== "all") whereClause.reporterId = reporterId

    // Initialize PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    let yPosition = 20

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        doc.addPage()
        yPosition = 20
        return true
      }
      return false
    }

    // Company Header
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("WIKA - TSM Incident Report", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated on: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`, pageWidth / 2, yPosition, { align: "center" })
    yPosition += 10

    doc.text(`Period: ${format(dateFrom, "dd MMM yyyy")} - ${format(dateTo, "dd MMM yyyy")}`, pageWidth / 2, yPosition, { align: "center" })
    yPosition += 20

    // Report filters
    doc.setFontSize(10)
    doc.setFont("helvetica", "italic")
    let filterText = "Filters Applied: "
    const filters = []
    if (status && status !== "all") filters.push(`Status: ${status}`)
    if (priority && priority !== "all") filters.push(`Priority: ${priority}`)
    if (reporterId && reporterId !== "all") {
      const user = await prisma.user.findUnique({
        where: { id: reporterId },
        select: { name: true }
      })
      filters.push(`Reporter: ${user?.name || "Unknown"}`)
    }
    
    if (filters.length > 0) {
      filterText += filters.join(", ")
    } else {
      filterText += "None"
    }
    
    doc.text(filterText, 20, yPosition)
    yPosition += 20

    if (reportType === "summary" || reportType === "detailed") {
      // Fetch statistics
      const [
        totalIncidents,
        statusBreakdown,
        priorityBreakdown,
        incidents
      ] = await Promise.all([
        prisma.incident.count({ where: whereClause }),
        prisma.incident.groupBy({
          by: ["status"],
          where: whereClause,
          _count: { id: true }
        }),
        prisma.incident.groupBy({
          by: ["priority"],
          where: whereClause,
          _count: { id: true }
        }),
        reportType === "detailed" ? prisma.incident.findMany({
          where: whereClause,
          include: {
            reporter: { select: { name: true, email: true } },
            qc: { select: { name: true } },
            pm: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }) : null
      ])

      // Summary Statistics
      checkPageBreak(40)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Executive Summary", 20, yPosition)
      yPosition += 15

      // KPI Table
      const kpiData = [
        ["Metric", "Value"],
        ["Total Incidents", totalIncidents.toString()],
        ["Resolved", (statusBreakdown.find(s => s.status === "APPROVED_PM")?._count.id || 0).toString()],
        ["Pending QC", (statusBreakdown.find(s => s.status === "PENDING_QC")?._count.id || 0).toString()],
        ["Pending PM", (statusBreakdown.find(s => s.status === "PENDING_PM")?._count.id || 0).toString()],
        ["High Priority", (priorityBreakdown.find(p => p.priority === "HIGH")?._count.id || 0).toString()],
        ["Critical Priority", (priorityBreakdown.find(p => p.priority === "CRITICAL")?._count.id || 0).toString()]
      ]

      autoTable(doc, {
        head: [kpiData[0]],
        body: kpiData.slice(1),
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      })

      yPosition = (doc as PDFWithAutoTable).lastAutoTable.finalY + 20

      // Status Breakdown
      checkPageBreak(30)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Status Breakdown", 20, yPosition)
      yPosition += 10

      const statusData = [
        ["Status", "Count", "Percentage"]
      ]
      
      statusBreakdown.forEach(item => {
        const percentage = totalIncidents > 0 ? ((item._count.id / totalIncidents) * 100).toFixed(1) : "0"
        statusData.push([
          item.status.replace(/_/g, " "),
          item._count.id.toString(),
          `${percentage}%`
        ])
      })

      autoTable(doc, {
        head: [statusData[0]],
        body: statusData.slice(1),
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 9 }
      })

      yPosition = (doc as PDFWithAutoTable).lastAutoTable.finalY + 20

      // Priority Breakdown
      checkPageBreak(30)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Priority Breakdown", 20, yPosition)
      yPosition += 10

      const priorityData = [
        ["Priority", "Count", "Percentage"]
      ]
      
      priorityBreakdown.forEach(item => {
        const percentage = totalIncidents > 0 ? ((item._count.id / totalIncidents) * 100).toFixed(1) : "0"
        priorityData.push([
          item.priority,
          item._count.id.toString(),
          `${percentage}%`
        ])
      })

      autoTable(doc, {
        head: [priorityData[0]],
        body: priorityData.slice(1),
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60] },
        styles: { fontSize: 9 }
      })

      yPosition = (doc as PDFWithAutoTable).lastAutoTable.finalY + 20

      // Detailed incidents table
      if (reportType === "detailed" && incidents) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Incident Details", 20, yPosition)
        yPosition += 10

        const incidentData = [
          ["ID", "Title", "Status", "Priority", "Reporter", "Created"]
        ]

        incidents.forEach(incident => {
          incidentData.push([
            incident.id.substring(0, 8),
            incident.title.substring(0, 30) + (incident.title.length > 30 ? "..." : ""),
            incident.status.replace(/_/g, " "),
            incident.priority,
            incident.reporter.name,
            format(incident.createdAt, "dd/MM/yy")
          ])
        })

        autoTable(doc, {
          head: [incidentData[0]],
          body: incidentData.slice(1),
          startY: yPosition,
          theme: "grid",
          headStyles: { fillColor: [46, 125, 50] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 60 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 20 }
          }
        })
      }
    }

    // Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(
        `Page ${i} of ${totalPages} | Generated by TSM Incident System | ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    // Set response headers
    const fileName = `incident-report-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`
    
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error("Error generating PDF report:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    )
  }
}
