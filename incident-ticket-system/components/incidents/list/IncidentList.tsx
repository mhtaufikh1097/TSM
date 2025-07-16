"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  MapPin,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Incident {
  id: string
  title: string
  description: string
  location: string
  occurredAt: string
  status: string
  priority: string
  createdAt: string
  reporter: {
    id: string
    name: string
    email: string
  }
  qc?: {
    id: string
    name: string
    email: string
  }
  pm?: {
    id: string
    name: string
    email: string
  }
  _count: {
    attachments: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const STATUS_CONFIG = {
  PENDING_QC: { label: "Pending QC", color: "bg-yellow-100 text-yellow-800" },
  APPROVED_QC: { label: "QC Approved", color: "bg-blue-100 text-blue-800" },
  REJECTED_QC: { label: "QC Rejected", color: "bg-red-100 text-red-800" },
  PENDING_PM: { label: "Pending PM", color: "bg-orange-100 text-orange-800" },
  APPROVED_PM: { label: "PM Approved", color: "bg-green-100 text-green-800" },
  REJECTED_PM: { label: "PM Rejected", color: "bg-red-100 text-red-800" },
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-800" },
  MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-800" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-800" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-800" },
}

export default function IncidentList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Filter states
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [priority, setPriority] = useState(searchParams.get("priority") || "")
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "")
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "")
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"))

  const fetchIncidents = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })

      const response = await fetch(`/api/incidents?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch incidents")
      }

      setIncidents(data.incidents)
      setPagination(data.pagination)

    } catch (error) {
      console.error("Error fetching incidents:", error)
      setError(error instanceof Error ? error.message : "Failed to load incidents")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [currentPage, search, status, priority, startDate, endDate])

  const updateURL = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    if (priority) params.set("priority", priority)
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    if (currentPage > 1) params.set("page", currentPage.toString())

    const newURL = params.toString() ? `?${params.toString()}` : ""
    window.history.replaceState({}, "", `/incidents${newURL}`)
  }

  useEffect(() => {
    updateURL()
  }, [search, status, priority, startDate, endDate, currentPage])

  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setPriority("")
    setStartDate("")
    setEndDate("")
    setCurrentPage(1)
  }

  const viewIncident = (id: string) => {
    router.push(`/incidents/${id}`)
  }

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading incidents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Incident Reports
          </h1>
          <p className="mt-1 text-gray-600">
            Manage and track all incident reports
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            onClick={() => fetchIncidents()}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/incidents/create")}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <div className="text-sm text-gray-600">
              {pagination.total} incident{pagination.total !== 1 ? "s" : ""} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incidents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">
                          {incident.title}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {incident.location}
                        </div>
                        {incident._count.attachments > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            📎 {incident._count.attachments} attachment{incident._count.attachments !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={STATUS_CONFIG[incident.status as keyof typeof STATUS_CONFIG].color}>
                        {STATUS_CONFIG[incident.status as keyof typeof STATUS_CONFIG].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG].color}>
                        {PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {incident.reporter.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {incident.reporter.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(incident.occurredAt), "MMM dd, yyyy")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(incident.createdAt), "hh:mm a")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewIncident(incident.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {incidents.length === 0 && !loading && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
              <p className="text-gray-600 mb-4">
                {search || status || priority || startDate || endDate
                  ? "Try adjusting your search criteria or filters."
                  : "No incidents have been reported yet."}
              </p>
              <Button onClick={() => router.push("/incidents/create")}>
                Report First Incident
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={page === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
