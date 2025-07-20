"use client"

import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import "@/types/auth"

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session?.user) {
    return fallback
  }

  const userRole = session.user.role as Role
  
  if (!allowedRoles.includes(userRole)) {
    return fallback
  }

  return <>{children}</>
}

// Hook untuk mengecek role user
export function useRole() {
  const { data: session } = useSession()
  return session?.user?.role as Role | undefined
}

// Hook untuk mengecek apakah user punya role tertentu
export function useHasRole(roles: Role | Role[]) {
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role
  
  if (Array.isArray(roles)) {
    return roles.includes(userRole)
  }
  
  return userRole === roles
}
