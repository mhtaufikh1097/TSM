// Dynamic import to prevent auto-instantiation conflict
// import { whatsappService } from '@/services/whatsapp'
import { prisma } from '@/lib/db'
import { customNotificationTemplates } from '@/utils/notification-templates'
import { generateIncidentToken } from '@/lib/tokens'

// Helper function to get whatsappService dynamically
async function getWhatsAppService() {
  const { whatsappService } = await import('@/services/whatsapp')
  return whatsappService
}

export interface NotificationTemplate {
  type: string
  title: string
  template: (data: any) => string
}

export const messageTemplates: Record<string, NotificationTemplate> = {
  INCIDENT_SUBMITTED: {
    type: 'INCIDENT_SUBMITTED',
    title: 'Incident Baru Dilaporkan',
    template: (data) => `🚨 *INCIDENT BARU*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Judul:* ${data.incident.title}
👤 *Reporter:* ${data.incident.reporter.name}
📍 *Lokasi:* ${data.incident.location}
🔥 *Prioritas:* ${data.incident.priority}
⏰ *Waktu Kejadian:* ${data.incident.occurredAt}

📝 *Deskripsi:*
${data.incident.description}

Status: Menunggu review QC`
  },

  QC_APPROVED: {
    type: 'QC_APPROVED',
    title: 'Incident Disetujui QC',
    template: (data) => `✅ *QC APPROVED*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *QC:* ${data.qc.name}
⏰ *Waktu Review:* ${data.reviewedAt}

${data.comment ? `💬 *Catatan QC:*\n${data.comment}\n\n` : ''}Status: Diteruskan ke PM untuk approval final`
  },

  QC_REJECTED: {
    type: 'QC_REJECTED',
    title: 'Incident Ditolak QC',
    template: (data) => `❌ *QC REJECTED*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *QC:* ${data.qc.name}
⏰ *Waktu Review:* ${data.reviewedAt}

❗ *Alasan Penolakan:*
${data.comment}

Status: Incident ditolak oleh QC`
  },

  QC_ON_HOLD: {
    type: 'QC_ON_HOLD',
    title: 'Incident Ditangguhkan QC',
    template: (data) => `⏸️ *QC ON HOLD*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *QC:* ${data.qc.name}
⏰ *Waktu Review:* ${data.reviewedAt}

⏸️ *Catatan:*
${data.comment}

Status: Incident ditangguhkan sementara`
  },

  PM_APPROVED: {
    type: 'PM_APPROVED',
    title: 'Incident Disetujui PM',
    template: (data) => `✅ *PM APPROVED*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *PM:* ${data.pm.name}
⏰ *Waktu Approval:* ${data.reviewedAt}

${data.comment ? `💬 *Catatan PM:*\n${data.comment}\n\n` : ''}Status: Incident telah disetujui PM dan siap dilaksanakan`
  },

  PM_REJECTED: {
    type: 'PM_REJECTED',
    title: 'Incident Ditolak PM',
    template: (data) => `❌ *PM REJECTED*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *PM:* ${data.pm.name}
⏰ *Waktu Review:* ${data.reviewedAt}

❗ *Alasan Penolakan:*
${data.comment}

Status: Incident ditolak oleh PM`
  },

  PM_ON_HOLD: {
    type: 'PM_ON_HOLD',
    title: 'Incident Ditangguhkan PM',
    template: (data) => `⏸️ *PM ON HOLD*

🎫 *Ticket ID:* ${data.incident.ticketId}
📋 *Incident:* ${data.incident.title}
👤 *PM:* ${data.pm.name}
⏰ *Waktu Review:* ${data.reviewedAt}

⏸️ *Catatan:*
${data.comment}

Status: Incident ditangguhkan oleh PM`
  }
}

