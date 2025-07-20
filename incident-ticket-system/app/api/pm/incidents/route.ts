import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
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

    // Get incidents pending PM approval
    const incidents = await prisma.incident.findMany({
      where: {
        status: "PENDING_PM"
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        qc: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    })

    return NextResponse.json({
      incidents: incidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        location: incident.location,
        occurredAt: incident.occurredAt.toISOString(),
        createdAt: incident.createdAt.toISOString(),
        reporter: incident.reporter,
        qc: incident.qc,
        qcAt: incident.qcAt?.toISOString() || null,
        qcComment: incident.qcComment
      }))
    })

  } catch (error) {
    console.error("Error fetching PM incidents:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
