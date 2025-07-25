// Simple WhatsApp Service using the new connection approach
import { 
  getWhatsAppSocket, 
  getCurrentQRCode, 
  isWhatsAppConnected, 
  connectionEvents,
  restartWhatsAppConnection,
  disconnectWhatsApp 
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
  private isConnected: boolean = false // Explicitly type as boolean
  private lastError: string | null = null
  private connectionMonitor: NodeJS.Timeout | null = null

  constructor() {
    console.log('🚀 [SIMPLE] Initializing Simple WhatsApp Service')
    
    // Auto-initialize
    setTimeout(() => {
      this.initialize()
    }, 2000)
    
    // Start connection monitor
    this.startConnectionMonitor()
    
    // Listen to connection events
    connectionEvents.on('connectionChange', (connected: boolean) => {
      console.log(`📡 [SIMPLE] Connection event received: ${connected}`)
      this.isConnected = Boolean(connected) // Ensure boolean type
      
      // Clear error when connected
      if (connected) {
        this.lastError = null
      }
      
      // Update database status
      this.updateSessionStatus(connected, null, connected ? null : 'Connection lost')
    })
  }

  private startConnectionMonitor() {
    // Monitor connection status every 15 seconds
    this.connectionMonitor = setInterval(async () => {
      const actualConnected = Boolean(isWhatsAppConnected()) // Ensure boolean type
      
      // Only log and update if status actually changed
      if (actualConnected !== this.isConnected) {
        console.log(`🔄 [SIMPLE] Connection status changed: ${this.isConnected} -> ${actualConnected}`)
        this.isConnected = actualConnected
        
        // Update database
        await this.updateSessionStatus(actualConnected)
      }
    }, 15000)
  }

  async initialize() {
    try {
      console.log('🔌 [SIMPLE] Initializing WhatsApp connection...')
      
      const socket = await getWhatsAppSocket()
      this.isConnected = isWhatsAppConnected()
      this.lastError = null
      
      console.log('✅ [SIMPLE] WhatsApp connection established')
      
      // Update session status
      await this.updateSessionStatus(true, null, null)
      
      return { success: true }
      
    } catch (error) {
      console.error('❌ [SIMPLE] WhatsApp initialization failed:', error)
      this.isConnected = false
      this.lastError = error instanceof Error ? error.message : 'Unknown error'
      
      await this.updateSessionStatus(false, null, this.lastError)
      
      return { success: false, error: this.lastError }
    }
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 [SIMPLE] Sending message to ${phone}:`, message.substring(0, 50) + '...')
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone)
      
      // Create message record
      const messageRecord = await prisma.whatsAppMessage.create({
        data: {
          phone: formattedPhone.replace('@s.whatsapp.net', ''),
          message,
          type: type as any,
          incidentId,
          status: 'PENDING'
        }
      })
      
      if (!this.isConnected) {
        console.log('❌ [SIMPLE] WhatsApp not connected')
        await this.updateMessageStatus(messageRecord.id, 'FAILED', 'WhatsApp not connected')
        return { success: false, error: 'WhatsApp not connected' }
      }

      // Get socket and send message
      const socket = await getWhatsAppSocket()
      
      const waMessage = await socket.sendMessage(formattedPhone, { text: message })
      
      // Update message status
      await this.updateMessageStatus(messageRecord.id, 'SENT')
      
      console.log(`✅ [SIMPLE] Message sent successfully with ID: ${messageRecord.id}`)
      
      return {
        success: true,
        messageId: messageRecord.id
      }

    } catch (error) {
      console.error(`❌ [SIMPLE] Error sending message:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Handle Indonesian phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1)
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned
    }
    
    return cleaned + '@s.whatsapp.net'
  }

  private async updateMessageStatus(messageId: string, status: string, error?: string) {
    try {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          status: status as any,
          error: error || null,
          sentAt: status === 'SENT' ? new Date() : undefined
        }
      })
    } catch (updateError) {
      console.error('❌ [SIMPLE] Error updating message status:', updateError)
    }
  }

  private async updateSessionStatus(isConnected: boolean, qrCode?: string | null, error?: string | null) {
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: 'main' },
        update: {
          isConnected,
          qrCode: qrCode || null,
          lastSeen: new Date()
        },
        create: {
          id: 'main',
          isConnected,
          qrCode: qrCode || null,
          lastSeen: new Date()
        }
      })
      
      console.log(`💾 [SIMPLE] Session updated: connected=${isConnected}`)
    } catch (error) {
      console.error('❌ [SIMPLE] Error updating session status:', error)
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    // Get real-time connection status from Baileys
    const actualConnected = isWhatsAppConnected()
    
    // Always sync with actual status - prioritize real connection state
    this.isConnected = Boolean(actualConnected) // Ensure boolean type
    
    const qrCode = getCurrentQRCode()
    
    const status = {
      isConnected: Boolean(actualConnected), // Ensure boolean type, never undefined
      hasQRCode: qrCode !== null,
      qrCode: qrCode,
      lastConnected: actualConnected ? new Date() : null,
      lastError: actualConnected ? null : this.lastError, // Clear error when connected
      sessionExists: true, // Since we use auth_info_baileys
      storageMode: 'simple-local'
    }
    
    console.log(`📊 [SIMPLE] Connection Status: connected=${status.isConnected}, hasQR=${status.hasQRCode}, error=${status.lastError}`);
    
    return status
  }

  async getQRCode() {
    return getCurrentQRCode()
  }

  async getMessageStats() {
    try {
      const [total, sent, pending, failed] = await Promise.all([
        prisma.whatsAppMessage.count(),
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
      console.error('❌ [SIMPLE] Error getting message stats:', error)
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
    console.log('🔄 [SIMPLE] Restarting WhatsApp connection...')
    
    try {
      // Clean disconnect first
      await disconnectWhatsApp()
      
      this.isConnected = false
      this.lastError = null
      
      // Wait a bit and then restart
      await restartWhatsAppConnection()
      
      return { success: true, message: 'Connection restarted successfully' }
    } catch (error) {
      console.error('❌ [SIMPLE] Error restarting connection:', error)
      this.lastError = error instanceof Error ? error.message : 'Restart failed'
      return { success: false, error: this.lastError }
    }
  }

  async resetAndRestart() {
    console.log('🔄 [SIMPLE] Resetting and restarting WhatsApp connection...')
    return this.restartConnection()
  }

  async clearSessionManually() {
    console.log('🗑️ [SIMPLE] Manual session clearing for simple service')
    
    try {
      // Disconnect cleanly
      await disconnectWhatsApp()
      
      // Clear local session files
      const fs = require('fs').promises
      const path = require('path')
      
      try {
        const authPath = path.join(process.cwd(), 'auth_info_baileys')
        await fs.rmdir(authPath, { recursive: true })
        console.log('🗑️ [SIMPLE] Auth files cleared')
      } catch (fsError) {
        console.log('📁 [SIMPLE] No auth files to clear')
      }
      
      // Reset state
      this.isConnected = false
      this.lastError = null
      
      // Update database
      await this.updateSessionStatus(false, null, 'Session cleared')
      
      return { success: true, message: 'Session cleared successfully. Please scan QR code to reconnect.' }
    } catch (error) {
      console.error('❌ [SIMPLE] Error clearing session:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to clear session' }
    }
  }
}

export { SimpleWhatsAppService }
