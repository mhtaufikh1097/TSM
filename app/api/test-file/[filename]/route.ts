import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    console.log('📁 Test file access request:', { filename })

    // Find attachment in database to verify it exists and get metadata
    const attachment = await prisma.incidentAttachment.findFirst({
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
        { error: "File not found in database" },
        { status: 404 }
      )
    }

    console.log('✅ File found in database:', { 
      originalName: attachment.originalName, 
      path: attachment.path,
      mimeType: attachment.mimeType 
    })

    // Try to serve from storage API first - multiple URL attempts
    const storageUrls = [
      `https://botlinko.biz.id/api/files/${filename}`, // New endpoint (after re-deploy)
      `https://botlinko.biz.id/uploads/${filename}`,   // Direct file access
      `https://botlinko.biz.id/storage-api/uploads/${filename}`, // Subdirectory
      `https://botlinko.biz.id/whatsapp-storage-api/uploads/${filename}` // Alternative path
    ]
    
    console.log('🔍 Attempting to fetch file from storage API:', filename)
    
    for (const fileUrl of storageUrls) {
      try {
        console.log(`🔄 Trying URL: ${fileUrl}`)
        
        const response = await fetch(fileUrl, {
          headers: {
            'X-API-Key': process.env.STORAGE_API_KEY || process.env.NEXTAUTH_SECRET || 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M=',
            'Authorization': `Bearer ${process.env.STORAGE_API_KEY || process.env.NEXTAUTH_SECRET || 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M='}`,
            'User-Agent': 'TSM-FileServer/1.0'
          }
        })
        
        console.log(`📊 Response: ${response.status} for ${fileUrl}`)
        
        if (response.ok) {
          const fileBuffer = await response.arrayBuffer()
          
          console.log(`✅ File served successfully from: ${fileUrl} (${fileBuffer.byteLength} bytes)`)
          
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': attachment.mimeType || 'application/octet-stream',
              'Content-Disposition': `inline; filename="${attachment.originalName}"`,
              'Cache-Control': 'public, max-age=31536000',
            }
          })
        }
      } catch (error: any) {
        console.log(`⚠️ Failed to fetch from ${fileUrl}:`, error.message)
        continue // Try next URL
      }
    }
    
    console.log('❌ All storage API URLs failed, trying local fallback')

    // Fallback: try to serve from local uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const filePath = path.join(uploadsDir, filename)

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: "File not found on disk", searchedPath: filePath },
          { status: 404 }
        )
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath)

      console.log(`✅ File served from local: ${filePath} (${fileBuffer.length} bytes)`)

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.originalName}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        }
      })

    } catch (fileError: any) {
      console.error('❌ Local file access failed:', fileError)
      return NextResponse.json(
        { error: "Failed to read file", details: fileError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error("❌ Error serving test file:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
