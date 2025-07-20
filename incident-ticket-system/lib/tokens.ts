import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface IncidentTokenData {
  incidentId: string
  role: string
  userId: string
  iat?: number
  exp?: number
}

export function generateIncidentToken(incidentId: string, role: string, userId: string): string {
  const payload: IncidentTokenData = {
    incidentId,
    role,
    userId
  }
  
  // Token expires in 7 days
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyIncidentToken(token: string): IncidentTokenData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IncidentTokenData
    return decoded
  } catch (error) {
    return null
  }
}