export class NotificationService {
  // Notify QC team when new incident is submitted
  async notifyIncidentSubmitted(incidentId: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: {
            select: { id: true, name: true, email: true, phone: true }
          }
        }
      })

      if (!incident) {
        throw new Error('Incident not found')
      }

      // Get all QC and ADMIN users
      const qcUsers = await prisma.user.findMany({
        where: {
          role: { in: ['QC', 'ADMIN'] }
        },
        select: { id: true, name: true, email: true, phone: true }
      })

      // Send WhatsApp notifications to QC team
      for (const qcUser of qcUsers) {
        if (qcUser.phone) {
          const message = messageTemplates.INCIDENT_SUBMITTED.template({
            incident,
            qc: qcUser
          })

          // Generate token for QC review
          const token = generateIncidentToken(incidentId, 'qc', qcUser.id)
          const reviewUrl = `${process.env.NEXTAUTH_URL}/incidents/detail/${incidentId}?token=${token}&role=qc`
          
          const fullMessage = `${message}

🔗 *Klik untuk review:*
${reviewUrl}`

          const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(qcUser.phone, fullMessage)
        }
      }

    } catch (error) {
      console.error('Error sending incident submission notifications:', error)
    }
  }

  // Notify PM team when QC approves incident
  async notifyQCDecision(incidentId: string, approved: boolean, qcId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: { select: { id: true, name: true, email: true, phone: true } },
          qc: { select: { id: true, name: true, email: true, phone: true } }
        }
      })

      if (!incident || !incident.qc) {
        throw new Error('Incident or QC not found')
      }

      const templateType = approved ? 'QC_APPROVED' : 'QC_REJECTED'
      const template = messageTemplates[templateType]

      if (approved) {
        // Notify PM team for approval
        const pmUsers = await prisma.user.findMany({
          where: { role: { in: ['PM', 'ADMIN'] } },
          select: { id: true, name: true, email: true, phone: true }
        })

        for (const pmUser of pmUsers) {
          if (pmUser.phone) {
            const message = template.template({
              incident,
              qc: incident.qc,
              comment,
              reviewedAt: new Date().toLocaleString('id-ID')
            })

            // Generate token for PM review
            const token = generateIncidentToken(incidentId, 'pm', pmUser.id)
            const reviewUrl = `${process.env.NEXTAUTH_URL}/incidents/detail/${incidentId}?token=${token}&role=pm`
            
            const fullMessage = `${message}

🔗 *Klik untuk review PM:*
${reviewUrl}`

            const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(pmUser.phone, fullMessage)
          }
        }
      } else {
        // Notify reporter that incident was rejected by QC
        if (incident.reporter.phone) {
          const message = template.template({
            incident,
            qc: incident.qc,
            comment,
            reviewedAt: new Date().toLocaleString('id-ID')
          })

          const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(incident.reporter.phone, message)
        }
      }

    } catch (error) {
      console.error('Error sending QC decision notifications:', error)
    }
  }

  // Notify when QC puts incident on hold
  async notifyQCOnHold(incidentId: string, qcId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: { select: { id: true, name: true, email: true, phone: true } },
          qc: { select: { id: true, name: true, email: true, phone: true } }
        }
      })

      if (!incident || !incident.qc) {
        throw new Error('Incident or QC not found')
      }

      const template = messageTemplates.QC_ON_HOLD

      // Notify reporter
      if (incident.reporter.phone) {
        const message = template.template({
          incident,
          qc: incident.qc,
          comment,
          reviewedAt: new Date().toLocaleString('id-ID')
        })

        const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(incident.reporter.phone, message)
      }

    } catch (error) {
      console.error('Error sending QC on hold notifications:', error)
    }
  }

  // Notify when PM makes final decision
  async notifyPMDecision(incidentId: string, approved: boolean, pmId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: { select: { id: true, name: true, email: true, phone: true } },
          qc: { select: { id: true, name: true, email: true, phone: true } },
          pm: { select: { id: true, name: true, email: true, phone: true } }
        }
      })

      if (!incident || !incident.pm) {
        throw new Error('Incident or PM not found')
      }

      const templateType = approved ? 'PM_APPROVED' : 'PM_REJECTED'
      const template = messageTemplates[templateType]

      // Notify reporter about final decision
      if (incident.reporter.phone) {
        const message = template.template({
          incident,
          pm: incident.pm,
          comment,
          reviewedAt: new Date().toLocaleString('id-ID')
        })

        const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(incident.reporter.phone, message)
      }

      // Notify QC about PM decision
      if (incident.qc?.phone) {
        const message = template.template({
          incident,
          pm: incident.pm,
          comment,
          reviewedAt: new Date().toLocaleString('id-ID')
        })

        const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(incident.qc.phone, message)
      }

    } catch (error) {
      console.error('Error sending PM decision notifications:', error)
    }
  }

  // Notify when PM puts incident on hold
  async notifyPMOnHold(incidentId: string, pmId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: { select: { id: true, name: true, email: true, phone: true } },
          qc: { select: { id: true, name: true, email: true, phone: true } },
          pm: { select: { id: true, name: true, email: true, phone: true } }
        }
      })

      if (!incident || !incident.pm) {
        throw new Error('Incident or PM not found')
      }

      const template = messageTemplates.PM_ON_HOLD

      // Notify reporter and QC
      const recipients = [incident.reporter, incident.qc].filter(user => user?.phone)

      for (const recipient of recipients) {
        if (recipient?.phone) {
          const message = template.template({
            incident,
            pm: incident.pm,
            comment,
            reviewedAt: new Date().toLocaleString('id-ID')
          })

          const whatsappService = await getWhatsAppService(); await whatsappService.sendMessage(recipient.phone, message)
        }
      }

    } catch (error) {
      console.error('Error sending PM on hold notifications:', error)
    }
  }
}

export const notificationService = new NotificationService()
