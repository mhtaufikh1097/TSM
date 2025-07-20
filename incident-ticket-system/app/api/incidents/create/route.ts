import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { incidentFormSchema } from "@/lib/validations/incident"
import { notificationService } from "@/services/notifications"
import { notificationService as inAppNotificationService } from "@/services/notifications/notification-service"
import { generateSequentialTicketId } from "@/lib/ticket-id"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    // Extract form fields
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const location = formData.get("location") as string
    const occurredAt = formData.get("occurredAt") as string
    const priority = formData.get("priority") as string
    
    // Get uploaded files
    const files = formData.getAll("files") as File[]
    
    // Validate form data
    const validatedData = incidentFormSchema.parse({
      title,
      description,
      location,
      occurredAt,
      priority,
      files: files.filter(file => file.size > 0)
    })

    // Handle file uploads
    const uploadedFiles = []
    if (validatedData.files && validatedData.files.length > 0) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "incidents")
      await mkdir(uploadsDir, { recursive: true })

      for (const file of validatedData.files) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Generate unique filename
        const fileExtension = path.extname(file.name)
        const fileName = `${uuidv4()}${fileExtension}`
        const filePath = path.join(uploadsDir, fileName)
        
        // Save file
        await writeFile(filePath, buffer)
        
        uploadedFiles.push({
          originalName: file.name,
          filename: fileName,
          path: `/uploads/incidents/${fileName}`,
          size: file.size,
          mimeType: file.type
        })
      }
    }

    // Generate ticket ID
    const lastIncident = await prisma.incident.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true }
    })
    
    // Extract nomor urut dari ticketId terakhir
    const lastTicketNumber = lastIncident?.ticketId 
      ? parseInt(lastIncident.ticketId.split('-')[2]) || 0
      : 0
    
    const ticketId = generateSequentialTicketId(lastTicketNumber)

    // Create incident in database
    const incident = await prisma.incident.create({
      data: {
        ticketId,
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        occurredAt: new Date(validatedData.occurredAt),
        priority: validatedData.priority,
        status: "OPEN", // Start dengan status OPEN
        reporterId: session.user.id,
        attachments: {
          create: uploadedFiles.map(file => ({
            filename: file.filename,
            originalName: file.originalName,
            path: file.path,
            size: file.size,
            mimeType: file.mimeType
          }))
        }
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attachments: true
      }
    })

    // Send WhatsApp notification to QC users and create in-app notifications
    try {
      // WhatsApp notifications
      await notificationService.notifyIncidentSubmitted(incident.id)
      
      // In-app notifications
      await inAppNotificationService.createIncidentSubmittedNotifications(incident.id)
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // Don't fail the incident creation if notification fails
    }

    return NextResponse.json({
      success: true,
      incident
    })

  } catch (error) {
    console.error("Error creating incident:", error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
