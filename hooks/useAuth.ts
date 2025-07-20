"use client"

import { useSession } from "next-auth/react"
import { Role } from "@prisma/client"
import "@/types/auth"

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isLoading: status === "loading",
    role: session?.user?.role as Role | undefined,
  }
}

export function useRequireAuth() {
  const auth = useAuth()
  
  if (!auth.isAuthenticated && !auth.isLoading) {
    throw new Error("Authentication required")
  }
  
  return auth
}

export function useRequireRole(allowedRoles: Role[]) {
  const auth = useAuth()
  
  if (!auth.isAuthenticated && !auth.isLoading) {
    throw new Error("Authentication required")
  }
  
  if (auth.role && !allowedRoles.includes(auth.role)) {
    throw new Error("Insufficient permissions")
  }
  
  return auth
}
