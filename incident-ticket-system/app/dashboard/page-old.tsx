"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar from "@/components/layouts/Sidebar"
import RoleGuard from "@/components/auth/RoleGuard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Users,
  BarChart3,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }

  // Mock data - replace with real data from API
  const stats = {
    totalTickets: 45,
    pendingQC: 12,
    pendingPM: 8,
    resolved: 25,
    critical: 3,
    thisMonth: 15
  }

  return (
    <Sidebar>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {getGreeting()}, {session.user.name}! 👋
              </h1>
              <p className="mt-1 text-gray-600">
                Here's what's happening with your incidents today.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <RoleGuard allowedRoles={["REPORTER", "ADMIN"]}>
                <Link href="/incidents/create">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Report Incident
                  </Button>
                </Link>
              </RoleGuard>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Tickets */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Tickets</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalTickets}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+{stats.thisMonth}</span>
                <span className="text-gray-500 ml-1">this month</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending QC */}
          <RoleGuard allowedRoles={["QC", "ADMIN"]}>
            <Card className="border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-yellow-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pending QC</p>
                    <p className="text-3xl font-bold text-yellow-900">{stats.pendingQC}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Requires your review
                </p>
              </CardContent>
            </Card>
          </RoleGuard>

          {/* Pending PM */}
          <RoleGuard allowedRoles={["PM", "ADMIN"]}>
            <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Pending PM</p>
                    <p className="text-3xl font-bold text-orange-900">{stats.pendingPM}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Awaiting final approval
                </p>
              </CardContent>
            </Card>
          </RoleGuard>

          {/* Resolved */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Resolved</p>
                  <p className="text-3xl font-bold text-green-900">{stats.resolved}</p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RoleGuard allowedRoles={["REPORTER", "ADMIN"]}>
                  <Link href="/incidents/create">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Incident
                    </Button>
                  </Link>
                </RoleGuard>
                
                <RoleGuard allowedRoles={["QC", "ADMIN"]}>
                  <Link href="/incidents/qc-review">
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="w-4 h-4 mr-2" />
                      Review Pending QC
                    </Button>
                  </Link>
                </RoleGuard>

                <RoleGuard allowedRoles={["PM", "ADMIN"]}>
                  <Link href="/incidents/pm-approval">
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      PM Approvals
                    </Button>
                  </Link>
                </RoleGuard>

                <RoleGuard allowedRoles={["ADMIN", "PM"]}>
                  <Link href="/reports">
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Reports
                    </Button>
                  </Link>
                </RoleGuard>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mock recent activities */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        New incident reported: "Equipment malfunction in Zone A"
                      </p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Incident #INC-001 approved by PM
                      </p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        QC review completed for incident #INC-002
                      </p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Critical Alerts */}
        {stats.critical > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900">
                    Critical Incidents Require Attention
                  </h3>
                  <p className="text-red-700">
                    {stats.critical} critical incident{stats.critical > 1 ? 's' : ''} need immediate action.
                  </p>
                </div>
                <Link href="/incidents?priority=CRITICAL">
                  <Button variant="destructive">
                    View Critical
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Sidebar>
  )
}
