export type Role = 'ADMIN' | 'REPORTER' | 'QC' | 'PM'
export type Status = 'PENDING_QC' | 'APPROVED_QC' | 'REJECTED_QC' | 'PENDING_PM' | 'APPROVED_PM' | 'REJECTED_PM'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export interface Incident {
  id: string
  title: string
  description: string
  location: string
  occurredAt: Date
  status: Status
  priority: Priority
  reporter: User
  qc?: User
  pm?: User
  qcAt?: Date
  pmAt?: Date
  qcComment?: string
  pmComment?: string
  attachments: IncidentAttachment[]
  createdAt: Date
  updatedAt: Date
}

export interface IncidentAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
}

export interface WhatsAppMessage {
  to: string
  message: string
  type: 'text' | 'image' | 'document'
}
