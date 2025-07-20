import { prisma } from '@/lib/db'

interface CreateNotificationData {
  userId: string
  type: string
  title: string
  message: string
  incidentId?: string
  data?: any
}

class NotificationService {
  async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          incidentId: data.incidentId,
          data: data.data,
          read: false
        }
      })
      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  async createIncidentSubmittedNotifications(incidentId: string) {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { reporter: true }
      })

      if (!incident) return

      // Get all QC users
      const qcUsers = await prisma.user.findMany({
        where: { role: 'QC' }
      })

      // Create notifications for all QC users
      const notifications = await Promise.all(
        qcUsers.map(qcUser => 
          this.createNotification({
            userId: qcUser.id,
            type: 'QC_REVIEW_REQUIRED',
            title: 'New Incident Requires QC Review',
            message: `Incident "${incident.title}" reported by ${incident.reporter.name} needs your review.`,
            incidentId: incident.id,
            data: {
              priority: incident.priority,
              location: incident.location
            }
          })
        )
      )

      return notifications
    } catch (error) {
      console.error('Failed to create incident submitted notifications:', error)
      throw error
    }
  }

  async createQCReviewNotifications(incidentId: string, approved: boolean, comment?: string) {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { 
          reporter: true,
          qc: true 
        }
      })

      if (!incident) return

      const notifications: any[] = []

      if (approved) {
        // Get all PM users for approval notifications
        const pmUsers = await prisma.user.findMany({
          where: { role: 'PM' }
        })

        // Create notifications for PM users
        const pmNotifications = await Promise.all(
          pmUsers.map(pmUser => 
            this.createNotification({
              userId: pmUser.id,
              type: 'PM_REVIEW_REQUIRED',
              title: 'Incident Approved by QC - PM Review Required',
              message: `Incident "${incident.title}" has been approved by QC and needs PM review.`,
              incidentId: incident.id,
              data: {
                qcName: incident.qc?.name,
                qcComment: comment,
                priority: incident.priority
              }
            })
          )
        )
        notifications.push(...pmNotifications)
      }

      // Notify reporter about QC decision
      const reporterNotification = await this.createNotification({
        userId: incident.reporterId,
        type: approved ? 'QC_APPROVED' : 'QC_REJECTED',
        title: `Incident ${approved ? 'Approved' : 'Rejected'} by QC`,
        message: `Your incident "${incident.title}" has been ${approved ? 'approved' : 'rejected'} by QC.${comment ? ` Comment: ${comment}` : ''}`,
        incidentId: incident.id,
        data: {
          qcName: incident.qc?.name,
          qcComment: comment,
          approved
        }
      })
      notifications.push(reporterNotification)

      return notifications
    } catch (error) {
      console.error('Failed to create QC review notifications:', error)
      throw error
    }
  }

  async createPMReviewNotifications(incidentId: string, approved: boolean, comment?: string) {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { 
          reporter: true,
          qc: true,
          pm: true 
        }
      })

      if (!incident) return

      const notifications: any[] = []

      // Notify reporter about PM decision
      const reporterNotification = await this.createNotification({
        userId: incident.reporterId,
        type: approved ? 'PM_APPROVED' : 'PM_REJECTED',
        title: `Incident ${approved ? 'Approved' : 'Rejected'} by PM`,
        message: `Your incident "${incident.title}" has been ${approved ? 'approved' : 'rejected'} by PM.${comment ? ` Comment: ${comment}` : ''}`,
        incidentId: incident.id,
        data: {
          pmName: incident.pm?.name,
          pmComment: comment,
          approved
        }
      })
      notifications.push(reporterNotification)

      // Notify QC about PM decision
      if (incident.qcId) {
        const qcNotification = await this.createNotification({
          userId: incident.qcId,
          type: approved ? 'PM_APPROVED' : 'PM_REJECTED',
          title: `Incident ${approved ? 'Approved' : 'Rejected'} by PM`,
          message: `Incident "${incident.title}" that you reviewed has been ${approved ? 'approved' : 'rejected'} by PM.`,
          incidentId: incident.id,
          data: {
            pmName: incident.pm?.name,
            pmComment: comment,
            approved
          }
        })
        notifications.push(qcNotification)
      }

      return notifications
    } catch (error) {
      console.error('Failed to create PM review notifications:', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()
