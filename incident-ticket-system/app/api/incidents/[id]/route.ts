import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
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
    if (session.user.role === "REPORTER" && incident.reporterId !== session.user.id) {
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
