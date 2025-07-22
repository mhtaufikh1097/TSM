import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Profile API - Starting GET request')
    
    const session = await auth()
    
    console.log('Profile GET request - Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || 'undefined',
      userEmail: session?.user?.email || 'undefined',
      userRole: session?.user?.role || 'undefined'
    })
    
    if (!session?.user) {
      console.log('Profile GET - No session or user, returning 401')
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log('Profile GET - Looking for user ID:', session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('Profile GET - Database query result:', {
      userFound: !!user,
      userEmail: user?.email || 'N/A'
    })

    if (!user) {
      console.log('Profile GET - User not found for ID:', session.user.id)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    console.log('Profile GET - Success, returning user data for:', user.email)
    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { name, phone } = await request.json()

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Format phone number if provided
    let formattedPhone = null
    if (phone && phone.trim()) {
      let cleanPhone = phone.replace(/\D/g, '') // Remove non-numeric characters
      
      // Handle different Indonesian phone number formats
      if (cleanPhone.startsWith('0')) {
        // Replace leading 0 with 62
        cleanPhone = '62' + cleanPhone.substring(1)
      } else if (cleanPhone.startsWith('8')) {
        // Add 62 for numbers starting with 8
        cleanPhone = '62' + cleanPhone
      } else if (!cleanPhone.startsWith('62')) {
        // Add 62 if no country code
        cleanPhone = '62' + cleanPhone
      }
      
      // Validate Indonesian phone number format
      if (!/^62[8][0-9]{8,12}$/.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Invalid Indonesian phone number format" },
          { status: 400 }
        )
      }
      
      formattedPhone = cleanPhone
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        phone: formattedPhone
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    })

  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
