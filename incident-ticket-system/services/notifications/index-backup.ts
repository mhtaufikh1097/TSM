import { whatsappService } from '@/services/whatsapp'
import { prisma } from '@/lib/db'
import { customNotificationTemplates } from '@/utils/notification-templates'
import { generateIncidentToken } from '@/lib/tokens'

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
Status: Incident memerlukan revisi
ID: #${data.incident.id.substring(0, 8)}`
  },

  PM_APPROVED: {
    type: 'PM_APPROVED',
    title: 'Incident Disetujui PM - Final Approval',
    template: (data) => `🎉 *FINAL APPROVAL - PM*

📋 *Incident:* ${data.incident.title}
👤 *PM:* ${data.pm.name}
⏰ *Waktu Approval:* ${data.reviewedAt}

${data.comment ? `💬 *Catatan PM:*\n${data.comment}\n\n` : ''}✅ Status: APPROVED - Incident akan segera ditindaklanjuti
📞 Tim lapangan akan menghubungi Anda segera

ID: #${data.incident.id.substring(0, 8)}`
  },

  PM_REJECTED: {
    type: 'PM_REJECTED',
    title: 'Incident Ditolak PM',
    template: (data) => `❌ *PM REJECTED*

📋 *Incident:* ${data.incident.title}
👤 *PM:* ${data.pm.name}
⏰ *Waktu Review:* ${data.reviewedAt}

❗ *Alasan Penolakan:*
${data.comment}

Status: Incident tidak dapat dilanjutkan
ID: #${data.incident.id.substring(0, 8)}`
  },

  SYSTEM_NOTIFICATION: {
    type: 'SYSTEM_NOTIFICATION',
    title: 'Notifikasi Sistem',
    template: (data) => data.message
  }
}

export class NotificationService {
  
  // Send incident submitted notification to QC users with custom template
  async notifyIncidentSubmitted(incidentId: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: true
        }
      })

      if (!incident) {
        console.error('Incident not found:', incidentId)
        return
      }

      // Get all QC users with phone numbers
      const qcUsers = await prisma.user.findMany({
        where: { 
          role: 'QC',
          phone: { not: null }
        }
      })

      const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://tsm-system.wika.co.id'

      // Send notifications to all QC users using custom template
      for (const qcUser of qcUsers) {
        if (qcUser.phone) {
          const token = generateIncidentToken(incidentId, 'qc', qcUser.id)
          const message = customNotificationTemplates.qcReview(incident, baseUrl, token)
          
          await whatsappService.sendMessage(
            qcUser.phone,
            message,
            'INCIDENT_SUBMITTED',
            incidentId
          )
        }
      }

      console.log(`Incident submitted notifications sent to ${qcUsers.length} QC users for incident ${incidentId}`)
    } catch (error) {
      console.error('Error sending incident submitted notification:', error)
    }
  }

  // Send QC approval/rejection notification with custom template
  async notifyQCDecision(incidentId: string, approved: boolean, qcId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: true,
          qc: true
        }
      })

      if (!incident || !incident.qc) {
        console.error('Incident or QC not found:', incidentId)
        return
      }

      // Use custom template based on approval status
      const message = approved 
        ? customNotificationTemplates.qcApproved(incident, comment)
        : customNotificationTemplates.qcRejected(incident, comment)

      const templateKey = approved ? 'QC_APPROVED' : 'QC_REJECTED'

      // Notify reporter
      if (incident.reporter.phone) {
        await whatsappService.sendMessage(
          incident.reporter.phone,
          message,
          templateKey,
          incidentId
        )
      }

      // If approved, notify PM users with PM review template
      if (approved) {
        const pmUsers = await prisma.user.findMany({
          where: { 
            role: 'PM',
            phone: { not: null }
          }
        })

        const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://tsm-system.wika.co.id'

        for (const pmUser of pmUsers) {
          if (pmUser.phone) {
            const token = generateIncidentToken(incidentId, 'pm', pmUser.id)
            const pmMessage = customNotificationTemplates.pmReview(incident, baseUrl, token)
            
            await whatsappService.sendMessage(
              pmUser.phone,
              pmMessage,
              'PM_REVIEW_REQUIRED',
              incidentId
            )
          }
        }
      }

      console.log(`QC decision notifications sent for incident ${incidentId}`)
    } catch (error) {
      console.error('Error sending QC decision notification:', error)
    }
  }

  // Send PM approval/rejection notification with custom template
  async notifyPMDecision(incidentId: string, approved: boolean, pmId: string, comment?: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          reporter: true,
          qc: true,
          pm: true
        }
      })

      if (!incident || !incident.pm) {
        console.error('Incident or PM not found:', incidentId)
        return
      }

      // Use custom template based on approval status
      const message = approved 
        ? customNotificationTemplates.pmApproved(incident, comment)
        : customNotificationTemplates.pmRejected(incident, comment)

      const templateKey = approved ? 'PM_APPROVED' : 'PM_REJECTED'

      // Notify reporter
      if (incident.reporter.phone) {
        await whatsappService.sendMessage(
          incident.reporter.phone,
          message,
          templateKey,
          incidentId
        )
      }

      // Notify QC
      if (incident.qc?.phone) {
        await whatsappService.sendMessage(
          incident.qc.phone,
          message,
          templateKey,
          incidentId
        )
      }

      console.log(`PM decision notifications sent for incident ${incidentId}`)
    } catch (error) {
      console.error('Error sending PM decision notification:', error)
    }
  }

  // Send custom system notification
  async sendSystemNotification(phone: string, message: string): Promise<void> {
    try {
      await whatsappService.sendMessage(
        phone,
        message,
        'SYSTEM_NOTIFICATION'
      )
    } catch (error) {
      console.error('Error sending system notification:', error)
    }
  }

  // Send bulk notification to multiple users
  async sendBulkNotification(phones: string[], message: string, type: string = 'SYSTEM_NOTIFICATION'): Promise<Array<{ phone: string; success: boolean; error?: string }>> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = []
    
    for (const phone of phones) {
      try {
        await whatsappService.sendMessage(phone, message, type)
        results.push({ phone, success: true })
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error sending notification to ${phone}:`, error)
        results.push({ 
          phone, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }

  // Get notification statistics
  async getNotificationStats(): Promise<{
    total: number
    today: number
    byType: Record<string, number>
    recentFailures: number
  }> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [total, todayCount, byType, failedToday] = await Promise.all([
        prisma.whatsAppMessage.count(),
        prisma.whatsAppMessage.count({
          where: { createdAt: { gte: today } }
        }),
        prisma.whatsAppMessage.groupBy({
          by: ['type'],
          _count: { type: true }
        }),
        prisma.whatsAppMessage.count({
          where: {
            status: 'FAILED',
            createdAt: { gte: today }
          }
        })
      ])

      const typeStats = byType.reduce((acc, item) => {
        acc[item.type] = item._count.type
        return acc
      }, {} as Record<string, number>)

      return {
        total,
        today: todayCount,
        byType: typeStats,
        recentFailures: failedToday
      }
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return { total: 0, today: 0, byType: {}, recentFailures: 0 }
    }
  }

  private getPriorityLabel(priority: string): string {
    const labels = {
      LOW: '🟢 Low',
      MEDIUM: '🟡 Medium',
      HIGH: '🟠 High',
      CRITICAL: '🔴 Critical'
    }
    return labels[priority as keyof typeof labels] || priority
  }
}

export const notificationService = new NotificationService()
