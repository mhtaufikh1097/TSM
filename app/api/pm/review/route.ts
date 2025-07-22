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

    // Check if user has PM or ADMIN role
    if (!["PM", "ADMIN"].includes(session.user.role)) {
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
          qc: true
        }
      })

      if (!incident) {
        continue // Skip if incident not found
      }

      if (incident.status !== "QC_APPROVED") {
        continue // Skip if not QC approved
      }

      // Update incident
      let newStatus: "PM_APPROVED" | "PM_REJECTED" | "ON_HOLD"
      if (action === "approve") {
        newStatus = "PM_APPROVED"
      } else if (action === "reject") {
        newStatus = "PM_REJECTED"
      } else {
        newStatus = "ON_HOLD"
      }
      
      const updatedIncident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: newStatus,
          pmId: session.user.id,
          pmAt: new Date(),
          pmComment: comment?.trim() || null
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
          await notificationService.notifyPMDecision(incidentId, true, session.user.id, comment?.trim())
        } else if (action === "reject") {
          await notificationService.notifyPMDecision(incidentId, false, session.user.id, comment?.trim())
        } else if (action === "on_hold") {
          await notificationService.notifyPMOnHold(incidentId, session.user.id, comment?.trim())
        }
        
        // In-app notification
        if (action === "approve") {
          await inAppNotificationService.createPMReviewNotifications(incident.id, true, comment?.trim())
        } else if (action === "reject") {
          await inAppNotificationService.createPMReviewNotifications(incident.id, false, comment?.trim())
        } else if (action === "on_hold") {
          // Create custom notification for PM on hold
          await inAppNotificationService.createNotification({
            userId: incident.reporterId,
            type: 'incident_on_hold',
            title: 'Inspeksi ditangguhkan PM',
            message: `Incident "${incident.title}" ditangguhkan oleh PM: ${comment || 'Tidak ada catatan'}`,
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
    console.error("Error processing PM review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
