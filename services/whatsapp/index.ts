import { makeWASocket, DisconnectReason, WAMessage, ConnectionState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import { prisma } from '@/lib/db'
import { useGistAuthState, clearGistAuthState } from './gist-auth-state'
import { Incident } from '@prisma/client'

interface QueuedMessage {
  id: string
  phone: string
  message: string
  type: string
  incidentId?: string
  retryCount: number
  maxRetries: number
  timestamp: Date
}

class WhatsAppService {
  private socket: any = null
  private isConnected = false
  private qrCode: string | null = null
  private qrCodeBase64: string | null = null
  private messageQueue: QueuedMessage[] = []
  private processingQueue = false
  private isInitializing = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private connectionState: string = 'close'
  private lastDisconnectTime = 0
  private minReconnectDelay = 15000 // Increased to 15 seconds minimum delay
  private reconnectTimer: NodeJS.Timeout | null = null
  private isReconnecting = false
  private qrCodeExpiry = 120000 // QR code expiry time (2 minutes)

  constructor() {
    // Auto-initialize on service startup
    this.autoInitialize()
  }

  private async autoInitialize() {
    try {
      console.log('🚀 WhatsApp Service starting auto-initialization...')
      // Add longer delay to ensure database is ready and prevent conflicts
      setTimeout(() => {
        this.initialize().catch(error => {
          console.error('❌ Auto-initialization failed:', error)
          // Don't retry auto-initialization if it fails
        })
      }, 5000) // Increased delay
    } catch (error) {
      console.error('❌ Auto-initialization setup failed:', error)
    }
  }

  async initialize() {
    try {
      // Prevent multiple initialization attempts
      if (this.isInitializing || this.isReconnecting) {
        console.log('⏳ WhatsApp initialization already in progress...')
        return null
      }

      this.isInitializing = true

      // Clear any existing reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      // Check if we've exceeded max reconnection attempts
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ Max reconnection attempts reached. Clearing session...')
        await this.clearSession()
        this.reconnectAttempts = 0 // Reset after clearing session
      }

      // Close existing socket if any
      if (this.socket) {
        try {
          console.log('🔌 Closing existing socket...')
          // Remove all event listeners first
          this.socket.ev.removeAllListeners('connection.update')
          this.socket.ev.removeAllListeners('creds.update')
          this.socket.ev.removeAllListeners('messages.upsert')
          
          // Check if socket exists and has a valid connection
          if (this.socket.ws && this.socket.ws.readyState === 1) { // Only end if connection is open
            await this.socket.end()
          } else if (this.socket.end) {
            // Force close even if state is unclear
            this.socket.end()
          }
          await new Promise(resolve => setTimeout(resolve, 3000)) // Wait longer for cleanup
        } catch (error) {
          console.log('Error closing existing socket:', error)
        }
        this.socket = null
      }

      // Use GitHub Gist-based auth state instead of database
      console.log('🔌 Initializing WhatsApp connection with GitHub Gist auth state...')
      const { state, saveCreds } = await useGistAuthState()

        this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false, // Disable to reduce load
        markOnlineOnConnect: false, // Don't mark online immediately
        browser: ['Ubuntu', 'Chrome', '20.0.04'], // Updated to latest compatible browser version
        defaultQueryTimeoutMs: 60000, // Increased timeout to 60 seconds
        connectTimeoutMs: 60000, // Increased timeout to 60 seconds
        qrTimeout: 120000, // Increased QR timeout to 2 minutes
        retryRequestDelayMs: 2000, // Increased retry delay
        maxMsgRetryCount: 3, // Increased retry count
        shouldSyncHistoryMessage: () => false,
        emitOwnEvents: false,
        syncFullHistory: false, // Disable history sync
        getMessage: async (key) => {
          return { conversation: 'Hello' }
        }
      })      // Set up event listeners
      this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
      this.socket.ev.on('creds.update', saveCreds)
      this.socket.ev.on('messages.upsert', this.handleIncomingMessages.bind(this))

      // Start message queue processor
      this.startQueueProcessor()

      this.isInitializing = false
      return this.socket
    } catch (error) {
      console.error('WhatsApp initialization error:', error)
      this.isInitializing = false
      this.reconnectAttempts++
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Handle specific initialization errors
      if (errorMessage.includes('crypto') || 
          errorMessage.includes('cipher') || 
          errorMessage.includes('Buffer') || 
          errorMessage.includes('TypedArray') ||
          errorMessage.includes('validation')) {
        console.log('🔧 Crypto/Buffer error during initialization - clearing session')
        await this.clearSession()
        this.reconnectAttempts = 0 // Reset attempts after clearing
      }
      
      await this.updateSessionStatus(false, undefined, JSON.stringify(error))
      
      // Auto retry with exponential backoff
      this.scheduleReconnect()
      
      throw error
    }
  }

  private async handleConnectionUpdate(update: Partial<ConnectionState & { qr?: string; lastDisconnect?: any }>) {
    try {
      const { connection, lastDisconnect, qr } = update
      
      console.log('🔄 WhatsApp connection update:', {
        connection,
        lastDisconnect: lastDisconnect?.error?.output?.statusCode,
        hasQR: !!qr,
        errorMessage: lastDisconnect?.error?.message
      })
      
      this.connectionState = connection || this.connectionState

      if (qr) {
        console.log('📱 QR Code received, generating...')
        try {
          this.qrCode = qr
          this.qrCodeBase64 = await QRCode.toDataURL(qr)
          console.log('✅ QR Code generated successfully')
          console.log('⏰ QR Code akan expired dalam 2 menit, silakan scan segera')
          await this.updateSessionStatus(false, this.qrCodeBase64, undefined)
          
          // Set a timer to handle QR code expiry with better feedback
          setTimeout(() => {
            if (!this.isConnected && this.qrCode === qr) {
              console.log('⏰ QR Code expired setelah 2 menit, menunggu QR code baru...')
              this.qrCode = null
              this.qrCodeBase64 = null
              // Update status to show QR expired
              this.updateSessionStatus(false, null, 'QR Code expired, tunggu QR code baru')
            }
          }, this.qrCodeExpiry)
          
        } catch (qrError) {
          console.error('❌ Failed to generate QR code:', qrError)
          await this.updateSessionStatus(false, undefined, 'Failed to generate QR code')
        }
      }

      // Handle connection states
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const errorMessage = lastDisconnect?.error?.message || ''
        
        console.log('❌ WhatsApp connection closed:', {
          statusCode,
          errorMessage,
          reason: lastDisconnect?.error?.output?.payload?.error
        })
        
        this.isConnected = false
        this.lastDisconnectTime = Date.now()
        
        // Handle different disconnect reasons
        let shouldReconnect = false
        let clearSession = false
        
        switch (statusCode) {
          case DisconnectReason.badSession:
            console.log('🔒 WhatsApp: Bad session, clearing credentials')
            clearSession = true
            shouldReconnect = false
            break
            
          case DisconnectReason.connectionClosed:
            console.log('🔌 WhatsApp: Connection closed, will try to reconnect')
            shouldReconnect = true
            break
            
          case DisconnectReason.connectionLost:
            console.log('📡 WhatsApp: Connection lost, will try to reconnect')
            shouldReconnect = true
            break
            
          case DisconnectReason.connectionReplaced:
            console.log('🔄 WhatsApp: Connection replaced, stopping this instance')
            shouldReconnect = false
            clearSession = true
            break
            
          case DisconnectReason.loggedOut:
            console.log('👋 WhatsApp: Logged out, clearing session')
            clearSession = true
            shouldReconnect = false
            break
            
          case DisconnectReason.restartRequired:
            console.log('🔄 WhatsApp: Restart required, will reconnect')
            shouldReconnect = true
            break
            
          case DisconnectReason.timedOut:
            console.log('⏰ WhatsApp: Connection timed out, will retry')
            shouldReconnect = true
            break

          case DisconnectReason.multideviceMismatch:
            console.log('📱 WhatsApp: Multi-device mismatch, clearing session')
            clearSession = true
            shouldReconnect = false
            break
            
          default:
            // Check for specific error patterns
            if (statusCode === 515 || errorMessage.includes('Stream Errored')) {
              console.log('⚠️ WhatsApp: Stream Error 515 detected - server issue, will retry with longer delay')
              shouldReconnect = true
              this.minReconnectDelay = Math.max(this.minReconnectDelay, 30000) // Minimum 30 seconds for stream errors
            } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
              console.log('🚫 WhatsApp: 401 Unauthorized error, clearing session')
              clearSession = true
              shouldReconnect = false
            } else if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
              console.log('⚠️ WhatsApp: Session conflict detected, clearing session')
              clearSession = true
              shouldReconnect = false
            } else if (errorMessage.includes('The "data" argument must be of type string') || 
                      errorMessage.includes('Buffer, TypedArray, or DataView')) {
              console.log('🔧 WhatsApp: Crypto/Buffer error detected - clearing session to fix corruption')
              clearSession = true
              shouldReconnect = false
            } else if (errorMessage.includes('crypto') || errorMessage.includes('cipher')) {
              console.log('🔐 WhatsApp: Cryptographic error detected - clearing session')
              clearSession = true
              shouldReconnect = false
            } else if (errorMessage.includes('validation') || errorMessage.includes('validating connection')) {
              console.log('🔍 WhatsApp: Connection validation failed - clearing session')
              clearSession = true
              shouldReconnect = false
            } else {
              console.log('❓ WhatsApp: Unknown disconnect reason, will try to reconnect')
              shouldReconnect = true
            }
            break
        }
        
        // Clear session if needed
        if (clearSession) {
          console.log('🗑️ WhatsApp: Clearing session...')
          await this.clearSession()
          await this.updateSessionStatus(false, undefined, 'Session cleared - requires new QR scan')
        } else if (!shouldReconnect) {
          await this.updateSessionStatus(false, undefined, 'Connection stopped')
        }
        
        // Auto-reconnect if appropriate
        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('🔄 WhatsApp: Attempting to reconnect in 5 seconds...')
          await this.updateSessionStatus(false, undefined, 'Reconnecting...')
          this.scheduleReconnect()
        } else if (shouldReconnect) {
          console.log('❌ Max reconnection attempts reached. Manual intervention required.')
          await this.updateSessionStatus(false, undefined, 'Max reconnection attempts reached')
        }
        
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!')
        this.isConnected = true
        this.reconnectAttempts = 0 // Reset attempts on successful connection
        this.minReconnectDelay = 15000 // Reset to normal delay after successful connection
        this.qrCode = null
        this.qrCodeBase64 = null
        this.lastDisconnectTime = 0
        
        // Clear any pending reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        this.isReconnecting = false
        
        await this.updateSessionStatus(true, undefined, undefined)
        await this.processMessageQueue()
        
      } else if (connection === 'connecting') {
        console.log('🔄 Connecting to WhatsApp...')
        this.isConnected = false
        await this.updateSessionStatus(false, undefined, 'Connecting...')
      } else {
        console.log(`ℹ️ Connection state: ${connection}`)
      }
      
    } catch (error) {
      console.error('❌ Error handling connection update:', error)
      await this.updateSessionStatus(false, undefined, `Connection update error: ${error}`)
    }
  }

  private async handleIncomingMessages(messageUpsert: any) {
    const { messages } = messageUpsert
    
    for (const message of messages) {
      if (message.key.fromMe) continue // Skip messages sent by us
      
      try {
        await this.processIncomingMessage(message)
      } catch (error) {
        console.error('Error processing incoming message:', error)
      }
    }
  }

  private async processIncomingMessage(message: WAMessage) {
    const phoneNumber = this.extractPhoneNumber(message.key.remoteJid || '')
    const messageText = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || ''
    
    // Log incoming message
    console.log(`Incoming message from ${phoneNumber}: ${messageText}`)
    
    // Here you can add webhook functionality or auto-responders
    // For now, we'll just log it
    
    // Example: Auto-respond to status inquiries
    if (messageText.toLowerCase().includes('status')) {
      await this.sendMessage(phoneNumber, 
        '🤖 Untuk melihat status incident Anda, silakan akses portal incident management kami.\n\n' +
        'Jika memerlukan bantuan, hubungi administrator sistem.'
      )
    }
  }

  private async updateSessionStatus(isConnected: boolean, qrCode?: string | null, error?: string) {
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: 'main' },
        create: {
          id: 'main',
          isConnected,
          qrCode,
          lastSeen: new Date()
        },
        update: {
          isConnected,
          qrCode,
          lastSeen: new Date()
        }
      })
    } catch (error) {
      console.error('Error updating session status:', error)
    }
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 Attempting to send message to ${phone}:`, message.substring(0, 50) + '...')
      
      // Format phone number for Indonesia
      const formattedPhone = this.formatPhoneNumber(phone)
      console.log(`📱 Formatted phone: ${formattedPhone}`)
      
      // Create message record first
      const messageRecord = await prisma.whatsAppMessage.create({
        data: {
          phone: formattedPhone.replace('@s.whatsapp.net', ''),
          message,
          type: type as any,
          incidentId,
          status: 'PENDING'
        }
      })
      
      console.log(`📝 Message record created with ID: ${messageRecord.id}`)

      if (!this.isConnected || !this.socket) {
        console.log('❌ WhatsApp not connected, adding to queue...')
        // Add to queue if not connected
        return this.addToQueue(phone, message, type, incidentId, messageRecord.id)
      }

      // Check if phone number exists on WhatsApp
      try {
        const [result] = await this.socket.onWhatsApp(formattedPhone.replace('@s.whatsapp.net', ''))
        if (!result.exists) {
          console.log(`❌ Phone number ${phone} does not exist on WhatsApp`)
          await this.updateMessageStatus(messageRecord.id, 'FAILED', 'Phone number not on WhatsApp')
          return { success: false, error: 'Phone number not on WhatsApp' }
        }
        console.log(`✅ Phone number ${phone} exists on WhatsApp`)
      } catch (checkError) {
        console.warn('⚠️ Could not verify phone number, proceeding anyway:', checkError)
      }

      try {
        console.log(`🚀 Sending message via WhatsApp to ${formattedPhone}...`)
        
        // Send message with retry
        const result = await this.socket.sendMessage(formattedPhone, {
          text: message
        })
        
        console.log(`✅ Message sent successfully!`, result)
        
        // Update message status
        await prisma.whatsAppMessage.update({
          where: { id: messageRecord.id },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        })
        
        console.log(`✅ Message sent to ${phone}: ${message.substring(0, 100)}...`)
        return { success: true, messageId: messageRecord.id }
        
      } catch (sendError) {
        console.error('❌ Failed to send message:', sendError)
        
        // Update message with error
        await prisma.whatsAppMessage.update({
          where: { id: messageRecord.id },
          data: {
            status: 'FAILED',
            error: sendError instanceof Error ? sendError.message : 'Unknown error'
          }
        })
        
        // Add to queue for retry
        return this.addToQueue(phone, message, type, incidentId, messageRecord.id)
      }
      
    } catch (error) {
      console.error('❌ Error in sendMessage:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async addToQueue(phone: string, message: string, type: string, incidentId?: string, messageId?: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      let messageRecord;
      
      if (messageId) {
        // Use existing message record
        messageRecord = { id: messageId }
      } else {
        // Create new message record
        messageRecord = await prisma.whatsAppMessage.create({
          data: {
            phone: this.formatPhoneNumber(phone).replace('@s.whatsapp.net', ''),
            message,
            type: type as any,
            incidentId,
            status: 'PENDING'
          }
        })
      }

      this.messageQueue.push({
        id: messageRecord.id,
        phone,
        message,
        type,
        incidentId,
        retryCount: 0,
        maxRetries: 3,
        timestamp: new Date()
      })

      console.log(`📋 Message queued for ${phone} (ID: ${messageRecord.id})`)
      return { success: true, messageId: messageRecord.id }
      
    } catch (error) {
      console.error('❌ Error adding message to queue:', error)
      return { success: false }
    }
  }

  private async startQueueProcessor() {
    setInterval(async () => {
      if (!this.processingQueue && this.messageQueue.length > 0 && this.isConnected) {
        await this.processMessageQueue()
      }
    }, 5000) // Check every 5 seconds
  }

  private async processMessageQueue() {
    if (this.processingQueue || !this.isConnected || this.messageQueue.length === 0) {
      return
    }
    
    console.log(`📤 Processing ${this.messageQueue.length} queued messages...`)
    this.processingQueue = true
    
    try {
      const messagesToProcess = [...this.messageQueue]
      this.messageQueue = []
      
      for (const queuedMessage of messagesToProcess) {
        try {
          console.log(`📩 Processing queued message ${queuedMessage.id} to ${queuedMessage.phone}`)
          
          if (!this.socket || !this.isConnected) {
            console.log('❌ Connection lost during queue processing, re-queuing message')
            this.messageQueue.push(queuedMessage)
            continue
          }

          const formattedPhone = this.formatPhoneNumber(queuedMessage.phone)
          
          // Send the message directly
          const result = await this.socket.sendMessage(formattedPhone, {
            text: queuedMessage.message
          })
          
          console.log(`✅ Queued message sent successfully to ${queuedMessage.phone}`)
          
          // Update message status to sent
          await prisma.whatsAppMessage.update({
            where: { id: queuedMessage.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              retryCount: queuedMessage.retryCount
            }
          })
          
        } catch (error) {
          console.error(`❌ Error sending queued message ${queuedMessage.id}:`, error)
          
          // Retry logic
          queuedMessage.retryCount++
          if (queuedMessage.retryCount < queuedMessage.maxRetries) {
            console.log(`🔄 Retrying message ${queuedMessage.id} (${queuedMessage.retryCount}/${queuedMessage.maxRetries})`)
            this.messageQueue.push(queuedMessage)
          } else {
            console.log(`❌ Message ${queuedMessage.id} failed permanently after ${queuedMessage.retryCount} retries`)
            // Mark as failed after max retries
            await prisma.whatsAppMessage.update({
              where: { id: queuedMessage.id },
              data: {
                status: 'FAILED',
                error: JSON.stringify(error),
                retryCount: queuedMessage.retryCount
              }
            })
          }
        }
        
        // Add delay between messages to avoid rate limiting
        await this.delay(1000)
      }
      
      console.log(`✅ Queue processing completed. Remaining: ${this.messageQueue.length}`)
    } finally {
      this.processingQueue = false
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')
    
    console.log(`🔧 Formatting phone: ${phone} -> ${cleaned}`)
    
    // Handle different Indonesian phone number formats
    if (cleaned.startsWith('0')) {
      // Replace leading 0 with 62
      cleaned = '62' + cleaned.substring(1)
    } else if (cleaned.startsWith('8')) {
      // Add 62 for numbers starting with 8
      cleaned = '62' + cleaned
    } else if (!cleaned.startsWith('62')) {
      // Add 62 if no country code
      cleaned = '62' + cleaned
    }
    
    const formatted = cleaned + '@s.whatsapp.net'
    console.log(`✅ Final formatted phone: ${formatted}`)
    
    return formatted
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private scheduleReconnect() {
    if (this.isReconnecting || this.reconnectTimer) {
      return
    }

    this.isReconnecting = true
    // Exponential backoff with longer delays
    const baseDelay = this.reconnectAttempts === 0 ? this.minReconnectDelay : this.minReconnectDelay * Math.pow(1.5, this.reconnectAttempts)
    const delay = Math.min(baseDelay, 60000) // Cap at 60 seconds
    
    console.log(`🔄 Scheduling reconnect in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(async () => {
      this.isReconnecting = false
      this.reconnectTimer = null
      
      if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnected) {
        try {
          console.log(`🔄 Attempting reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
          await this.initialize()
        } catch (error) {
          console.error('Scheduled reconnect failed:', error)
        }
      }
    }, delay)
  }

  private async updateMessageStatus(messageId: string, status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED', error?: string): Promise<void> {
    try {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          status: status,
          error: error,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to update message status:', error)
    }
  }

  private extractPhoneNumber(jid: string): string {
    return jid.split('@')[0]
  }

  async getConnectionStatus() {
    try {
      // Get status from database
      const sessionRecord = await prisma.whatsAppSession.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      return {
        isConnected: this.isConnected,
        hasQRCode: !!this.qrCodeBase64,
        qrCode: this.qrCodeBase64, // Return base64 image instead of raw string
        lastConnected: sessionRecord?.lastSeen || null,
        lastError: null, // We'll add error field to schema later if needed
        sessionExists: sessionRecord?.isConnected || false
      }
    } catch (error) {
      console.error('Error getting connection status:', error)
      return {
        isConnected: false,
        hasQRCode: false,
        qrCode: null,
        lastConnected: null,
        lastError: 'Failed to get status',
        sessionExists: false
      }
    }
  }

  async getQRCode(): Promise<string | null> {
    return this.qrCode
  }

  async getMessageStats(): Promise<{
    total: number
    sent: number
    pending: number
    failed: number
    today: number
  }> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const [total, sent, pending, failed, todayCount] = await Promise.all([
        prisma.whatsAppMessage.count(),
        prisma.whatsAppMessage.count({ where: { status: 'SENT' } }),
        prisma.whatsAppMessage.count({ where: { status: 'PENDING' } }),
        prisma.whatsAppMessage.count({ where: { status: 'FAILED' } }),
        prisma.whatsAppMessage.count({
          where: {
            createdAt: { gte: today }
          }
        })
      ])
      
      return { total, sent, pending, failed, today: todayCount }
    } catch (error) {
      console.error('Error getting message stats:', error)
      return { total: 0, sent: 0, pending: 0, failed: 0, today: 0 }
    }
  }

  async retryFailedMessages(): Promise<number> {
    try {
      const failedMessages = await prisma.whatsAppMessage.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: 3 }
        }
      })
      
      for (const message of failedMessages) {
        this.messageQueue.push({
          id: message.id,
          phone: message.phone,
          message: message.message,
          type: message.type,
          incidentId: message.incidentId || undefined,
          retryCount: message.retryCount,
          maxRetries: message.maxRetries,
          timestamp: new Date()
        })
      }
      
      return failedMessages.length
    } catch (error) {
      console.error('Error retrying failed messages:', error)
      return 0
    }
  }

  private async clearSession() {
    try {
      console.log('🗑️ Clearing WhatsApp session...')
      
      // Close current connection
      if (this.socket) {
        try {
          await this.socket.end()
        } catch (error) {
          console.log('Error closing socket:', error)
        }
        this.socket = null
      }

      this.isConnected = false
      this.qrCode = null
      this.qrCodeBase64 = null
      this.reconnectAttempts = 0

      // Clear session data from GitHub Gist instead of database
      await clearGistAuthState()
      console.log('✅ Session data cleared from GitHub Gist')

      await this.updateSessionStatus(false, undefined, 'Session cleared')
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }

  // Public method to clear session manually (for admin interface)
  async clearSessionManually() {
    await this.clearSession()
    console.log('✅ Session cleared manually by admin')
  }

  async restartConnection() {
    try {
      console.log('🔄 Restarting WhatsApp connection...')
      
      // Stop any pending reconnections
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      this.isReconnecting = false
      this.reconnectAttempts = 0
      
      // Close current connection
      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners()
          this.socket.end()
        } catch (error) {
          console.log('Error closing socket during restart:', error)
        }
        this.socket = null
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Reinitialize
      await this.initialize()
    } catch (error) {
      console.error('❌ Error restarting connection:', error)
      throw error
    }
  }

  // Enhanced method to completely reset and restart
  async resetAndRestart() {
    try {
      console.log('🔄 Resetting and restarting WhatsApp connection...')
      
      // Clear session first
      await this.clearSession()
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Reset all states
      this.reconnectAttempts = 0
      this.isReconnecting = false
      
      // Restart
      await this.initialize()
    } catch (error) {
      console.error('❌ Error resetting and restarting:', error)
      throw error
    }
  }

  // Force refresh QR code if taking too long
  async forceRefreshQR() {
    try {
      console.log('🔄 Force refreshing QR code...')
      
      if (this.socket && !this.isConnected) {
        // Close current socket
        await this.socket.end()
        this.socket = null
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Reinitialize to get new QR
        await this.initialize()
        
        console.log('✅ QR code refresh completed')
        return { success: true, message: 'QR code refreshed' }
      } else {
        console.log('⚠️ Cannot refresh - either no socket or already connected')
        return { success: false, message: 'Cannot refresh QR code in current state' }
      }
    } catch (error) {
      console.error('❌ Error refreshing QR code:', error)
      return { success: false, message: 'Failed to refresh QR code', error: String(error) }
    }
  }

  // Get connection diagnostics
  getConnectionDiagnostics() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      isInitializing: this.isInitializing,
      isReconnecting: this.isReconnecting,
      hasQRCode: !!this.qrCode,
      lastDisconnectTime: this.lastDisconnectTime,
      socketExists: !!this.socket,
      queueLength: this.messageQueue.length,
      processingQueue: this.processingQueue,
      minReconnectDelay: this.minReconnectDelay,
      maxReconnectAttempts: this.maxReconnectAttempts,
      qrCodeExpiry: this.qrCodeExpiry
    }
  }

  // Handle Stream Error 515 specifically
  async handleStreamError515() {
    try {
      console.log('🔧 Handling Stream Error 515 - implementing recovery strategy...')
      
      // Clear current session to force fresh authentication
      await this.clearSession()
      
      // Wait longer before retry due to server-side issue
      console.log('⏳ Waiting 60 seconds before attempting recovery...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      
      // Set longer reconnect delay for this session
      this.minReconnectDelay = 45000 // 45 seconds minimum
      
      // Reset attempts and start fresh
      this.reconnectAttempts = 0
      
      // Initialize new connection
      await this.initialize()
      
      console.log('✅ Stream Error 515 recovery attempt completed')
      return { success: true, message: 'Recovery attempt completed' }
      
    } catch (error) {
      console.error('❌ Failed to handle Stream Error 515:', error)
      return { success: false, message: 'Recovery failed', error: String(error) }
    }
  }

  // Try different browser configurations for compatibility
  async tryDifferentBrowserVersions() {
    const browserConfigs: [string, string, string][] = [
      ['Ubuntu', 'Chrome', '20.0.04'],
      ['Windows', 'Chrome', '116.0.0.0'],
      ['macOS', 'Safari', '16.6'],
      ['Chrome (Linux)', '', ''],
      ['WIKA TSM Desktop', '', ''],
      ['Ubuntu', 'Firefox', '118.0']
    ]

    for (let i = 0; i < browserConfigs.length; i++) {
      const browser = browserConfigs[i]
      console.log(`🔧 Trying browser config ${i + 1}/${browserConfigs.length}: ${browser.join(' ')}`)
      
      try {
        // Clear session first
        await this.clearSession()
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Initialize with new browser config
        const { state, saveCreds } = await useGistAuthState()
        
        this.socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          generateHighQualityLinkPreview: false,
          markOnlineOnConnect: false,
          browser: browser,
          defaultQueryTimeoutMs: 60000,
          connectTimeoutMs: 60000,
          qrTimeout: 120000,
          retryRequestDelayMs: 2000,
          maxMsgRetryCount: 3,
          shouldSyncHistoryMessage: () => false,
          emitOwnEvents: false,
          syncFullHistory: false,
          getMessage: async (key) => {
            return { conversation: 'Hello' }
          }
        })

        // Set up event listeners
        this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
        this.socket.ev.on('creds.update', saveCreds)
        this.socket.ev.on('messages.upsert', this.handleIncomingMessages.bind(this))

        // Wait for connection or QR
        await new Promise(resolve => setTimeout(resolve, 10000))
        
        if (this.isConnected || this.qrCodeBase64) {
          console.log(`✅ Browser config works: ${browser.join(' ')}`)
          return { success: true, browser: browser }
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.log(`❌ Browser config failed: ${browser.join(' ')} - ${errorMessage}`)
      }
    }
    
    return { success: false, message: 'All browser configurations failed' }
  }
}

export const whatsappService = new WhatsAppService()
