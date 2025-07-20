'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  Send, 
  RotateCcw, 
  Trash2, 
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Eye,
  MessageCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WhatsAppStatus {
  isConnected: boolean
  qrCode?: string
  lastSeen?: string
  error?: string
  phoneNumber?: string
}

interface MessageStats {
  total: number
  sent: number
  pending: number
  failed: number
  today: number
}

interface MessageHistory {
  id: string
  phone: string
  message: string
  status: string
  type: string
  createdAt: string
  sentAt?: string
  error?: string
}

export default function ModernWhatsAppDashboard() {
  const [status, setStatus] = useState<WhatsAppStatus>({ isConnected: false })
  const [stats, setStats] = useState<MessageStats>({ total: 0, sent: 0, pending: 0, failed: 0, today: 0 })
  const [messages, setMessages] = useState<MessageHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [testPhone, setTestPhone] = useState('081224077855')
  const [testMessage, setTestMessage] = useState('Test message from TSM WhatsApp Bot')
  const [groupedMessages, setGroupedMessages] = useState<Record<string, MessageHistory[]>>({})
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({type, message})
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    fetchStatus()
    fetchStats()
    fetchMessages()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const grouped = messages.reduce((acc, message) => {
      if (!acc[message.phone]) {
        acc[message.phone] = []
      }
      acc[message.phone].push(message)
      return acc
    }, {} as Record<string, MessageHistory[]>)
    setGroupedMessages(grouped)
  }, [messages])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/control')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/whatsapp/messages/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/whatsapp/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (response.ok) {
        showNotification('success', data.message)
        setTimeout(fetchStatus, 1000)
      } else {
        showNotification('error', data.error || 'Action failed')
      }
    } catch (error) {
      showNotification('error', 'Failed to perform action')
    } finally {
      setLoading(false)
    }
  }

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      showNotification('error', 'Phone and message are required')
      return
    }
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        showNotification('success', 'Test message sent successfully!')
        setTestMessage('')
        setTimeout(() => {
          fetchStats()
          fetchMessages()
        }, 1000)
      } else {
        showNotification('error', data.error || 'Failed to send test message')
      }
    } catch (error) {
      showNotification('error', 'Failed to send test message')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    if (status.isConnected) return 'bg-green-500'
    if (status.qrCode) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (status.isConnected) return 'Connected'
    if (status.qrCode) return 'Waiting for QR Scan'
    return 'Disconnected'
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Notification */}
        {notification && (
          <Alert className={notification.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">WhatsApp Management</h1>
                <p className="text-sm text-gray-600">Monitor and manage WhatsApp notifications</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleAction('initialize')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  <span className="ml-1">Connect</span>
                </Button>
                <Button
                  onClick={() => handleAction('restart')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  <span className="ml-1">Restart</span>
                </Button>
                <Button
                  onClick={() => handleAction('clear_session')}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="ml-1">Clear</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Connection Status */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{getStatusText()}</span>
                    {status.isConnected ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Wifi className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                  
                  {status.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      Connected as: {status.phoneNumber}
                    </div>
                  )}
                  
                  {status.lastSeen && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      Last seen: {new Date(status.lastSeen).toLocaleString()}
                    </div>
                  )}

                  {status.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">{status.error}</AlertDescription>
                    </Alert>
                  )}

                  {status.qrCode && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Scan this QR code with WhatsApp:</p>
                      <div className="flex justify-center p-3 bg-white border rounded-lg">
                        <img 
                          src={status.qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-40 h-40"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-lg font-bold text-green-600">{stats.sent}</p>
                      <p className="text-xs text-gray-600">Sent</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-500" />
                    <div>
                      <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="text-lg font-bold text-red-600">{stats.failed}</p>
                      <p className="text-xs text-gray-600">Failed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Message */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Send Test Message</CardTitle>
                <CardDescription className="text-sm">Test WhatsApp messaging functionality</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-1">Phone Number</label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="081234567890"
                      className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-1">Message</label>
                    <Textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter test message..."
                      rows={2}
                      className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    onClick={sendTestMessage}
                    disabled={loading || !status.isConnected}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Test Message
                  </Button>
                  {!status.isConnected && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      WhatsApp must be connected to send messages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Message History */}
          <div className="space-y-4">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Message History</CardTitle>
                <CardDescription className="text-sm">Recent WhatsApp conversations</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {Object.entries(groupedMessages).map(([phone, phoneMessages]) => {
                    const lastMessage = phoneMessages[0]
                    const unreadCount = phoneMessages.filter(m => m.status === 'PENDING').length
                    
                    return (
                      <Dialog key={phone}>
                        <DialogTrigger asChild>
                          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {phone.slice(-2)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-gray-900 truncate text-sm">
                                  +{phone}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">
                                    {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  {unreadCount > 0 && (
                                    <Badge className="bg-green-500 text-white text-xs min-w-[16px] h-4 rounded-full flex items-center justify-center">
                                      {unreadCount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getMessageStatusIcon(lastMessage.status)}
                                <p className="text-xs text-gray-600 truncate flex-1">
                                  {lastMessage.message}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {lastMessage.type}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {phoneMessages.length} messages
                                </span>
                              </div>
                            </div>
                            
                            <Eye className="h-4 w-4 text-gray-400" />
                          </div>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {phone.slice(-2)}
                              </div>
                              +{phone}
                            </DialogTitle>
                            <DialogDescription>
                              {phoneMessages.length} messages • Last active {new Date(phoneMessages[0].createdAt).toLocaleString()}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <ScrollArea className="h-[400px] w-full">
                            <div className="space-y-3 pr-4">
                              {phoneMessages.map((message) => (
                                <div key={message.id} className="border rounded-lg p-3 bg-gray-50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {getMessageStatusIcon(message.status)}
                                      <Badge variant="outline" className="text-xs">
                                        {message.type}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(message.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm text-gray-900 mb-2 leading-relaxed">
                                    {message.message}
                                  </p>
                                  
                                  {message.error && (
                                    <Alert className="mt-2 bg-red-50 border-red-200">
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                      <AlertDescription className="text-red-800 text-xs">
                                        Error: {message.error}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
                                  {message.sentAt && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✓ Sent at {new Date(message.sentAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    )
                  })}
                  
                  {Object.keys(groupedMessages).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <h3 className="font-medium mb-1">No conversations yet</h3>
                      <p className="text-sm">Send a test message to start your first conversation</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
