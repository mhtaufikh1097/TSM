import { makeWASocket, DisconnectReason, WAMessage, ConnectionState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/db'
import { useStorageApiAuthState, clearStorageApiAuthState } from './storage-auth-state'

// Database timeout utility - optimized for PostgreSQL
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
    )
  ])
}

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
  private minReconnectDelay = 10000 // Increased to 10 seconds minimum delay
  private reconnectTimer: NodeJS.Timeout | null = null
  private isReconnecting = false
  private qrCodeExpiry = 45000 // QR code expiry time (45 seconds)

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

      console.log('🔌 Initializing WhatsApp connection...')
      const { state, saveCreds } = await useStorageApiAuthState('main')

      this.socket = makeWASocket({
        version: [2, 3000, 1025091846], // Community recommended stable version
        auth: state,
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false, // Disable to reduce load
        markOnlineOnConnect: false, // Don't mark online immediately
        browser: ['TSM Bot', 'Desktop', '1.0.0'], // Simplified browser info
        defaultQueryTimeoutMs: 0, // Set to 0 as recommended
        connectTimeoutMs: 30000, // Reduced timeout
        qrTimeout: 45000, // Reduced QR timeout but still reasonable
        retryRequestDelayMs: 1000, // Increased retry delay
        maxMsgRetryCount: 2, // Reduced retry count
        shouldSyncHistoryMessage: () => false,
        emitOwnEvents: false,
        syncFullHistory: false, // Disable history sync
        getMessage: async (key) => {
          return { conversation: 'Hello' }
        }
      })

      // Set up event listeners
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
      await this.updateSessionStatus(false, undefined, JSON.stringify(error))
      
      // Auto retry with exponential backoff
      this.scheduleReconnect()
      
      throw error
    }
  }

  private async handleConnectionUpdate(update: Partial<ConnectionState & { qr?: string; lastDisconnect?: any }>) {
    try {
      console.log('🔄 Connection update:', JSON.stringify(update, null, 2))
      
      this.connectionState = update.connection || this.connectionState

      if (update.qr) {
        console.log('📱 QR Code received, generating...')
        try {
          this.qrCode = update.qr
          this.qrCodeBase64 = await QRCode.toDataURL(update.qr)
          console.log('✅ QR Code generated successfully')
          await this.updateSessionStatus(false, this.qrCodeBase64, undefined)
          
          // Set a timer to handle QR code expiry
          setTimeout(() => {
            if (!this.isConnected && this.qrCode === update.qr) {
              console.log('⏰ QR Code expired, will wait for new one or connection')
              this.qrCode = null
              this.qrCodeBase64 = null
            }
          }, this.qrCodeExpiry)
          
        } catch (qrError) {
          console.error('❌ Failed to generate QR code:', qrError)
          await this.updateSessionStatus(false, undefined, 'Failed to generate QR code')
        }
      }

      // Handle connection states
      switch (update.connection) {
        case 'open':
          console.log('✅ WhatsApp connection established successfully!')
          this.isConnected = true
          this.reconnectAttempts = 0 // Reset attempts on successful connection
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
          break

        case 'connecting':
          console.log('🔄 Connecting to WhatsApp...')
          this.isConnected = false
          break

        case 'close':
          console.log('❌ WhatsApp connection closed')
          this.isConnected = false
          this.lastDisconnectTime = Date.now()
          
          if (update.lastDisconnect?.error) {
            const boom = update.lastDisconnect.error as Boom
            const statusCode = boom?.output?.statusCode
            const errorMessage = boom?.message || 'Connection error'
            
            console.error('❌ Connection error:', errorMessage, 'Status:', statusCode)
            
            // Handle specific error cases
            if (statusCode === DisconnectReason.loggedOut) {
              console.log('⚠️ Logged out - clearing session')
              await this.clearSession()
              await this.updateSessionStatus(false, undefined, 'Logged out - session cleared')
              return
            }
            
            if (statusCode === DisconnectReason.multideviceMismatch) {
              console.log('⚠️ Multi-device mismatch - clearing session')
              await this.clearSession()
              await this.updateSessionStatus(false, undefined, 'Multi-device mismatch - session cleared')
              return
            }
            
            if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
              console.log('⚠️ Session conflict detected - clearing session and stopping reconnect')
              await this.clearSession()
              await this.updateSessionStatus(false, undefined, 'Session conflict - cleared')
              this.reconnectAttempts = this.maxReconnectAttempts // Stop auto reconnect
              return
            }
            
            // Handle Stream Error 515 specifically
            if (statusCode === 515 || errorMessage.includes('Stream Errored')) {
              console.log('⚠️ Stream Error 515 detected - will restart connection with delay')
              await this.updateSessionStatus(false, undefined, 'Stream Error 515 - restarting')
              // Add longer delay for stream errors
              this.scheduleReconnect(15000) // 15 second delay for stream errors
              return
            }
            
            if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionLost) {
              console.log('⚠️ Connection lost - will attempt reconnection after delay')
              await this.updateSessionStatus(false, undefined, 'Connection lost - reconnecting')
            }
            
            // Auto reconnect if under the limit and not a permanent error
            if (this.reconnectAttempts < this.maxReconnectAttempts && 
                statusCode !== DisconnectReason.loggedOut && 
                statusCode !== DisconnectReason.multideviceMismatch) {
              this.scheduleReconnect()
            } else {
              console.log('❌ Max reconnection attempts reached or permanent error. Manual intervention required.')
              await this.updateSessionStatus(false, undefined, 'Max reconnection attempts reached or permanent error')
            }
          } else {
            // Normal disconnection or QR code timeout - be more patient before reconnecting
            console.log('ℹ️ Normal disconnection detected')
            await this.updateSessionStatus(false, undefined, 'Connection closed normally')
            
            // Only reconnect if we've been disconnected for a while and QR code is not active
            if (this.reconnectAttempts < this.maxReconnectAttempts && !this.qrCode) {
              this.scheduleReconnect()
            } else if (this.qrCode) {
              console.log('📱 QR Code still active, waiting for scan...')
            }
          }
          break

        default:
          console.log(`ℹ️ Connection state: ${update.connection}`)
          break
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
      // Use a simpler, faster query with timeout
      const updateData = {
        isConnected,
        qrCode,
        lastSeen: new Date()
      }

      // Try update first (faster than upsert) with timeout
      const updated = await withTimeout(
        prisma.whatsAppSession.updateMany({
          where: { id: 'main' },
          data: updateData
        }),
        3000 // 3 second timeout
      )

      // If no rows updated, create new record with timeout
      if (updated.count === 0) {
        await withTimeout(
          prisma.whatsAppSession.create({
            data: {
              id: 'main',
              ...updateData
            }
          }),
          3000 // 3 second timeout
        )
      }

      console.log('✅ Session status updated successfully')
    } catch (dbError: any) {
      // Handle specific MySQL timeout errors gracefully
      if (dbError.code === 1969 || 
          dbError.message?.includes('max_statement_time exceeded') ||
          dbError.message?.includes('Database operation timeout')) {
        console.warn('⚠️ Database query timeout - continuing without session update')
        return
      }
      
      // For other errors, just log and continue
      console.error('⚠️ Error updating session status (non-fatal):', {
        error: dbError.message,
        code: dbError.code
      })
    }
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 Attempting to send message to ${phone}:`, message.substring(0, 50) + '...')
      
      // Format phone number for Indonesia
      const formattedPhone = this.formatPhoneNumber(phone)
      console.log(`📱 Formatted phone: ${formattedPhone}`)
      
      // Create message record first with timeout
      const messageRecord = await withTimeout(
        prisma.whatsAppMessage.create({
          data: {
            phone: formattedPhone.replace('@s.whatsapp.net', ''),
            message,
            type: type as any,
            incidentId,
            status: 'PENDING'
          }
        }),
        3000 // 3 second timeout
      )
      
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

  private scheduleReconnect(customDelay?: number) {
    if (this.isReconnecting || this.reconnectTimer) {
      return
    }

    this.isReconnecting = true
    // Use custom delay if provided, otherwise use exponential backoff
    const delay = customDelay || Math.min(
      this.reconnectAttempts === 0 ? this.minReconnectDelay : this.minReconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      60000 // Cap at 60 seconds
    )
    
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
      await withTimeout(
        prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: {
            status: status,
            error: error,
            updatedAt: new Date()
          }
        }),
        3000 // 3 second timeout
      )
    } catch (dbError: any) {
      // Handle timeout gracefully
      if (dbError.code === 1969 || 
          dbError.message?.includes('max_statement_time exceeded') ||
          dbError.message?.includes('Database operation timeout')) {
        console.warn('⚠️ Database timeout updating message status - continuing')
        return
      }
      console.error('Failed to update message status:', dbError)
    }
  }

  private extractPhoneNumber(jid: string): string {
    return jid.split('@')[0]
  }

  async getConnectionStatus() {
    try {
      // Get status from database with timeout
      const sessionRecord = await withTimeout(
        prisma.whatsAppSession.findFirst({
          orderBy: { createdAt: 'desc' }
        }),
        3000 // 3 second timeout
      )

      return {
        isConnected: this.isConnected,
        hasQRCode: !!this.qrCodeBase64,
        qrCode: this.qrCodeBase64, // Return base64 image instead of raw string
        lastConnected: sessionRecord?.lastSeen || null,
        lastError: null, // We'll add error field to schema later if needed
        sessionExists: sessionRecord?.isConnected || false
      }
    } catch (error: any) {
      console.error('Error getting connection status:', {
        error: error.message,
        timeout: error.message?.includes('Database operation timeout')
      })
      return {
        isConnected: this.isConnected, // Use in-memory status as fallback
        hasQRCode: !!this.qrCodeBase64,
        qrCode: this.qrCodeBase64,
        lastConnected: null,
        lastError: 'Database timeout',
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
      
      // Use timeout for all database queries
      const [total, sent, pending, failed, todayCount] = await withTimeout(
        Promise.all([
          prisma.whatsAppMessage.count(),
          prisma.whatsAppMessage.count({ where: { status: 'SENT' } }),
          prisma.whatsAppMessage.count({ where: { status: 'PENDING' } }),
          prisma.whatsAppMessage.count({ where: { status: 'FAILED' } }),
          prisma.whatsAppMessage.count({
            where: {
              createdAt: { gte: today }
            }
          })
        ]),
        5000 // 5 second timeout for multiple queries
      )
      
      return { total, sent, pending, failed, today: todayCount }
    } catch (error: any) {
      console.error('Error getting message stats:', {
        error: error.message,
        timeout: error.message?.includes('Database operation timeout')
      })
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

      // Clear session from storage API
      await clearStorageApiAuthState('main')
      console.log('✅ Session credentials cleared from storage API')

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
}

export const whatsappService = new WhatsAppService()
export { WhatsAppService }
