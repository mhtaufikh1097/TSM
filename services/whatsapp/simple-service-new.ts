// Simple WhatsApp Service - ULTRA MINIMAL
import { 
  getWhatsAppSocket, 
  getCurrentQRCode, 
  isWhatsAppConnected, 
  connectionEvents,
  disconnectWhatsApp,
  restartWhatsAppConnection
} from '@/lib/whatsapp/connection'
import { prisma } from '@/lib/db'

interface ConnectionStatus {
  isConnected: boolean
  hasQRCode: boolean
  qrCode: string | null
  lastConnected: Date | null
  lastError: string | null
  sessionExists: boolean
  storageMode: string
}

class SimpleWhatsAppService {
  private isConnected: boolean = false
  private lastError: string | null = null

  constructor() {
    console.log('🚀 [SIMPLE] WhatsApp Service initialized')
    
    // Listen to connection events
    connectionEvents.on('connectionChange', (connected: boolean) => {
      this.isConnected = Boolean(connected)
      if (connected) {
        this.lastError = null
        console.log(`✅ [SIMPLE] Connected`)
      } else {
        console.log(`❌ [SIMPLE] Disconnected`)
      }
      
      // Update session status
      this.updateSessionStatus(connected)
    })
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 [SIMPLE] Sending to ${phone}`)
      
      // Check connection
      if (!isWhatsAppConnected()) {
        throw new Error('WhatsApp not connected')
      }
      
      // Format phone
      const formattedPhone = this.formatPhoneNumber(phone)
      
      // Create DB record
      const messageRecord = await prisma.whatsAppMessage.create({
        data: {
          phone: formattedPhone.replace('@s.whatsapp.net', ''),
          message,
          type: type as any,
          incidentId,
          status: 'PENDING'
        }
      })

      // Get socket
      const socket = await getWhatsAppSocket()
      
      // Send with timeout
      await Promise.race([
        socket.sendMessage(formattedPhone, { text: message }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      
      // Update status
      await prisma.whatsAppMessage.update({
        where: { id: messageRecord.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      })
      
      console.log(`✅ [SIMPLE] Message sent: ${messageRecord.id}`)
      
      return {
        success: true,
        messageId: messageRecord.id
      }
        
    } catch (error) {
      console.error(`❌ [SIMPLE] Send error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed'
      }
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1)
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned
    }
    
    return cleaned + '@s.whatsapp.net'
  }

  private async updateSessionStatus(isConnected: boolean) {
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: 'main' },
        update: {
          isConnected,
          lastSeen: new Date()
        },
        create: {
          id: 'main',
          isConnected,
          lastSeen: new Date()
        }
      })
    } catch (error) {
      console.error('❌ Session update error:', error)
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const actualConnected = isWhatsAppConnected()
    this.isConnected = Boolean(actualConnected)
    
    const qrCode = getCurrentQRCode()
    
    return {
      isConnected: Boolean(actualConnected),
      hasQRCode: qrCode !== null,
      qrCode: qrCode,
      lastConnected: actualConnected ? new Date() : null,
      lastError: actualConnected ? null : this.lastError,
      sessionExists: true,
      storageMode: 'simple'
    }
  }

  async getQRCode() {
    return getCurrentQRCode()
  }

  async getMessageStats() {
    try {
      const [sent, pending, failed] = await Promise.all([
        prisma.whatsAppMessage.count({ where: { status: 'SENT' } }),
        prisma.whatsAppMessage.count({ where: { status: 'PENDING' } }),
        prisma.whatsAppMessage.count({ where: { status: 'FAILED' } })
      ])

      return {
        totalSent: sent,
        totalFailed: failed,
        totalPending: pending,
        totalDelivered: 0,
        totalRead: 0,
        lastActivity: new Date(),
        queueSize: 0
      }
    } catch (error) {
      return {
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        totalDelivered: 0,
        totalRead: 0,
        lastActivity: new Date(),
        queueSize: 0
      }
    }
  }

  async restartConnection() {
    console.log('🔄 [SIMPLE] Restarting...')
    
    try {
      await restartWhatsAppConnection()
      this.lastError = null
      console.log('✅ [SIMPLE] Restarted')
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Restart failed'
      console.error('❌ [SIMPLE] Restart failed:', error)
      throw error
    }
  }

  async disconnect() {
    console.log('🔌 [SIMPLE] Disconnecting...')
    
    try {
      await disconnectWhatsApp()
      this.isConnected = false
      this.lastError = null
      await this.updateSessionStatus(false)
      console.log('✅ [SIMPLE] Disconnected')
    } catch (error) {
      console.error('❌ [SIMPLE] Disconnect error:', error)
      throw error
    }
  }
}

export { SimpleWhatsAppService }
