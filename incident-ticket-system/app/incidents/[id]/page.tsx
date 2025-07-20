"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  Download,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Pause
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Incident {
  id: string
  title: string
  description: string
  location: string
  occurredAt: string
  status: string
  priority: string
  createdAt: string
  qcAt?: string
  qcComment?: string
  pmAt?: string
  pmComment?: string
  reporter: {
    id: string
    name: string
    email: string
    role: string
  }
  qc?: {
    id: string
    name: string
    email: string
    role: string
  }
  pm?: {
    id: string
    name: string
    email: string
    role: string
  }
  attachments: Array<{
    id: string
    filename: string
    originalName: string
    path: string
    mimeType: string
    size: number
    createdAt: string
  }>
  logs: Array<{
    id: string
    action: string
    oldStatus?: string
    newStatus?: string
    comment?: string
    userId: string
    createdAt: string
  }>
}

const STATUS_CONFIG = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-800", icon: AlertTriangle },
  ON_HOLD: { label: "On Hold", color: "bg-yellow-100 text-yellow-800", icon: Pause },
  QC_APPROVED: { label: "QC Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  QC_REJECTED: { label: "QC Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  PM_APPROVED: { label: "PM Approved", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  PM_REJECTED: { label: "PM Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-800", icon: CheckCircle },
  // Legacy support (temporary)
  PENDING_QC: { label: "Pending QC", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  APPROVED_QC: { label: "QC Approved", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  REJECTED_QC: { label: "QC Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  PENDING_PM: { label: "Pending PM", color: "bg-orange-100 text-orange-800", icon: Clock },
  APPROVED_PM: { label: "PM Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  REJECTED_PM: { label: "PM Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-800" },
  MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-800" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-800" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-800" },
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const response = await fetch(`/api/incidents/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch incident")
        }

        setIncident(data.incident)
      } catch (error) {
        console.error("Error fetching incident:", error)
        setError(error instanceof Error ? error.message : "Failed to load incident")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchIncident()
    }
  }, [params.id])

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const downloadFile = (filePath: string, filename: string) => {
    const link = document.createElement("a")
    link.href = filePath
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading incident details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !incident) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error || "Incident not found"}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[incident.status as keyof typeof STATUS_CONFIG] || { 
    label: incident.status, 
    color: "bg-gray-100 text-gray-800", 
    icon: AlertTriangle 
  }
  const priorityConfig = PRIORITY_CONFIG[incident.priority as keyof typeof PRIORITY_CONFIG] || {
    label: incident.priority,
    color: "bg-gray-100 text-gray-800"
  }
  const StatusIcon = statusConfig.icon

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Incident Details
              </h1>
              <p className="text-gray-600">#{incident.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge className={priorityConfig.color}>
              {priorityConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Information */}
            <Card>
              <CardHeader>
                <CardTitle>Incident Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {incident.title}
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {incident.description}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="font-medium mr-2">Location:</span>
                    {incident.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium mr-2">Occurred:</span>
                    {format(new Date(incident.occurredAt), "MMM dd, yyyy 'at' hh:mm a")}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QC Review */}
            {(incident.qc || incident.qcComment) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    QC Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incident.qc && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium mr-2">Reviewed by:</span>
                      <span>{incident.qc.name}</span>
                    </div>
                  )}
                  {incident.qcAt && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-medium mr-2">Reviewed on:</span>
                      {format(new Date(incident.qcAt), "MMM dd, yyyy 'at' hh:mm a")}
                    </div>
                  )}
                  {incident.qcComment && (
                    <div>
                      <span className="font-medium text-gray-900">Comment:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                        {incident.qcComment}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PM Review */}
            {(incident.pm || incident.pmComment) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    PM Approval
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incident.pm && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium mr-2">Approved by:</span>
                      <span>{incident.pm.name}</span>
                    </div>
                  )}
                  {incident.pmAt && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-medium mr-2">Approved on:</span>
                      {format(new Date(incident.pmAt), "MMM dd, yyyy 'at' hh:mm a")}
                    </div>
                  )}
                  {incident.pmComment && (
                    <div>
                      <span className="font-medium text-gray-900">Comment:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                        {incident.pmComment}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {incident.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments ({incident.attachments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {incident.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0 mr-3">
                          {attachment.mimeType.startsWith("image/") ? (
                            <img 
                              src={attachment.path} 
                              alt={attachment.originalName}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              {getFileIcon(attachment.mimeType)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(attachment.path, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(attachment.path, attachment.originalName)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reporter Info */}
            <Card>
              <CardHeader>
                <CardTitle>Reporter Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {incident.reporter.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {incident.reporter.email}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Role:</span> {incident.reporter.role}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Reported:</span>{" "}
                  {format(new Date(incident.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Incident Reported
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(incident.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                      </div>
                    </div>
                  </div>

                  {incident.qcAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          QC Review Completed
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(incident.qcAt), "MMM dd, yyyy 'at' hh:mm a")}
                        </div>
                      </div>
                    </div>
                  )}

                  {incident.pmAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          PM Approval Completed
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(incident.pmAt), "MMM dd, yyyy 'at' hh:mm a")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
