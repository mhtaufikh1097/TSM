import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Authentication check - only authenticated users can access files
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login to access files" },
        { status: 401 }
      )
    }

    // Find attachment in database to verify it exists and get metadata
    const attachment = await prisma.attachment.findFirst({
      where: { filename },
      include: {
        incident: {
          select: {
            id: true,
            reporterId: true,
            status: true
          }
        }
      }
    })

    if (!attachment) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Check if user has permission to access this file
    const user = session.user
    const incident = attachment.incident

    // Allow access if:
    // 1. User is ADMIN
    // 2. User is the reporter of the incident
    // 3. User is QC or PM (can view all incidents)
    const hasAccess = 
      user.role === 'ADMIN' ||
      user.id === incident.reporterId ||
      ['QC', 'PM'].includes(user.role)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Try to serve from storage API first
    if (attachment.path?.includes('/storage-api/')) {
      try {
        // Proxy request to storage API (botlinko server)
        const storageApiUrl = process.env.STORAGE_API_URL || 'https://botlinko.biz.id'
        const fileUrl = `${storageApiUrl}/storage-api/uploads/${filename}`
        
        console.log(`🔄 Fetching file from: ${fileUrl}`)
        
        const response = await fetch(fileUrl, {
          headers: {
            'X-API-Key': process.env.STORAGE_API_KEY || process.env.NEXTAUTH_SECRET || 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M='
          }
        })
        
        if (response.ok) {
          const fileBuffer = await response.arrayBuffer()
          
          console.log(`✅ File served successfully: ${filename} (${fileBuffer.byteLength} bytes)`)
          
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': attachment.mimeType || 'application/octet-stream',
              'Content-Disposition': `inline; filename="${attachment.originalName}"`,
              'Cache-Control': 'public, max-age=31536000',
            }
          })
        } else {
          console.error(`❌ Storage API returned ${response.status}: ${response.statusText}`)
        }
      } catch (storageError) {
        console.error('❌ Storage API file access failed:', storageError)
      }
    }

    // Fallback: try to serve from local uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const filePath = path.join(uploadsDir, filename)

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: "File not found on disk" },
          { status: 404 }
        )
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath)

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.originalName}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        }
      })

    } catch (fileError) {
      console.error('❌ Local file access failed:', fileError)
      return NextResponse.json(
        { error: "Failed to read file" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("❌ Error serving file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
