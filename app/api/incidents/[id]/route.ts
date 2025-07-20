import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { verifyIncidentToken } from "@/lib/tokens"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const role = searchParams.get('role') as 'qc' | 'pm' | null
    
    // Check if using token authentication (from WhatsApp link)
    let authenticatedUser = null
    let isTokenAuth = false
    
    if (token && role) {
      const tokenData = verifyIncidentToken(token)
      if (!tokenData || tokenData.incidentId !== id || tokenData.role !== role) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        )
      }
      isTokenAuth = true
      // For token auth, we'll fetch user from token data
      authenticatedUser = await prisma.user.findUnique({
        where: { id: tokenData.userId }
      })
    } else {
      // Check regular session authentication
      const session = await auth()
      
      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      authenticatedUser = session.user
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      )
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        qc: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        pm: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            path: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        logs: {
          include: {
            incident: {
              select: {
                title: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      )
    }

    // Check permissions
    if (!isTokenAuth && authenticatedUser.role === "REPORTER" && incident.reporterId !== authenticatedUser.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json({ incident })

  } catch (error) {
    console.error("Error fetching incident:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const role = searchParams.get('role') as 'qc' | 'pm' | null
    
    const body = await request.json()
    const { action, comment } = body
    
    // Validate action
    const validActions = ['approve', 'reject', 'hold']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', or 'hold'" },
        { status: 400 }
      )
    }
    
    // Check if using token authentication (from WhatsApp link)
    let authenticatedUser = null
    let isTokenAuth = false
    
    if (token && role) {
      const tokenData = verifyIncidentToken(token)
      if (!tokenData || tokenData.incidentId !== id || tokenData.role !== role) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        )
      }
      isTokenAuth = true
      // For token auth, we'll fetch user from token data
      authenticatedUser = await prisma.user.findUnique({
        where: { id: tokenData.userId }
      })
    } else {
      // Check regular session authentication
      const session = await auth()
      
      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      authenticatedUser = session.user
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      )
    }

    // Get current incident
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    })

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      )
    }

    // Check permissions and current status
    let newStatus: string = ''
    let oldStatus = incident.status
    
    if (authenticatedUser.role === 'QC') {
      // QC can only act on OPEN or PENDING_QC incidents
      if (!['OPEN', 'PENDING_QC'].includes(incident.status)) {
        return NextResponse.json(
          { error: "Incident is not in a state that QC can modify" },
          { status: 400 }
        )
      }
      
      switch (action) {
        case 'approve':
          newStatus = 'QC_APPROVED'
          break
        case 'reject':
          newStatus = 'QC_REJECTED'
          break
        case 'hold':
          newStatus = 'ON_HOLD'
          break
        default:
          return NextResponse.json(
            { error: "Invalid action for QC" },
            { status: 400 }
          )
      }
    } else if (authenticatedUser.role === 'PM') {
      // PM can only act on QC_APPROVED incidents
      if (incident.status !== 'QC_APPROVED') {
        return NextResponse.json(
          { error: "Incident must be QC approved before PM can act on it" },
          { status: 400 }
        )
      }
      
      switch (action) {
        case 'approve':
          newStatus = 'PM_APPROVED'
          break
        case 'reject':
          newStatus = 'PM_REJECTED'
          break
        case 'hold':
          newStatus = 'ON_HOLD'
          break
        default:
          return NextResponse.json(
            { error: "Invalid action for PM" },
            { status: 400 }
          )
      }
    } else {
      return NextResponse.json(
        { error: "Only QC and PM can perform actions on incidents" },
        { status: 403 }
      )
    }

    // Update incident
    const updateData: any = {
      status: newStatus,
    }

    if (authenticatedUser.role === 'QC') {
      updateData.qcId = authenticatedUser.id
      updateData.qcAt = new Date()
      if (comment) updateData.qcComment = comment
    } else if (authenticatedUser.role === 'PM') {
      updateData.pmId = authenticatedUser.id
      updateData.pmAt = new Date()
      if (comment) updateData.pmComment = comment
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { id: true, name: true, email: true, phone: true } },
        qc: { select: { id: true, name: true, email: true } },
        pm: { select: { id: true, name: true, email: true } }
      }
    })

    // Create incident log
    await prisma.incidentLog.create({
      data: {
        action: `${authenticatedUser.role}_${action.toUpperCase()}`,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
        comment: comment || null,
        userId: authenticatedUser.id,
        incidentId: id
      }
    })

    // Send notifications
    try {
      const { NotificationService } = await import('@/services/notifications')
      const notificationService = new NotificationService()

      if (authenticatedUser.role === 'QC') {
        switch (action) {
          case 'approve':
            await notificationService.notifyQCDecision(id, true, authenticatedUser.id, comment)
            break
          case 'reject':
            await notificationService.notifyQCDecision(id, false, authenticatedUser.id, comment)
            break
          case 'hold':
            await notificationService.notifyQCOnHold(id, authenticatedUser.id, comment)
            break
        }
      } else if (authenticatedUser.role === 'PM') {
        switch (action) {
          case 'approve':
            await notificationService.notifyPMDecision(id, true, authenticatedUser.id, comment)
            break
          case 'reject':
            await notificationService.notifyPMDecision(id, false, authenticatedUser.id, comment)
            break
          case 'hold':
            await notificationService.notifyPMOnHold(id, authenticatedUser.id, comment)
            break
        }
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
      success: true,
      incident: updatedIncident,
      message: `Incident ${action}ed successfully`
    })

  } catch (error) {
    console.error("Error updating incident:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
