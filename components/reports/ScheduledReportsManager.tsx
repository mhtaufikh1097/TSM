"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  Mail,
  Send,
  Settings,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface ScheduledReport {
  id: string
  name: string
  reportType: string
  frequency: string
  recipients: string[]
  nextRun: string
  isActive: boolean
  lastRun?: string
  status: "active" | "paused" | "error"
}

export default function ScheduledReportsManager() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    {
      id: "1",
      name: "Weekly Executive Summary",
      reportType: "summary",
      frequency: "weekly",
      recipients: ["admin@wika.co.id", "manager@wika.co.id"],
      nextRun: "2025-07-24T09:00:00Z",
      isActive: true,
      lastRun: "2025-07-17T09:00:00Z",
      status: "active"
    },
    {
      id: "2", 
      name: "Monthly Detailed Report",
      reportType: "detailed",
      frequency: "monthly",
      recipients: ["reports@wika.co.id"],
      nextRun: "2025-08-01T08:00:00Z",
      isActive: true,
      status: "active"
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [emailConfig, setEmailConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: ""
  })

  const [newSchedule, setNewSchedule] = useState({
    name: "",
    reportType: "summary",
    frequency: "weekly",
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    time: "09:00",
    recipients: "",
    filters: {
      status: "all",
      priority: "all",
      reporterId: "all"
    }
  })

  const [testEmailResult, setTestEmailResult] = useState<string | null>(null)

  const handleCreateSchedule = async () => {
    try {
      const recipients = newSchedule.recipients
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0)

      if (!newSchedule.name || recipients.length === 0) {
        alert("Please fill in all required fields")
        return
      }

      const schedule = {
        frequency: newSchedule.frequency,
        dayOfWeek: newSchedule.frequency === "weekly" ? newSchedule.dayOfWeek : undefined,
        dayOfMonth: newSchedule.frequency === "monthly" ? newSchedule.dayOfMonth : undefined,
        time: newSchedule.time
      }

      const response = await fetch("/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_schedule",
          scheduleName: newSchedule.name,
          reportType: newSchedule.reportType,
          recipients,
          schedule,
          filters: newSchedule.filters
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert("Scheduled report created successfully!")
        setShowCreateForm(false)
        setNewSchedule({
          name: "",
          reportType: "summary",
          frequency: "weekly",
          dayOfWeek: 1,
          dayOfMonth: 1,
          time: "09:00",
          recipients: "",
          filters: {
            status: "all",
            priority: "all",
            reporterId: "all"
          }
        })
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create scheduled report")
      }
    } catch (error) {
      console.error("Error creating schedule:", error)
      alert("Error creating scheduled report")
    }
  }

  const handleSendNow = async (reportId: string) => {
    const report = scheduledReports.find(r => r.id === reportId)
    if (!report) return

    try {
      const response = await fetch("/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_now",
          reportType: report.reportType,
          recipients: report.recipients,
          filters: {} // Use default filters for now
        })
      })

      if (response.ok) {
        alert("Report sent successfully!")
      } else {
        const error = await response.json()
        alert(error.error || "Failed to send report")
      }
    } catch (error) {
      console.error("Error sending report:", error)
      alert("Error sending report")
    }
  }

  const handleTestEmail = async () => {
    try {
      const response = await fetch("/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_email"
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTestEmailResult(data.message)
      } else {
        const error = await response.json()
        setTestEmailResult(`Error: ${error.error}`)
      }
    } catch (error) {
      setTestEmailResult("Error testing email configuration")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scheduled Reports</h2>
          <p className="text-gray-600">Manage automated report delivery</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Email Configuration Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={handleTestEmail} variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Test Email Configuration
            </Button>
            {testEmailResult && (
              <div className={`p-2 rounded text-sm ${
                testEmailResult.includes("Error") 
                  ? "bg-red-100 text-red-700" 
                  : "bg-green-100 text-green-700"
              }`}>
                {testEmailResult}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure SMTP settings in your environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS)
          </p>
        </CardContent>
      </Card>

      {/* Scheduled Reports List */}
      <div className="grid gap-4">
        {scheduledReports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{report.name}</h3>
                    <Badge className={getStatusColor(report.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(report.status)}
                        {report.status}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p><strong>Type:</strong> {report.reportType}</p>
                      <p><strong>Frequency:</strong> {report.frequency}</p>
                    </div>
                    <div>
                      <p><strong>Recipients:</strong> {report.recipients.length}</p>
                      <p><strong>Next Run:</strong> {new Date(report.nextRun).toLocaleString()}</p>
                    </div>
                    <div>
                      {report.lastRun && (
                        <p><strong>Last Run:</strong> {new Date(report.lastRun).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      <strong>Recipients:</strong> {report.recipients.join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendNow(report.id)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Toggle active status
                      setScheduledReports(reports => 
                        reports.map(r => 
                          r.id === report.id 
                            ? { ...r, isActive: !r.isActive, status: r.isActive ? "paused" : "active" }
                            : r
                        )
                      )
                    }}
                  >
                    {report.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this scheduled report?")) {
                        setScheduledReports(reports => reports.filter(r => r.id !== report.id))
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Schedule Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Scheduled Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Report Name</label>
                <Input
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Weekly Executive Summary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Report Type</label>
                  <Select 
                    value={newSchedule.reportType} 
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, reportType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary Report</SelectItem>
                      <SelectItem value="detailed">Detailed Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <Select 
                    value={newSchedule.frequency} 
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newSchedule.frequency === "weekly" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                  <Select 
                    value={newSchedule.dayOfWeek.toString()} 
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newSchedule.frequency === "monthly" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Day of Month</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={newSchedule.dayOfMonth}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <Input
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Recipients (comma separated)</label>
                <Textarea
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="admin@wika.co.id, manager@wika.co.id"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchedule}>
                  Create Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
