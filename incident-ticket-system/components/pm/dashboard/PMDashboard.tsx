"use client"

import { useState, useEffect } from "react"
import { Search, Filter, MoreHorizontal, CheckCircle, XCircle, Eye, Calendar, AlertTriangle, Users, TrendingUp, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface Incident {
  id: string
  title: string
  description: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: string
  location: string
  occurredAt: string
  createdAt: string
  reporter: {
    name: string
    email: string
    phone: string
  }
  qc: {
    name: string
    email: string
  } | null
  qcAt: string | null
  qcComment: string | null
  category: string
  impact: string
  urgency: string
}

interface Stats {
  pendingPM: number
  approvedPM: number
  rejectedPM: number
  totalIncidents: number
  avgResolutionTime: number
  monthlyStats: {
    month: string
    pending: number
    approved: number
    rejected: number
  }[]
}

const priorityColors = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200"
}

const priorityIcons = {
  LOW: "🟢",
  MEDIUM: "🟡", 
  HIGH: "🟠",
  CRITICAL: "🔴"
}

export default function PMDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve")
  const [approvalComment, setApprovalComment] = useState("")
  const [processingApproval, setProcessingApproval] = useState(false)

  // Filter incidents based on search and priority
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.reporter.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = priorityFilter === "all" || incident.priority === priorityFilter
    
    return matchesSearch && matchesPriority
  })

  // Fetch incidents and stats
  const fetchData = async () => {
    try {
      const [incidentsRes, statsRes] = await Promise.all([
        fetch("/api/pm/incidents"),
        fetch("/api/pm/stats")
      ])
      
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json()
        setIncidents(incidentsData.incidents || [])
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000) // Poll every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIncidents(filteredIncidents.map(incident => incident.id))
    } else {
      setSelectedIncidents([])
    }
  }

  // Handle individual incident selection
  const handleIncidentSelect = (incidentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIncidents(prev => [...prev, incidentId])
    } else {
      setSelectedIncidents(prev => prev.filter(id => id !== incidentId))
    }
  }

  // Handle bulk approval/rejection
  const handleBulkAction = async () => {
    if (selectedIncidents.length === 0) return
    
    if (approvalAction === "reject" && !approvalComment.trim()) {
      alert("Komentar wajib diisi untuk penolakan")
      return
    }

    setProcessingApproval(true)
    
    try {
      const response = await fetch("/api/pm/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          incidentIds: selectedIncidents,
          action: approvalAction,
          comment: approvalComment.trim()
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || "Berhasil memproses incident")
        
        // Refresh data
        await fetchData()
        
        // Reset selection and modal
        setSelectedIncidents([])
        setIsApprovalModalOpen(false)
        setApprovalComment("")
      } else {
        const error = await response.json()
        alert(error.error || "Gagal memproses incident")
      }
    } catch (error) {
      console.error("Error processing incidents:", error)
      alert("Terjadi kesalahan saat memproses incident")
    } finally {
      setProcessingApproval(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PM Dashboard</h1>
          <p className="text-gray-600">Kelola approval final incident</p>
        </div>
        
        {selectedIncidents.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => {
                setApprovalAction("approve")
                setApprovalComment("")
                setIsApprovalModalOpen(true)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Setujui ({selectedIncidents.length})
            </Button>
            
            <Button 
              variant="destructive"
              onClick={() => {
                setApprovalAction("reject")
                setApprovalComment("")
                setIsApprovalModalOpen(true)
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tolak ({selectedIncidents.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending PM</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingPM}</div>
              <p className="text-xs text-gray-600">Menunggu approval PM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approvedPM}</div>
              <p className="text-xs text-gray-600">Incident disetujui PM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejectedPM}</div>
              <p className="text-xs text-gray-600">Incident ditolak PM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incident</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalIncidents}</div>
              <p className="text-xs text-gray-600">Semua incident bulan ini</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari incident..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Prioritas" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Semua Prioritas</SelectItem>
                <SelectItem value="CRITICAL">🔴 Critical</SelectItem>
                <SelectItem value="HIGH">🟠 High</SelectItem>
                <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                <SelectItem value="LOW">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Incident Menunggu Approval PM</CardTitle>
            {filteredIncidents.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIncidents.length === filteredIncidents.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label className="text-sm">Pilih Semua</Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada incident</h3>
              <p className="text-gray-600">
                {searchTerm || priorityFilter !== "all" 
                  ? "Tidak ada incident yang sesuai dengan filter"
                  : "Belum ada incident yang menunggu approval PM"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <div className="overflow-hidden border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedIncidents.length === filteredIncidents.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioritas</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QC</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredIncidents.map((incident) => (
                        <tr key={incident.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIncidents.includes(incident.id)}
                              onChange={(e) => handleIncidentSelect(incident.id, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{incident.title}</div>
                              <div className="text-sm text-gray-600 truncate max-w-xs">{incident.description}</div>
                              <div className="text-xs text-gray-500 mt-1">📍 {incident.location}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={priorityColors[incident.priority]}>
                              {priorityIcons[incident.priority]} {incident.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{incident.reporter.name}</div>
                              <div className="text-sm text-gray-600">{incident.reporter.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {incident.qc ? (
                              <div>
                                <div className="font-medium text-gray-900">{incident.qc.name}</div>
                                <div className="text-xs text-gray-600">
                                  {incident.qcAt && format(new Date(incident.qcAt), "dd MMM yyyy", { locale: id })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {format(new Date(incident.occurredAt), "dd MMM yyyy HH:mm", { locale: id })}
                          </td>
                          <td className="px-4 py-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {filteredIncidents.map((incident) => (
                  <Card key={incident.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedIncidents.includes(incident.id)}
                          onChange={(e) => handleIncidentSelect(incident.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Badge className={priorityColors[incident.priority]}>
                          {priorityIcons[incident.priority]} {incident.priority}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">{incident.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(incident.occurredAt), "dd MMM yyyy HH:mm", { locale: id })}
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="h-3 w-3 mr-1" />
                        {incident.reporter.name}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        📍 {incident.location}
                      </div>

                      {incident.qc && (
                        <div className="text-xs text-gray-500">
                          ✅ QC: {incident.qc.name}
                          {incident.qcAt && ` (${format(new Date(incident.qcAt), "dd MMM yyyy", { locale: id })})`}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {approvalAction === "approve" ? "Setujui Incident" : "Tolak Incident"}
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Anda akan {approvalAction === "approve" ? "menyetujui" : "menolak"} {selectedIncidents.length} incident
                </p>
                
                {approvalAction === "reject" && (
                  <div>
                    <Label htmlFor="comment" className="text-sm font-medium">
                      Alasan Penolakan *
                    </Label>
                    <Textarea
                      id="comment"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Masukkan alasan penolakan..."
                      className="mt-1 bg-white"
                      rows={3}
                    />
                  </div>
                )}

                {approvalAction === "approve" && (
                  <div>
                    <Label htmlFor="comment" className="text-sm font-medium">
                      Catatan (Opsional)
                    </Label>
                    <Textarea
                      id="comment"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Tambahkan catatan jika diperlukan..."
                      className="mt-1 bg-white"
                      rows={3}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsApprovalModalOpen(false)}
                  disabled={processingApproval}
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleBulkAction}
                  disabled={processingApproval || (approvalAction === "reject" && !approvalComment.trim())}
                  className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                  variant={approvalAction === "reject" ? "destructive" : "default"}
                >
                  {processingApproval ? "Memproses..." : (approvalAction === "approve" ? "Setujui" : "Tolak")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
