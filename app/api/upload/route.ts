import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { storageApiService } from "@/services/storage-api"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    // Validate file type (optional)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload file to storage API
    const uploadResult = await storageApiService.uploadFile(buffer, file.name, file.type)
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename: uploadResult.file?.filename,
      originalName: uploadResult.file?.originalName,
      url: `/storage-api/uploads/${uploadResult.file?.filename}`, // Virtual path for storage API
      size: uploadResult.file?.size,
      type: uploadResult.file?.mimetype,
      uploadedAt: uploadResult.file?.uploadDate,
      storageApiFile: true
    })

  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    // Note: Storage API doesn't provide pagination for file listing
    // This endpoint now returns a message indicating files are stored externally
    return NextResponse.json({
      message: "Files are now stored via Storage API",
      info: "File management is handled by the external storage service",
      pagination: { page, limit, total: 0, pages: 0 },
      files: [],
      note: "To manage files, access the storage API directly or use the WhatsApp sessions endpoint"
    })

  } catch (error: any) {
    console.error("Get files error:", error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}
