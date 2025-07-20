"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ScheduledReportsManager from "./ScheduledReportsManager"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts"
import { 
  CalendarIcon,
  DownloadIcon,
  FilterIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  RefreshCwIcon,
  FileTextIcon,
  BarChart3Icon,
  MailIcon
} from "lucide-react"
import { format, subDays } from "date-fns"

interface KPIMetrics {
  totalIncidents: number
  resolutionRate: number
  avgResolutionTime: number
  urgentIncidents: number
  pendingQC: number
  pendingPM: number
}

interface ChartData {
  statusBreakdown: Array<{ status: string; count: number }>
  priorityBreakdown: Array<{ priority: string; count: number }>
  userBreakdown: Array<{ userId: string; userName: string; count: number; lastIncident: string }>
  dailyTrend: Array<{ date: string; incidents: number; resolved: number }>
}

interface ReportingFilters {
  startDate: string
  endDate: string
  status: string
  priority: string
  reporterId: string
}

const STATUS_COLORS = {
  "PENDING_QC": "#f59e0b",
  "APPROVED_QC": "#22c55e", 
  "REJECTED_QC": "#ef4444",
  "PENDING_PM": "#3b82f6",
  "APPROVED_PM": "#10b981",
  "REJECTED_PM": "#f87171"
}

const PRIORITY_COLORS = {
  "LOW": "#6b7280",
  "MEDIUM": "#f59e0b", 
  "HIGH": "#f97316",
  "CRITICAL": "#ef4444"
}

export default function ReportingDashboard() {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics>({
    totalIncidents: 0,
    resolutionRate: 0,
    avgResolutionTime: 0,
    urgentIncidents: 0,
    pendingQC: 0,
    pendingPM: 0
  })

  const [chartData, setChartData] = useState<ChartData>({
    statusBreakdown: [],
    priorityBreakdown: [],
    userBreakdown: [],
    dailyTrend: []
  })

  const [filters, setFilters] = useState<ReportingFilters>({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    status: "all",
    priority: "all",
    reporterId: "all"
  })

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedIncident, setSelectedIncident] = useState<unknown>(null)

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value)
      })

      const response = await fetch(`/api/reports/analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        setKpiMetrics(data.kpiMetrics)
        setChartData(data.charts)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch users for filter
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    fetchUsers()
  }, [filters])

  // Export PDF Report
  const exportPDF = async (reportType: string) => {
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          ...filters,
          includeCharts: true
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `incident-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`
        link.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert("Failed to generate PDF report")
      }
    } catch (error) {
      console.error("Error exporting PDF:", error)
      alert("Error generating PDF report")
    }
  }

  // Quick date range presets
  const setDateRange = (days: number) => {
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd")
    }))
  }

  const formatStatusName = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCwIcon className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">Comprehensive incident analysis and insights</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto bg-gray-100">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Export Reports
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <MailIcon className="h-4 w-4" />
            Scheduled Reports
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchAnalytics}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilterIcon className="h-5 w-5" />
                Filters & Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING_QC">Pending QC</SelectItem>
                      <SelectItem value="APPROVED_QC">Approved QC</SelectItem>
                      <SelectItem value="REJECTED_QC">Rejected QC</SelectItem>
                      <SelectItem value="PENDING_PM">Pending PM</SelectItem>
                      <SelectItem value="APPROVED_PM">Approved PM</SelectItem>
                      <SelectItem value="REJECTED_PM">Rejected PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Reporter</label>
                  <Select value={filters.reporterId} onValueChange={(value) => setFilters(prev => ({ ...prev, reporterId: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setDateRange(7)}>7D</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange(30)}>30D</Button>
                    <Button variant="outline" size="sm" onClick={() => setDateRange(90)}>90D</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Incidents</p>
                    <p className="text-2xl font-bold">{kpiMetrics.totalIncidents}</p>
                  </div>
                  <BarChart3Icon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Resolution Rate</p>
                    <p className="text-2xl font-bold text-green-600">{kpiMetrics.resolutionRate}%</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Resolution</p>
                    <p className="text-2xl font-bold text-blue-600">{kpiMetrics.avgResolutionTime}h</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Urgent Cases</p>
                    <p className="text-2xl font-bold text-red-600">{kpiMetrics.urgentIncidents}</p>
                  </div>
                  <AlertTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending QC</p>
                    <p className="text-2xl font-bold text-yellow-600">{kpiMetrics.pendingQC}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending PM</p>
                    <p className="text-2xl font-bold text-orange-600">{kpiMetrics.pendingPM}</p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={(entry) => `${formatStatusName(entry.status)}: ${entry.count}`}
                    >
                      {chartData.statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.priorityBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {chartData.priorityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || "#8884d8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-6">
            {/* Daily Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Incident Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                      formatter={(value, name) => [value, name === "incidents" ? "New Incidents" : "Resolved"]}
                    />
                    <Area type="monotone" dataKey="incidents" stackId="1" stroke="#3b82f6" fill="#93c5fd" />
                    <Area type="monotone" dataKey="resolved" stackId="2" stroke="#10b981" fill="#6ee7b7" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle>Top Reporters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.userBreakdown.slice(0, 10).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.userName}</p>
                        <p className="text-sm text-gray-600">
                          Last incident: {format(new Date(user.lastIncident), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{user.count} incidents</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Reports Tab */}
        <TabsContent value="exports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={() => exportPDF("summary")} className="flex-1">
                    <FileTextIcon className="h-4 w-4 mr-2" />
                    Export Summary PDF
                  </Button>
                  <Button onClick={() => exportPDF("detailed")} variant="outline" className="flex-1">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export Detailed PDF
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Export reports with current filter settings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Build custom reports with specific parameters and formatting options.
                </p>
                <Button variant="outline" disabled>
                  <BarChart3Icon className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="schedule">
          <ScheduledReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
