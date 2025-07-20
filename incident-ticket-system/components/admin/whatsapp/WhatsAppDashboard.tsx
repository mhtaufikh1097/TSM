"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Phone,
  Calendar,
  TrendingUp,
  Download,
  X,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface WhatsAppMessage {
  id: string
  phone: string
  message: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  type: string
  retryCount: number
  maxRetries: number
  error?: string
  sentAt?: string
  createdAt: string
  incident?: {
    id: string
    title: string
  }
}

interface ConnectionStatus {
  isConnected: boolean
  qrCode?: string | null
}

interface MessageStats {
  total: number
  sent: number
  pending: number
  failed: number
  today: number
}

interface NotificationStats {
  total: number
  today: number
  byType: Record<string, number>
  recentFailures: number
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-green-100 text-green-800",
  DELIVERED: "bg-blue-100 text-blue-800",
  READ: "bg-purple-100 text-purple-800",
  FAILED: "bg-red-100 text-red-800"
}

const statusIcons = {
  PENDING: Clock,
  SENT: CheckCircle,
  DELIVERED: CheckCircle,
  READ: CheckCircle,
  FAILED: XCircle
}

export default function WhatsAppDashboard() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false })
  const [messageStats, setMessageStats] = useState<MessageStats>({
    total: 0, sent: 0, pending: 0, failed: 0, today: 0
  })
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    total: 0, today: 0, byType: {}, recentFailures: 0
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Bulk message form
  const [bulkMessageForm, setBulkMessageForm] = useState({
    phones: "",
    message: "",
    type: "SYSTEM_NOTIFICATION"
  })
  const [sendingBulk, setSendingBulk] = useState(false)

  const fetchData = async () => {
    try {
      const [statusRes, messagesRes] = await Promise.all([
        fetch("/api/whatsapp/status"),
        fetch(`/api/whatsapp/messages?page=${currentPage}&status=${statusFilter !== "all" ? statusFilter : ""}&type=${typeFilter !== "all" ? typeFilter : ""}`)
      ])

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setConnectionStatus(statusData.connection)
        setMessageStats(statusData.stats)
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json()
        setMessages(messagesData.messages)
        setNotificationStats(messagesData.stats)
        setTotalPages(messagesData.pagination.pages)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [currentPage, statusFilter, typeFilter])

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" })
      })

      if (response.ok) {
        setTimeout(fetchData, 2000) // Refresh after 2 seconds
      }
    } catch (error) {
      console.error("Error connecting WhatsApp:", error)
    }
  }

  const handleClearSession = async () => {
    if (!confirm("Are you sure you want to clear the WhatsApp session? You will need to scan the QR code again to reconnect.")) {
      return
    }

    try {
      const response = await fetch("/api/admin/whatsapp/clear-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setTimeout(fetchData, 2000) // Refresh after 2 seconds
      } else {
        const error = await response.json()
        alert(error.error || "Failed to clear session")
      }
    } catch (error) {
      console.error("Error clearing WhatsApp session:", error)
      alert("Error clearing session")
    }
  }

  const handleRetryFailed = async () => {
    try {
      const response = await fetch("/api/whatsapp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_failed" })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        fetchData()
      }
    } catch (error) {
      console.error("Error retrying failed messages:", error)
    }
  }

  const handleSendBulkMessage = async () => {
    if (!bulkMessageForm.phones.trim() || !bulkMessageForm.message.trim()) {
      alert("Phone numbers and message are required")
      return
    }

    setSendingBulk(true)
    try {
      const phones = bulkMessageForm.phones
        .split(/[,\n]/)
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0)

      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phones,
          message: bulkMessageForm.message,
          type: bulkMessageForm.type
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setBulkMessageForm({ phones: "", message: "", type: "SYSTEM_NOTIFICATION" })
        fetchData()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to send messages")
      }
    } catch (error) {
      console.error("Error sending bulk message:", error)
      alert("Error sending messages")
    } finally {
      setSendingBulk(false)
    }
  }

  const handleRestartConnection = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/whatsapp/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" })
      })

      if (response.ok) {
        alert("WhatsApp connection restarted successfully")
        setTimeout(fetchData, 3000) // Refresh after 3 seconds
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error restarting connection:", error)
      alert("Failed to restart connection")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Management</h1>
          <p className="text-gray-600">Monitor and manage WhatsApp notifications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!connectionStatus.isConnected && (
            <Button onClick={handleConnect}>
              <Wifi className="h-4 w-4 mr-2" />
              Connect
            </Button>
          )}
          <Button onClick={handleClearSession} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Session
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus.isConnected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${connectionStatus.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-sm text-gray-600">
                  {connectionStatus.isConnected 
                    ? 'WhatsApp is ready to send messages'
                    : 'Please scan QR code to connect'
                  }
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleRestartConnection} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Restart
                </Button>
                <Button 
                  onClick={handleClearSession} 
                  variant="destructive" 
                  size="sm"
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Session
                </Button>
              </div>
            </div>

            {connectionStatus.qrCode && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Scan this QR code with WhatsApp:</p>
                <div className="bg-white p-4 border rounded inline-block">
                  <img 
                    src={connectionStatus.qrCode} 
                    alt="WhatsApp QR Code"
                    className="w-32 h-32"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  QR code expires in 20 seconds. Click "Restart" to generate a new one.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">{messageStats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-green-600">{messageStats.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{messageStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{messageStats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold text-blue-600">{messageStats.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Message Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Bulk Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Numbers</label>
            <Textarea
              placeholder="Enter phone numbers separated by commas or new lines&#10;Example:&#10;+6281234567890&#10;081234567891&#10;6281234567892"
              value={bulkMessageForm.phones}
              onChange={(e) => setBulkMessageForm(prev => ({ ...prev, phones: e.target.value }))}
              rows={3}
              className="bg-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <Textarea
              placeholder="Enter your message here..."
              value={bulkMessageForm.message}
              onChange={(e) => setBulkMessageForm(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="bg-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Message Type</label>
              <Select 
                value={bulkMessageForm.type} 
                onValueChange={(value) => setBulkMessageForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SYSTEM_NOTIFICATION">System Notification</SelectItem>
                  <SelectItem value="INCIDENT_SUBMITTED">Incident Submitted</SelectItem>
                  <SelectItem value="QC_APPROVED">QC Approved</SelectItem>
                  <SelectItem value="QC_REJECTED">QC Rejected</SelectItem>
                  <SelectItem value="PM_APPROVED">PM Approved</SelectItem>
                  <SelectItem value="PM_REJECTED">PM Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSendBulkMessage}
              disabled={sendingBulk}
              className="mt-6"
            >
              {sendingBulk ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {messageStats.failed > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800">
                  {messageStats.failed} messages failed to send
                </span>
              </div>
              <Button variant="outline" onClick={handleRetryFailed}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Message History</CardTitle>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCIDENT_SUBMITTED">Incident Submitted</SelectItem>
                  <SelectItem value="QC_APPROVED">QC Approved</SelectItem>
                  <SelectItem value="QC_REJECTED">QC Rejected</SelectItem>
                  <SelectItem value="PM_APPROVED">PM Approved</SelectItem>
                  <SelectItem value="PM_REJECTED">PM Rejected</SelectItem>
                  <SelectItem value="SYSTEM_NOTIFICATION">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No messages found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const StatusIcon = statusIcons[message.status]
                return (
                  <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{message.phone}</span>
                        <Badge className={statusColors[message.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {message.status}
                        </Badge>
                        <Badge variant="outline">{message.type}</Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(message.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-2 whitespace-pre-wrap line-clamp-3">
                      {message.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        {message.incident && (
                          <span>Incident: {message.incident.title}</span>
                        )}
                        {message.retryCount > 0 && (
                          <span>Retries: {message.retryCount}/{message.maxRetries}</span>
                        )}
                      </div>
                      
                      {message.sentAt && (
                        <span>
                          Sent: {format(new Date(message.sentAt), "dd MMM HH:mm", { locale: id })}
                        </span>
                      )}
                    </div>
                    
                    {message.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Error: {message.error}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
