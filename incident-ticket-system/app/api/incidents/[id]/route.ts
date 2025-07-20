import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { verifyIncidentToken } from "@/lib/tokens"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const role = searchParams.get('role')
    
    // Check if using token authentication (from WhatsApp link)
    let authenticatedUser = null
    let isTokenAuth = false
    
    if (token && role) {
      const tokenData = verifyIncidentToken(token)
      if (!tokenData || tokenData.incidentId !== params.id || tokenData.role !== role) {
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

    // Await params before using
    const { id } = await params

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
