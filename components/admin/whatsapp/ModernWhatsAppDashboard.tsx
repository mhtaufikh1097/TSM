'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MessageCircle,
  Settings,
  Database
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import CredentialStorageManager from './CredentialStorageManager'

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
    
    // More responsive polling for better status sync
    const interval = setInterval(() => {
      if (!status.isConnected) {
        // Poll frequently when disconnected (trying to connect)
        fetchStatus()
      } else {
        // Poll less frequently when connected but still responsive
        fetchStatus()
      }
    }, status.isConnected ? 30000 : 5000) // 30s when connected, 5s when disconnected
    
    return () => clearInterval(interval)
  }, [status.isConnected])

  // Auto-refresh when status changes from disconnected to connected
  useEffect(() => {
    if (status.isConnected) {
      // Refresh status dan stats setelah berhasil connect dengan delay
      setTimeout(() => {
        console.log('🔄 Auto-refreshing after connection success...')
        fetchStatus(true)
        fetchStats()
        fetchMessages()
      }, 2000) // 2 second delay untuk memastikan backend sudah sync
    }
  }, [status.isConnected])

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

  const fetchStatus = async (force = false) => {
    try {
      // Use status endpoint for better simple service compatibility
      const url = force ? '/api/whatsapp/status?_t=' + Date.now() : '/api/whatsapp/status'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const newStatus = {
            isConnected: data.service.isConnected,
            qrCode: data.qrCode !== 'No QR code available' ? data.qrCode : undefined,
            lastSeen: data.service.lastConnected,
            error: data.service.lastError,
            phoneNumber: data.service.sessionExists && data.service.isConnected ? 'Connected Device' : undefined
          }
          
          // Log status changes for debugging
          if (newStatus.isConnected !== status.isConnected) {
            console.log(`🔄 UI Status changed: ${status.isConnected} -> ${newStatus.isConnected}`)
          }
          
          setStatus(newStatus)
        } else {
          setStatus({
            isConnected: false,
            error: data.error
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch status:', error)
      setStatus({
        isConnected: false,
        error: 'Failed to connect to service'
      })
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.stats) {
          setStats({
            total: data.stats.totalSent + data.stats.totalFailed + data.stats.totalPending,
            sent: data.stats.totalSent,
            pending: data.stats.totalPending,
            failed: data.stats.totalFailed,
            today: data.stats.totalSent // Simplified for now
          })
        }
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
        setTimeout(() => fetchStatus(true), 1000) // Force refresh after action
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Notification */}
        {notification && (
          <Alert className={`${notification.type === 'success' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'} shadow-lg animate-in slide-in-from-top duration-300`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={notification.type === 'success' ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Compact Header Card */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Title & Status Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor()} animate-pulse`} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">WhatsApp Management</h1>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-semibold">
                        SIMPLE MODE
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {getStatusText()} • Simple Service v[2,3000,1025091846] • Optimized Connection
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleAction('initialize')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  <span className="ml-2">Connect</span>
                </Button>
                <Button
                  onClick={() => handleAction('restart')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  <span className="ml-2">Restart</span>
                </Button>
                <Button
                  onClick={() => handleAction('clear_session')}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                  className="shadow-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="ml-2">Clear</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Storage Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Status & QR Column */}
          <div className="xl:col-span-1 space-y-6">
            {/* Connection Status Card */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                    <div>
                      <span className="font-semibold text-gray-900 text-lg">{getStatusText()}</span>
                      {status.phoneNumber && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {status.phoneNumber}
                        </p>
                      )}
                    </div>
                    {status.isConnected ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                        <Wifi className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 px-3 py-1">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                  
                  {status.lastSeen && (
                    <div className="text-sm text-gray-600 flex items-center gap-2 p-2 rounded bg-blue-50/50">
                      <Clock className="h-4 w-4 text-blue-500" />
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
                    <div className="space-y-3">
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800 font-medium mb-3">📱 Scan QR Code with WhatsApp</p>
                        <div className="flex justify-center">
                          <img 
                            src={status.qrCode} 
                            alt="WhatsApp QR Code" 
                            className="w-32 h-32 border-2 border-gray-300 rounded-lg shadow-md"
                          />
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">QR Code expires in 45 seconds</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xl font-bold text-blue-700">{stats.total}</p>
                      <p className="text-xs text-blue-600">Total</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xl font-bold text-green-700">{stats.sent}</p>
                      <p className="text-xs text-green-600">Sent</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-xl font-bold text-yellow-700">{stats.pending}</p>
                      <p className="text-xs text-yellow-600">Pending</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-xl font-bold text-red-700">{stats.failed}</p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Message Column */}
          <div className="xl:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  Send Test Message
                </CardTitle>
                <CardDescription className="text-sm">Test WhatsApp messaging functionality</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">Phone Number</label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="081234567890"
                      className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">Message</label>
                    <Textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter test message..."
                      rows={3}
                      className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm resize-none"
                    />
                  </div>
                  <Button
                    onClick={sendTestMessage}
                    disabled={loading || !status.isConnected}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-200"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Test Message
                  </Button>
                  {!status.isConnected && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        WhatsApp must be connected to send messages
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message History Column */}
          <div className="xl:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  Recent Conversations
                  {Object.keys(groupedMessages).length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {Object.keys(groupedMessages).length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[600px] w-full pr-4">
                  <div className="space-y-3">
                    {Object.entries(groupedMessages).map(([phone, phoneMessages]) => {
                      const lastMessage = phoneMessages[0]
                      const unreadCount = phoneMessages.filter(m => m.status === 'PENDING').length
                      
                      return (
                        <Dialog key={phone}>
                          <DialogTrigger asChild>
                            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-200 hover:shadow-md">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {phone.slice(-2)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-gray-900 truncate text-sm">
                                    +{phone}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {unreadCount > 0 && (
                                      <Badge className="bg-green-500 text-white text-xs min-w-[18px] h-5 rounded-full flex items-center justify-center">
                                        {unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-1">
                                  {getMessageStatusIcon(lastMessage.status)}
                                  <p className="text-xs text-gray-600 truncate flex-1">
                                    {lastMessage.message}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                                    {lastMessage.type}
                                  </Badge>
                                  <span className="text-xs text-gray-400">
                                    {phoneMessages.length} msg
                                  </span>
                                </div>
                              </div>
                              
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </DialogTrigger>
                          
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                                  <div key={message.id} className="border rounded-lg p-3 bg-gray-50/50">
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
                      <div className="text-center py-12 text-gray-500">
                        <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <h3 className="font-medium mb-2 text-gray-600">No conversations yet</h3>
                        <p className="text-sm text-gray-500">Send a test message to start your first conversation</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="storage">
            <CredentialStorageManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
