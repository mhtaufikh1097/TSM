'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  FolderOpen, 
  ArrowRight, 
  RefreshCw, 
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface StorageStatus {
  file: {
    exists: boolean
    path: string
  }
  database: {
    exists: boolean
    sessionId: string
  }
  currentMode: string
}

interface OperationResult {
  success: boolean
  message: string
  migratedFiles?: number
  errors?: string[]
}

export default function CredentialStorageManager() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [operation, setOperation] = useState<string>('')
  const [result, setResult] = useState<OperationResult | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/credential-storage')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch storage status:', error)
    }
  }

  const performOperation = async (action: string, newMode?: string) => {
    setLoading(true)
    setOperation(action)
    setResult(null)

    try {
      const response = await fetch('/api/whatsapp/credential-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          sessionId: 'main',
          newMode 
        })
      })

      const data = await response.json()
      setResult(data.data || { success: data.success, message: data.message })
      
      // Refresh status after operation
      setTimeout(() => {
        fetchStatus()
      }, 1000)

    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to perform operation'
      })
    } finally {
      setLoading(false)
      setOperation('')
    }
  }

  const getStorageIcon = (type: 'file' | 'database', exists: boolean) => {
    const Icon = type === 'file' ? FolderOpen : Database
    const color = exists ? 'text-green-600' : 'text-gray-400'
    return <Icon className={`h-5 w-5 ${color}`} />
  }

  const getStatusBadge = (exists: boolean) => {
    return exists ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Exists
      </Badge>
    ) : (
      <Badge variant="outline" className="text-gray-600">
        <XCircle className="h-3 w-3 mr-1" />
        Empty
      </Badge>
    )
  }

  if (!status) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading storage status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Credential Storage Management
        </CardTitle>
        <CardDescription>
          Manage WhatsApp credential storage between file system and database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
            <div className="flex items-center gap-3">
              {getStorageIcon('file', status.file.exists)}
              <div>
                <p className="font-semibold text-gray-900">File Storage</p>
                <p className="text-sm text-gray-600">{status.file.path}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(status.file.exists)}
              {status.currentMode === 'file' && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Active
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
            <div className="flex items-center gap-3">
              {getStorageIcon('database', status.database.exists)}
              <div>
                <p className="font-semibold text-gray-900">Database Storage</p>
                <p className="text-sm text-gray-600">Session: {status.database.sessionId}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(status.database.exists)}
              {status.currentMode === 'database' && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Current Mode Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Current Mode:</strong> {status.currentMode.toUpperCase()} storage is active. 
            Credentials are being read from {status.currentMode === 'file' ? 'auth_info_baileys folder' : 'database tables'}.
          </AlertDescription>
        </Alert>

        {/* Operations */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Available Operations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Migrate to Database */}
            <Button
              onClick={() => performOperation('migrate-to-database')}
              disabled={loading || !status.file.exists || status.database.exists}
              variant="outline"
              className="flex items-center gap-2 h-auto p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <ArrowRight className="h-4 w-4" />
                <Database className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Migrate to Database</p>
                <p className="text-xs text-gray-600">Move credentials from file to database</p>
              </div>
              {loading && operation === 'migrate-to-database' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>

            {/* Migrate to File */}
            <Button
              onClick={() => performOperation('migrate-to-file')}
              disabled={loading || !status.database.exists || status.file.exists}
              variant="outline"
              className="flex items-center gap-2 h-auto p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <ArrowRight className="h-4 w-4" />
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Migrate to File</p>
                <p className="text-xs text-gray-600">Move credentials from database to file</p>
              </div>
              {loading && operation === 'migrate-to-file' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>
          </div>

          {/* Mode Switching */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Switch Active Mode</h4>
            <div className="flex gap-2">
              <Button
                onClick={() => performOperation('switch-mode', 'file')}
                disabled={loading || status.currentMode === 'file'}
                variant={status.currentMode === 'file' ? 'default' : 'outline'}
                size="sm"
              >
                {loading && operation === 'switch-mode' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Use File Storage
              </Button>
              <Button
                onClick={() => performOperation('switch-mode', 'database')}
                disabled={loading || status.currentMode === 'database'}
                variant={status.currentMode === 'database' ? 'default' : 'outline'}
                size="sm"
              >
                {loading && operation === 'switch-mode' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Use Database Storage
              </Button>
            </div>
          </div>

          {/* Clear All */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => performOperation('clear-all')}
              disabled={loading || (!status.file.exists && !status.database.exists)}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              {loading && operation === 'clear-all' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear All Credentials
            </Button>
            <p className="text-xs text-gray-600 mt-1">
              This will remove credentials from both file and database storage
            </p>
          </div>
        </div>

        {/* Operation Result */}
        {result && (
          <Alert className={`${result.success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'} animate-in slide-in-from-top duration-300`}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
              <p className="font-medium">{result.message}</p>
              {result.migratedFiles && (
                <p className="text-sm mt-1">Files processed: {result.migratedFiles}</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className="text-sm mt-2 list-disc list-inside">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Refresh Button */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          <Button
            onClick={fetchStatus}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
