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
  private isConnected: boolean = false
  private lastError: string | null = null

  constructor() {
    console.log('🚀 [SIMPLE] Initializing Simple WhatsApp Service')
    
    // Simplified initialization - no auto-init, just listen to events
    connectionEvents.on('connectionChange', (connected: boolean) => {
      console.log(`📡 [SIMPLE] Connection event: ${connected}`)
      this.isConnected = Boolean(connected)
      
      if (connected) {
        this.lastError = null
        console.log(`✅ [SIMPLE] Connected`)
      } else {
        console.log(`❌ [SIMPLE] Disconnected`)
      }
      
      // Update database status
      this.updateSessionStatus(connected)
    })
    
    // AUTO-INITIALIZE on startup to ensure connection is ready for notifications
    setTimeout(() => {
      console.log('🔄 [SIMPLE] Auto-initializing WhatsApp connection...')
      this.initialize().catch(error => {
        console.log('🔍 [SIMPLE] Auto-init failed, will retry:', error.message)
        // Retry after 5 seconds
        setTimeout(() => {
          this.initialize().catch(retryError => {
            console.log('❌ [SIMPLE] Auto-init retry failed:', retryError.message)
          })
        }, 5000)
      })
    }, 2000) // Initialize after 2 seconds - enough time for server to fully start
  }

  private async updateSessionStatus(isConnected: boolean, qrCode?: string | null) {
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

  async initialize() {
    try {
      console.log('🔌 [SIMPLE] Initializing...')
      
      // Try to get socket with timeout handling
      try {
        const socket = await getWhatsAppSocket()
        this.isConnected = isWhatsAppConnected()
        this.lastError = null
        
        console.log('✅ [SIMPLE] Connected')
        await this.updateSessionStatus(true)
        
        return { success: true }
      } catch (socketError) {
        // Check if it's just a timeout but QR is available
        const qrCode = getCurrentQRCode()
        if (qrCode && socketError instanceof Error && socketError.message.includes('timeout')) {
          console.log('⏳ [SIMPLE] Connection timeout but QR available - waiting for scan')
          this.lastError = 'Waiting for QR scan'
          await this.updateSessionStatus(false, qrCode)
          return { success: false, error: 'Waiting for QR scan', qrAvailable: true }
        }
        throw socketError
      }
      
    } catch (error) {
      console.error('❌ [SIMPLE] Init failed:', error)
      this.isConnected = false
      this.lastError = error instanceof Error ? error.message : 'Init failed'
      
      // Check if QR is available even on error
      const qrCode = getCurrentQRCode()
      await this.updateSessionStatus(false, qrCode)
      
      return { 
        success: false, 
        error: this.lastError,
        qrAvailable: qrCode !== null
      }
    }
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 [SIMPLE] Sending to ${phone}`)
      
      // Enhanced connection check with auto-initialize fallback
      if (!isWhatsAppConnected()) {
        console.log('🔧 [SIMPLE] WhatsApp not connected, attempting to initialize...')
        
        try {
          await this.initialize()
          // Wait a moment for connection to establish
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          if (!isWhatsAppConnected()) {
            const qrCode = getCurrentQRCode()
            if (qrCode) {
              return { 
                success: false, 
                error: 'WhatsApp not connected - QR code available for scanning' 
              }
            } else {
              return { 
                success: false, 
                error: 'WhatsApp not connected - please initialize connection first' 
              }
            }
          }
        } catch (initError) {
          console.error('❌ [SIMPLE] Auto-initialize failed:', initError)
          return { 
            success: false, 
            error: 'WhatsApp not connected - initialization failed' 
          }
        }
      }
      
      console.log('✅ [SIMPLE] WhatsApp connection verified')
      
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

      try {
        // Get socket and send
        const socket = await getWhatsAppSocket()
        
        // Send with timeout
        await Promise.race([
          socket.sendMessage(formattedPhone, { text: message }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Send timeout')), 10000)
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
      } catch (sendError) {
        // Update failed status
        await prisma.whatsAppMessage.update({
          where: { id: messageRecord.id },
          data: {
            status: 'FAILED',
            error: sendError instanceof Error ? sendError.message : 'Send failed'
          }
        })
        
        throw sendError
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
      storageMode: 'simple-local'
    }
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
      await this.updateSessionStatus(false, null)
      
      return { success: true, message: 'Session cleared successfully. Please scan QR code to reconnect.' }
    } catch (error) {
      console.error('❌ [SIMPLE] Error clearing session:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to clear session' }
    }
  }
}

export default SimpleWhatsAppService
export { SimpleWhatsAppService }
