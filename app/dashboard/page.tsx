"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import RoleGuard from "@/components/auth/RoleGuard"
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  BarChart3,
  Users,
  Activity,
  Eye,
  TrendingDown
} from "lucide-react"
import { format } from "date-fns"

interface DashboardStats {
  totalInspections: number
  pendingQC: number
  pendingPM: number
  resolved: number
  myReports?: number
  monthlyGrowth: number
  recentInspections: {
    id: string
    title: string
    ticketId: string
    status: string
    priority: string
    createdAt: string
    reporter: {
      name: string
    }
  }[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchDashboardStats()
    }
  }, [session])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Selamat Pagi"
    if (hour < 17) return "Selamat Siang"
    return "Selamat Sore"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800'
      case 'QC_APPROVED':
        return 'bg-green-100 text-green-800'
      case 'QC_REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PM_APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PM_REJECTED':
        return 'bg-red-100 text-red-800'
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header with WIKA Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/Logo-WIKA.png"
                alt="WIKA Logo"
                width={60}
                height={60}
                className="object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {getGreeting()}, {session.user.name}! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  PT WIJAYA KARYA (Persero) Tbk - Inspection Management System
                </p>
              </div>
            </div>
          </div>
          
          <RoleGuard allowedRoles={["REPORTER", "ADMIN"]}>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push("/incidents/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Inspection
            </Button>
          </RoleGuard>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Inspections */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Inspections
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats?.totalInspections || 0}</div>
                <p className={`text-xs flex items-center mt-1 ${
                  (stats?.monthlyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(stats?.monthlyGrowth || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {(stats?.monthlyGrowth || 0) > 0 ? '+' : ''}{stats?.monthlyGrowth || 0} this month
                </p>
              </CardContent>
            </Card>

            {/* QC Review */}
            <RoleGuard allowedRoles={["QC", "ADMIN"]}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending QC
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.pendingQC || 0}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Requires your review
                  </p>
                </CardContent>
              </Card>
            </RoleGuard>

            {/* PM Approval */}
            <RoleGuard allowedRoles={["PM", "ADMIN"]}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending PM
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.pendingPM || 0}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Awaiting final approval
                  </p>
                </CardContent>
              </Card>
            </RoleGuard>

            {/* Resolved or My Reports */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {session.user.role === 'REPORTER' ? 'My Reports' : 'Resolved'}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {session.user.role === 'REPORTER' ? (stats?.myReports || 0) : (stats?.resolved || 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {session.user.role === 'REPORTER' ? 'Total reports submitted' : 'Successfully completed'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoleGuard allowedRoles={["REPORTER", "ADMIN"]}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/incidents/create")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Incident
                </Button>
              </RoleGuard>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push("/incidents")}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                View All Incidents
              </Button>

              <RoleGuard allowedRoles={["ADMIN", "PM"]}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/analytics")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </RoleGuard>

              <RoleGuard allowedRoles={["ADMIN"]}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/users")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </RoleGuard>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Inspections</CardTitle>
              <p className="text-sm text-gray-600">Latest inspection reports and activities</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-gray-300 rounded"></div>
                        <div className="h-3 w-24 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentInspections && stats.recentInspections.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentInspections.slice(0, 3).map((inspection) => (
                    <div key={inspection.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        inspection.status === 'RESOLVED' ? 'bg-green-500' :
                        inspection.status === 'QC_REVIEW' ? 'bg-yellow-500' :
                        inspection.status === 'PM_APPROVAL' ? 'bg-orange-500' :
                        inspection.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                        'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{inspection.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-gray-500">
                            ID: {inspection.ticketId}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            {new Date(inspection.createdAt).toLocaleDateString('id-ID')}
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            by {inspection.reporter.name}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(inspection.status)
                      }`}>
                        {inspection.status}
                      </span>
                    </div>
                  ))}

                  <div className="text-center pt-4">
                    <Link href="/incidents">
                      <Button variant="outline" size="sm">
                        View All Inspections
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent inspections found</p>
                  <div className="mt-4">
                    <Link href="/incidents/create">
                      <Button variant="outline" size="sm">
                        Create New Inspection
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
