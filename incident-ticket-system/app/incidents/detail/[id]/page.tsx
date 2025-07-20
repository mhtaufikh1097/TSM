"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
  ThumbsUp,
  ThumbsDown,
  Send,
  Pause
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
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
  documents: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState("")
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const token = searchParams.get('token')
  const role = searchParams.get('role')
  const incidentId = params.id as string

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({type, message})
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    if (incidentId) {
      fetchIncident()
    } else {
      setError("Missing incident ID")
      setLoading(false)
    }
  }, [incidentId])

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}?token=${token}&role=${role}`)
      if (response.ok) {
        const data = await response.json()
        setIncident(data.incident || data) // Handle both response formats
      } else {
        setError("Incident not found or invalid token")
      }
    } catch (error) {
      setError("Failed to fetch incident")
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (action: 'approve' | 'reject' | 'on_hold') => {
    if (!incident) return

    // Determine review mode and endpoint
    let endpoint: string
    let reviewRole: string
    let requestBody: any

    if (token && role) {
      // Mode 1: WhatsApp link access
      reviewRole = role
      endpoint = role === 'qc' ? '/api/qc/review' : '/api/pm/review'
      requestBody = {
        incidentId: incident.id,
        action,
        comment,
        token
      }
    } else if (session?.user) {
      // Mode 2: Session-based access
      const userRole = session.user.role
      if (userRole === 'QC' || userRole === 'ADMIN') {
        reviewRole = 'qc'
        endpoint = '/api/qc/review'
      } else if (userRole === 'PM') {
        reviewRole = 'pm'
        endpoint = '/api/pm/review'
      } else {
        showNotification('error', 'Anda tidak memiliki permission untuk review')
        return
      }
      
      requestBody = {
        incidentIds: [incident.id], // API expects array for session-based access
        action,
        comment
      }
    } else {
      showNotification('error', 'Access denied')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        const actionText = action === 'on_hold' ? 'put on hold' : `${action}d`
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800'
      case 'QC_APPROVED':
        return 'bg-green-100 text-green-800'
      case 'QC_REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PM_APPROVED':
        return 'bg-emerald-100 text-emerald-800'
      case 'PM_REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
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

  const canReview = () => {
    if (!incident) return false
    
    // Mode 1: Akses via WhatsApp link dengan token
    if (token && role) {
      // QC dapat review jika status OPEN atau ON_HOLD dan belum di-review QC
      if (role === 'qc' && (incident.status === 'OPEN' || incident.status === 'ON_HOLD') && !incident.qcAt) {
        return true
      }
      
      // PM dapat review jika sudah QC_APPROVED dan belum di-review PM
      if (role === 'pm' && incident.status === 'QC_APPROVED' && !incident.pmAt) {
        return true
      }
    }
    
    // Mode 2: Akses normal dari dashboard dengan session
    if (session?.user) {
      const userRole = session.user.role
      
      // QC user dapat review jika status OPEN atau ON_HOLD dan belum di-review QC
      if ((userRole === 'QC' || userRole === 'ADMIN') && 
          (incident.status === 'OPEN' || incident.status === 'ON_HOLD') && 
          !incident.qcAt) {
        return true
      }
      
      // PM user dapat review jika sudah QC_APPROVED dan belum di-review PM
      if ((userRole === 'PM' || userRole === 'ADMIN') && 
          incident.status === 'QC_APPROVED' && 
          !incident.pmAt) {
        return true
      }
    }
    
    return false
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!incident) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Incident Not Found</h2>
              <p className="text-gray-600">The requested incident could not be found.</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Notification */}
        {notification && (
          <Alert className={`mb-6 ${notification.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Incident Detail</h1>
              <p className="text-sm text-gray-600">
                {role === 'qc' ? 'QC Review' : role === 'pm' ? 'PM Review' : 'View Only'}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(incident.status)}>
            {incident.status?.replace('_', ' ') || 'Unknown Status'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Incident Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Ticket ID</label>
                  <p className="font-mono text-sm text-blue-600">{incident.id}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <p className="font-medium">{incident.title}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-800 whitespace-pre-wrap">{incident.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Location
                    </label>
                    <p>{incident.location}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Priority
                    </label>
                    <Badge className={getPriorityColor(incident.priority)}>
                      {incident.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Occurred At
                    </label>
                    <p>{format(new Date(incident.occurredAt), 'PPpp')}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Reported At
                    </label>
                    <p>{format(new Date(incident.createdAt), 'PPpp')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            {incident.documents && incident.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incident.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.type}</p>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
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

            {/* Review Actions - Only show if user can review */}
            {canReview() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {role === 'qc' ? 'QC Review' : 'PM Review'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Comments (Optional)
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={`Add your ${role === 'qc' ? 'QC' : 'PM'} review comments...`}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleReview('approve')}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview('on_hold')}
                      disabled={submitting}
                      variant="outline"
                      className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      On Hold
                    </Button>
                    <Button
                      onClick={() => handleReview('reject')}
                      disabled={submitting}
                      variant="destructive"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
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
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Reporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{incident.reporter.name}</p>
                  <p className="text-sm text-gray-600">{incident.reporter.email}</p>
                  <Badge variant="outline">{incident.reporter.role}</Badge>
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
                    <p className="text-sm text-gray-600 mb-1">{incident.qc.name}</p>
                    <p className="text-xs text-gray-500">
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
                    <p className="text-sm text-gray-600 mb-1">{incident.pm.name}</p>
                    <p className="text-xs text-gray-500">
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
                  <p className="text-sm text-gray-500 text-center py-4">
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
