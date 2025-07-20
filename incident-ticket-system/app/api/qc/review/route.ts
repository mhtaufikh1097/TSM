import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notificationService } from "@/services/notifications"
import { notificationService as inAppNotificationService } from "@/services/notifications/notification-service"

export async function POST(request: NextRequest) {
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

    const { incidentIds, action, comment } = await request.json()

    if (!incidentIds || !Array.isArray(incidentIds) || incidentIds.length === 0) {
      return NextResponse.json(
        { error: "Incident IDs are required" },
        { status: 400 }
      )
    }

    if (!["approve", "reject", "on_hold"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    if ((action === "reject" || action === "on_hold") && !comment?.trim()) {
      return NextResponse.json(
        { error: "Comment is required for rejection or on hold" },
        { status: 400 }
      )
    }

    // Process each incident
    const updatedIncidents = []
    
    for (const incidentId of incidentIds) {
      // Get incident details
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: true,
          pm: true
        }
      })

      if (!incident) {
        continue // Skip if incident not found
      }

      if (incident.status !== "OPEN" && incident.status !== "ON_HOLD") {
        continue // Skip if not open or on hold
      }

      // Update incident
      let newStatus: "QC_APPROVED" | "QC_REJECTED" | "ON_HOLD"
      if (action === "approve") {
        newStatus = "QC_APPROVED"
      } else if (action === "reject") {
        newStatus = "QC_REJECTED"
      } else {
        newStatus = "ON_HOLD"
      }
      
      const updatedIncident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: newStatus,
          qcId: session.user.id,
          qcAt: new Date(),
          qcComment: comment?.trim() || null
        },
        include: {
          reporter: true,
          qc: true,
          pm: true
        }
      })

      updatedIncidents.push(updatedIncident)

      // Send WhatsApp notifications and create in-app notifications
      try {
        if (action === "approve") {
          // Notify PM team for final approval
          await notificationService.notifyQCDecision(incidentId, true, session.user.id, comment?.trim())
        } else if (action === "reject") {
          // Notify reporter about rejection
          await notificationService.notifyQCDecision(incidentId, false, session.user.id, comment?.trim())
        } else if (action === "on_hold") {
          // Notify reporter about on hold status
          await notificationService.notifyQCOnHold(incidentId, session.user.id, comment?.trim())
        }
        
        // In-app notification
        if (action === "approve") {
          await inAppNotificationService.createQCReviewNotifications(incident.id, true, comment?.trim())
        } else if (action === "reject") {
          await inAppNotificationService.createQCReviewNotifications(incident.id, false, comment?.trim())
        } else if (action === "on_hold") {
          // Create custom notification for on hold
          await inAppNotificationService.createNotification({
            userId: incident.reporterId,
            type: 'incident_on_hold',
            title: 'Incident Ditangguhkan',
            message: `Incident "${incident.title}" ditangguhkan oleh QC: ${comment || 'Tidak ada catatan'}`,
            incidentId: incident.id
          })
        }
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError)
        // Don't fail the entire operation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedIncidents.length} incident(s) ${action}d successfully`,
      incidents: updatedIncidents
    })

  } catch (error) {
    console.error("Error processing QC review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
