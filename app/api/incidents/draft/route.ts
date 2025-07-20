import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { incidentDraftSchema } from "@/lib/validations/incident"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = incidentDraftSchema.parse(body)

    // Store draft in localStorage on client side
    // This endpoint validates the draft structure
    return NextResponse.json({
      success: true,
      message: "Draft validated successfully"
    })

  } catch (error) {
    console.error("Error validating draft:", error)
    
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
