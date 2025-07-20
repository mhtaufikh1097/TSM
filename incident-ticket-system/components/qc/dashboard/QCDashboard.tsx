"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Eye,
  User,
  MapPin,
  Calendar
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Incident {
  id: string
  title: string
  description: string
  location: string
  occurredAt: string
  priority: string
  status: string
  createdAt: string
  reporter: {
    id: string
    name: string
    email: string
  }
  _count: {
    attachments: number
  }
}

interface QCStats {
  pending: number
  approved: number
  rejected: number
  totalThisMonth: number
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-800", dotColor: "bg-gray-500" },
  MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-800", dotColor: "bg-orange-500" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
}

export default function QCDashboard() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<QCStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalThisMonth: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([])
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchIncidents = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        status: "PENDING_QC",
        ...(search && { search }),
        ...(priorityFilter && priorityFilter !== "all" && { priority: priorityFilter }),
      })

      const response = await fetch(`/api/incidents?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch incidents")
      }

      setIncidents(data.incidents)
    } catch (error) {
      console.error("Error fetching incidents:", error)
      setError(error instanceof Error ? error.message : "Failed to load incidents")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/qc/stats")
      const data = await response.json()

      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  useEffect(() => {
    fetchIncidents()
    fetchStats()

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchIncidents()
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [search, priorityFilter])

  const handleQuickAction = (incident: Incident, action: "approve" | "reject") => {
    setCurrentIncident(incident)
    setApprovalAction(action)
    setShowApprovalModal(true)
    setComment("")
  }

  const handleBulkAction = (action: "approve" | "reject") => {
    if (selectedIncidents.length === 0) return
    
    setApprovalAction(action)
    setShowApprovalModal(true)
    setComment("")
  }

  const submitApproval = async () => {
    if (!currentIncident && selectedIncidents.length === 0) return

    setSubmitting(true)
    try {
      const incidentIds = currentIncident ? [currentIncident.id] : selectedIncidents

      const response = await fetch("/api/qc/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incidentIds,
          action: approvalAction,
          comment: comment.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review")
      }

      // Refresh data
      fetchIncidents()
      fetchStats()
      
      // Reset state
      setShowApprovalModal(false)
      setCurrentIncident(null)
      setSelectedIncidents([])
      setComment("")

    } catch (error) {
      console.error("Error submitting review:", error)
      setError(error instanceof Error ? error.message : "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleIncidentSelection = (incidentId: string) => {
    setSelectedIncidents(prev => 
      prev.includes(incidentId) 
        ? prev.filter(id => id !== incidentId)
        : [...prev, incidentId]
    )
  }

  const selectAllIncidents = () => {
    setSelectedIncidents(incidents.map(incident => incident.id))
  }

  const clearSelection = () => {
    setSelectedIncidents([])
  }

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading QC dashboard...</p>
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
            QC Review Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            Review and approve incident reports
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              fetchIncidents()
              fetchStats()
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-yellow-600 font-medium">Requires attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Approved</p>
                <p className="text-3xl font-bold text-green-900">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejected</p>
                <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-red-600 font-medium">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Reviewed</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Calendar className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-blue-600 font-medium">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-48">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-900 hover:bg-gray-50">All priorities</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-gray-900 hover:bg-gray-50">
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIncidents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedIncidents.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("approve")}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("reject")}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {incidents.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllIncidents}
              >
                Select All ({incidents.length})
              </Button>
            </div>
          )}
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

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Incidents ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">No incidents pending QC review at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedIncidents.includes(incident.id)}
                        onChange={() => toggleIncidentSelection(incident.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {incident.title}
                          </h3>
                          <Badge className={PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG].color}>
                            <span className={cn(
                              "inline-block w-2 h-2 rounded-full mr-1",
                              PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG].dotColor
                            )} />
                            {PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG].label}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {incident.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {incident.reporter.name}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {incident.location}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {format(new Date(incident.createdAt), "MMM dd, yyyy")}
                          </div>
                          {incident._count.attachments > 0 && (
                            <div className="text-blue-600">
                              📎 {incident._count.attachments} files
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/incidents/${incident.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(incident, "approve")}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(incident, "reject")}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {approvalAction === "approve" ? "Approve" : "Reject"} Incident
                {currentIncident ? "" : "s"}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {currentIncident 
                  ? `Are you sure you want to ${approvalAction} "${currentIncident.title}"?`
                  : `Are you sure you want to ${approvalAction} ${selectedIncidents.length} incidents?`
                }
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment {approvalAction === "reject" ? "(Required)" : "(Optional)"}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Add a comment about this ${approvalAction}...`}
                  rows={3}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalModal(false)
                    setCurrentIncident(null)
                    setComment("")
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitApproval}
                  disabled={submitting || (approvalAction === "reject" && !comment.trim())}
                  className={
                    approvalAction === "approve" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {approvalAction === "approve" ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {approvalAction === "approve" ? "Approve" : "Reject"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
