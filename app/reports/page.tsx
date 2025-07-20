"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import ReportingDashboard from "@/components/reports/ReportingDashboard"

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/login")
      return
    }

    // Check if user has permission to access reports (ADMIN or PM only)
    if (session.user.role !== "ADMIN" && session.user.role !== "PM") {
      router.push("/dashboard")
      return
    }

    setLoading(false)
  }, [session, status, router])

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "PM")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive reporting dashboard with incident analytics, export capabilities, and automated scheduling.
          </p>
        </div>
        
        <ReportingDashboard />
      </div>
    </DashboardLayout>
  )
}
