"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  Download,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Pause
} from "lucide-react"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  ticketId: string
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
  }
  pm?: {
    id: string
    name: string
    email: string
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
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState("")
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const incidentId = params.id as string

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({type, message})
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    if (incidentId) {
      fetchIncident()
    }
  }, [incidentId])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`)
      if (response.ok) {
        const data = await response.json()
        setIncident(data.incident || data)
      } else {
        setError("Incident not found or access denied")
      }
    } catch (error) {
      setError("Failed to fetch incident")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'approve' | 'reject' | 'hold') => {
    if (!incident) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment
        })
      })

      const data = await response.json()

      if (response.ok) {
        const actionText = action === 'hold' ? 'put on hold' : `${action}d`
        showNotification('success', `Incident ${actionText} successfully!`)
        setComment("")
        // Refresh incident data
        setTimeout(() => fetchIncident(), 1000)
      } else {
        showNotification('error', data.error || `Failed to ${action} incident`)
      }
    } catch (error) {
      showNotification('error', `Failed to ${action} incident`)
    } finally {
      setSubmitting(false)
    }
  }

  const canTakeAction = () => {
    if (!incident || !session?.user) return false
    
    const userRole = session.user.role
    const currentStatus = incident.status
    
    // QC can act on OPEN or PENDING_QC incidents
    if (userRole === 'QC' && ['OPEN', 'PENDING_QC'].includes(currentStatus)) {
      return true
    }
    
    // PM can act on QC_APPROVED incidents
    if (userRole === 'PM' && currentStatus === 'QC_APPROVED') {
      return true
    }
    
    return false
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading incident...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (!incident) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Incident not found</AlertDescription>
          </Alert>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Notification */}
        {notification && (
          <Alert className={`mb-6 ${notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 text-gray-800">
            <Button onClick={() => router.back()} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2 text-gray-800" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Incident Details</h1>
          </div>
          <Badge className={getStatusColor(incident.status)}>
            {incident.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Incident Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Ticket ID</label>
                  <p className="font-mono text-sm text-blue-600">{incident.ticketId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-800">Title</label>
                  <p className="font-medium">{incident.title}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-800">Description</label>
                  <p className="text-gray-800 whitespace-pre-wrap">{incident.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </label>
                    <p>{incident.location}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-900">Priority</label>
                    <Badge className={getPriorityColor(incident.priority)}>
                      {incident.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Occurred At
                    </label>
                    <p>{format(new Date(incident.occurredAt), 'PPpp')}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Reported At
                    </label>
                    <p>{format(new Date(incident.createdAt), 'PPpp')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {incident.attachments && incident.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incident.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{attachment.originalName}</p>
                          <p className="text-sm text-gray-700">{attachment.mimeType}</p>
                          <p className="text-xs text-gray-600">{(attachment.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <a href={`/api/files/${attachment.filename}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Take Action Section - Only show if user can take action */}
            {canTakeAction() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Take Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Comment Section */}
                  <div className="space-y-2">
                    <label htmlFor="comment" className="text-sm font-medium">
                      Comment (Optional)
                    </label>
                    <Textarea
                      id="comment"
                      placeholder="Add your review comments here..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="resize-none bg-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleAction('approve')}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {submitting ? 'Processing...' : 'Approve'}
                    </Button>
                    
                    <Button
                      onClick={() => handleAction('reject')}
                      disabled={submitting}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {submitting ? 'Processing...' : 'Reject'}
                    </Button>
                    
                    <Button
                      onClick={() => handleAction('hold')}
                      disabled={submitting}
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 flex-1 sm:flex-none"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      {submitting ? 'Processing...' : 'Hold'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reporter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 " />
                  Reporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{incident.reporter.name}</p>
                  <p className="text-sm text-gray-700">{incident.reporter.email}</p>
                  <Badge variant="outline text-gray-700">{incident.reporter.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Review History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Review History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QC Review */}
                {incident.qc && incident.qcAt && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">QC Review</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{incident.qc.name}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(incident.qcAt), 'PPpp')}
                    </p>
                    {incident.qcComment && (
                      <p className="text-sm mt-2 p-2 bg-gray-50 rounded">
                        {incident.qcComment}
                      </p>
                    )}
                  </div>
                )}

                {/* PM Review */}
                {incident.pm && incident.pmAt && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">PM Review</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{incident.pm.name}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(incident.pmAt), 'PPpp')}
                    </p>
                    {incident.pmComment && (
                      <p className="text-sm mt-2 p-2 bg-gray-50 rounded">
                        {incident.pmComment}
                      </p>
                    )}
                  </div>
                )}

                {/* No reviews yet */}
                {!incident.qc && !incident.pm && (
                  <p className="text-sm text-gray-600 text-center py-4">
                    No reviews yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
