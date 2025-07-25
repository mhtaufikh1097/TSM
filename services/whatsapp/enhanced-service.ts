// Enhanced WhatsApp Service based on official Baileys example
// Implements latest Baileys features with improved connection handling

import { Boom } from '@hapi/boom'
import makeWASocket, { 
  AnyMessageContent, 
  delay, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore, 
  useMultiFileAuthState,
  WAMessageContent, 
  WAMessageKey,
  ConnectionState,
  WASocket,
  proto
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import P from 'pino'
import { prisma } from '@/lib/db'

// Enhanced logging with better configuration
const logger = P({
  level: 'info', // Changed from 'trace' to 'info' for better performance
  timestamp: () => `,"time":"${new Date().toJSON()}"`
}, P.destination('./logs/whatsapp.log'))

// Database timeout utility
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
  attempts: number
  maxAttempts: number
  timestamp: Date
}

interface ConnectionStatus {
  isConnected: boolean
  hasQRCode: boolean
  qrCode: string | null
  lastConnected: Date | null
  lastError: string | null
  sessionExists: boolean
  storageMode: string
}

class EnhancedWhatsAppService {
  private socket: WASocket | null = null
  private isConnected = false
  private qrCode: string | null = null
  private qrCodeBase64: string | null = null
  private connectionState = 'close'
  private messageQueue: QueuedMessage[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private minReconnectDelay = 10000
  private reconnectTimer: NodeJS.Timeout | null = null
  private isReconnecting = false
  private lastDisconnectTime = 0
  private sessionPath = './whatsapp_session'
  private isInitializing = false

  // Circuit breaker properties
  private consecutiveErrors = 0
  private maxConsecutiveErrors = 5
  private circuitBreakerOpenUntil = 0
  private circuitBreakerTimeout = 300000 // 5 minutes
  private minConnectInterval = 8000
  private lastConnectAttempt = 0
  private qrCodeExpiry = 45000 // 45 seconds

  // Message retry cache (from official example) - enhanced implementation
  private msgRetryCounterCache = {
    get: <T>(key: string): T | undefined => {
      return this.retryMap.get(key) as T | undefined
    },
    set: <T>(key: string, value: T) => {
      this.retryMap.set(key, value as any)
    },
    del: (key: string) => {
      this.retryMap.delete(key)
    },
    flushAll: () => {
      this.retryMap.clear()
    }
  }
  private retryMap = new Map<string, any>()

  constructor() {
    console.log('🏗️  [ENHANCED] Initializing Enhanced WhatsApp Service')
    console.log(`📁 [ENHANCED] Session path: ${this.sessionPath}`)
    
    // Ensure directories exist
    this.ensureDirectories()
    
    // Auto-initialize with longer delay for better stability
    setTimeout(() => {
      this.autoInitialize()
    }, 5000) // Increased from 3 seconds to 5 seconds
  }

  private ensureDirectories() {
    try {
      // Create session directory
      if (!fs.existsSync(this.sessionPath)) {
        fs.mkdirSync(this.sessionPath, { recursive: true })
        console.log(`📁 [ENHANCED] Created session directory: ${this.sessionPath}`)
      }
      
      // Create logs directory
      const logsDir = './logs'
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
        console.log(`📁 [ENHANCED] Created logs directory: ${logsDir}`)
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error creating directories:', error)
    }
  }

  private async autoInitialize() {
    try {
      console.log('🔄 [ENHANCED] Auto-initializing Enhanced WhatsApp service...')
      await this.initialize()
    } catch (error) {
      console.error('❌ [ENHANCED] Auto-initialization failed:', error)
    }
  }

  async initialize() {
    try {
      console.log('🔌 [ENHANCED] Initializing Enhanced WhatsApp connection...')
      
      // Prevent multiple initialization attempts
      if (this.isInitializing || this.isReconnecting) {
        console.log('⏳ [ENHANCED] Initialization already in progress...')
        return { success: false, error: 'Initialization in progress' }
      }

      this.isInitializing = true

      // Check circuit breaker
      if (Date.now() < this.circuitBreakerOpenUntil) {
        const waitTime = Math.ceil((this.circuitBreakerOpenUntil - Date.now()) / 1000)
        console.log(`⏸️  [ENHANCED] Circuit breaker open, waiting ${waitTime}s before retry`)
        this.isInitializing = false
        return { success: false, error: `Circuit breaker open, retry in ${waitTime}s` }
      }

      // Rate limiting
      const timeSinceLastAttempt = Date.now() - this.lastConnectAttempt
      if (timeSinceLastAttempt < this.minConnectInterval) {
        const waitTime = Math.ceil((this.minConnectInterval - timeSinceLastAttempt) / 1000)
        console.log(`⏳ [ENHANCED] Rate limiting, waiting ${waitTime}s before connection attempt`)
        this.isInitializing = false
        return { success: false, error: `Rate limited, retry in ${waitTime}s` }
      }

      this.lastConnectAttempt = Date.now()

      // Close existing socket
      if (this.socket) {
        try {
          console.log('🔌 [ENHANCED] Closing existing socket...')
          this.socket.ev.removeAllListeners('connection.update')
          this.socket.ev.removeAllListeners('creds.update')
          this.socket.ev.removeAllListeners('messages.upsert')
          this.socket.ev.removeAllListeners('messages.update')
          this.socket.ev.removeAllListeners('message-receipt.update')
          this.socket.ev.removeAllListeners('presence.update')
          this.socket.ev.removeAllListeners('chats.update')
          this.socket.ev.removeAllListeners('contacts.update')
          this.socket.ev.removeAllListeners('call')
          
          if (this.socket.ws && (this.socket.ws as any).readyState === 1) {
            await this.socket.end(undefined)
          }
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.log('⚠️ [ENHANCED] Error closing existing socket:', error)
        }
        this.socket = null
      }

      // Use official Baileys approach with latest features
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath)
      // Use specific version recommended by wppconnect community
      const version = [2, 3000, 1025091846] as [number, number, number]
      
      console.log(`📱 [ENHANCED] Using WA v${version.join('.')} (Community recommended stable version)`)

      // Create socket with enhanced configuration (based on official example)
      this.socket = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          // Caching makes the store faster to send/recv messages (from official example)
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache: this.msgRetryCounterCache,
        generateHighQualityLinkPreview: false, // Disabled for better performance
        browser: ['TSM Enhanced Bot', 'Desktop', '1.0.0'],
        defaultQueryTimeoutMs: 0, // Set to 0 as recommended
        connectTimeoutMs: 60000, // Increased timeout
        qrTimeout: 60000, // Increased QR timeout
        retryRequestDelayMs: 2000, // Increased retry delay
        maxMsgRetryCount: 3, // Increased retry count
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: (jid) => {
          // Ignore broadcast messages for better performance
          return jid.endsWith('@broadcast')
        },
        markOnlineOnConnect: false,
        fireInitQueries: true,
        emitOwnEvents: false,
        syncFullHistory: false,
        getMessage: this.getMessage.bind(this)
      })

      // Use official Baileys event processing approach
      this.socket.ev.process(async (events) => {
        await this.processEvents(events, saveCreds)
      })

      // Start message queue processor
      this.startQueueProcessor()

      console.log('✅ [ENHANCED] Enhanced WhatsApp service initialized successfully')
      this.isInitializing = false
      return { success: true }

    } catch (error) {
      console.error('❌ [ENHANCED] Enhanced WhatsApp initialization failed:', error)
      this.consecutiveErrors++
      this.isInitializing = false
      
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.circuitBreakerOpenUntil = Date.now() + this.circuitBreakerTimeout
        console.log(`🔒 [ENHANCED] Circuit breaker activated for ${this.circuitBreakerTimeout / 1000}s`)
      }

      await this.updateSessionStatus(false, undefined, error instanceof Error ? error.message : 'Initialization failed')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Official Baileys event processing approach
  private async processEvents(events: any, saveCreds: () => Promise<void>) {
    try {
      // Connection updates (enhanced from official example)
      if (events['connection.update']) {
        await this.handleConnectionUpdate(events['connection.update'])
      }

      // Credentials updated -- save them (from official example)
      if (events['creds.update']) {
        await saveCreds()
      }

      // Enhanced message handling (from official example)
      if (events['messages.upsert']) {
        await this.handleMessagesUpsert(events['messages.upsert'])
      }

      // Message updates (delivery, read receipts, etc.)
      if (events['messages.update']) {
        await this.handleMessagesUpdate(events['messages.update'])
      }

      // Message receipts
      if (events['message-receipt.update']) {
        console.log('📨 [ENHANCED] Message receipt update:', events['message-receipt.update'])
      }

      // Presence updates
      if (events['presence.update']) {
        console.log('👤 [ENHANCED] Presence update:', events['presence.update'])
      }

      // Chat updates
      if (events['chats.update']) {
        console.log('💬 [ENHANCED] Chat update:', events['chats.update'])
      }

      // Contact updates (enhanced from official example)
      if (events['contacts.update']) {
        for (const contact of events['contacts.update']) {
          if (typeof contact.imgUrl !== 'undefined') {
            const newUrl = contact.imgUrl === null
              ? null
              : await this.socket!.profilePictureUrl(contact.id!).catch(() => null)
            console.log(`👤 [ENHANCED] Contact ${contact.id} has new profile pic: ${newUrl}`)
          }
        }
      }

      // Call events
      if (events.call) {
        console.log('📞 [ENHANCED] Call event:', events.call)
      }

    } catch (error) {
      console.error('❌ [ENHANCED] Error processing events:', error)
    }
  }

  private async handleConnectionUpdate(update: Partial<ConnectionState & { qr?: string; lastDisconnect?: any }>) {
    try {
      console.log('🔄 [ENHANCED] Connection update:', JSON.stringify(update, null, 2))
      
      this.connectionState = update.connection || this.connectionState

      if (update.qr) {
        console.log('📱 [ENHANCED] QR Code received, generating...')
        try {
          this.qrCode = update.qr
          this.qrCodeBase64 = await QRCode.toDataURL(update.qr, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
          console.log('✅ [ENHANCED] QR Code generated successfully')
          await this.updateSessionStatus(false, this.qrCodeBase64, undefined)
          
          // Set QR expiry timer
          setTimeout(() => {
            if (!this.isConnected && this.qrCode === update.qr) {
              console.log('⏰ [ENHANCED] QR Code expired')
              this.qrCode = null
              this.qrCodeBase64 = null
            }
          }, this.qrCodeExpiry)
          
        } catch (qrError) {
          console.error('❌ [ENHANCED] Failed to generate QR code:', qrError)
          await this.updateSessionStatus(false, undefined, 'Failed to generate QR code')
        }
      }

      // Enhanced connection state handling
      switch (update.connection) {
        case 'open':
          console.log('✅ [ENHANCED] WhatsApp connection established successfully!')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.consecutiveErrors = 0 // Reset on successful connection
          this.qrCode = null
          this.qrCodeBase64 = null
          this.lastDisconnectTime = 0
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
          }
          this.isReconnecting = false
          
          await this.updateSessionStatus(true, undefined, undefined)
          await this.processMessageQueue()
          break

        case 'connecting':
          console.log('🔄 [ENHANCED] Connecting to WhatsApp...')
          this.isConnected = false
          break

        case 'close':
          console.log('❌ [ENHANCED] WhatsApp connection closed')
          this.isConnected = false
          this.lastDisconnectTime = Date.now()
          
          if (update.lastDisconnect?.error) {
            const boom = update.lastDisconnect.error as Boom
            const statusCode = boom?.output?.statusCode
            const errorMessage = boom?.message || 'Connection error'
            
            console.error('❌ [ENHANCED] Connection error:', errorMessage, 'Status:', statusCode)
            
            // Enhanced error handling based on official example
            if (statusCode === DisconnectReason.loggedOut) {
              console.log('⚠️ [ENHANCED] Logged out - clearing session')
              await this.clearSession()
              await this.updateSessionStatus(false, undefined, 'Logged out - session cleared')
              return
            }
            
            if (statusCode === DisconnectReason.multideviceMismatch) {
              console.log('⚠️ [ENHANCED] Multi-device mismatch - clearing session')
              await this.clearSession()
              await this.updateSessionStatus(false, undefined, 'Multi-device mismatch - session cleared')
              return
            }
            
            // Enhanced conflict detection and Stream Error handling
            if (errorMessage.includes('conflict') || 
                errorMessage.includes('replaced') || 
                statusCode === 440 ||
                statusCode === 515 ||
                errorMessage.includes('Stream Errored')) {
              console.log('⚠️ [ENHANCED] Session conflict or stream error detected')
              
              if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer)
                this.reconnectTimer = null
              }
              
              // For stream errors, don't clear session immediately
              if (statusCode === 515 || errorMessage.includes('Stream Errored')) {
                console.log('🔄 [ENHANCED] Stream error - waiting before reconnect')
                this.scheduleReconnect(15000) // Wait 15 seconds for stream errors
                await this.updateSessionStatus(false, undefined, 'Stream error - reconnecting')
                return
              }
              
              // For conflicts, clear session
              await this.clearSession()
              this.consecutiveErrors++
              
              if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                this.circuitBreakerOpenUntil = Date.now() + this.circuitBreakerTimeout
                console.log(`🔒 [ENHANCED] Circuit breaker activated after ${this.consecutiveErrors} consecutive errors`)
                await this.updateSessionStatus(false, undefined, 'Circuit breaker activated - too many conflicts')
                return
              }
              
              this.scheduleReconnect(30000) // Wait 30 seconds after conflict
              await this.updateSessionStatus(false, undefined, 'Session conflict - reconnecting')
              return
            }
            
            await this.updateSessionStatus(false, undefined, errorMessage)
          }
          
          // Reconnect if not logged out (from official example approach)
          if ((update.lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
            this.scheduleReconnect()
          } else {
            console.log('❌ [ENHANCED] Connection closed. You are logged out.')
          }
          break
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error handling connection update:', error)
    }
  }

  // Enhanced message handling based on official example
  private async handleMessagesUpsert(upsert: any) {
    try {
      // Reduced logging for better performance
      console.log('📨 [ENHANCED] Received messages, type:', upsert.type, 'count:', upsert.messages?.length || 0)

      if (!!upsert.requestId) {
        console.log("📱 [ENHANCED] Placeholder message received for request id:", upsert.requestId)
      }

      if (upsert.type === 'notify') {
        for (const msg of upsert.messages) {
          if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
            
            // Handle special commands (from official example)
            if (text === "requestPlaceholder" && !upsert.requestId && this.socket) {
              try {
                const messageId = await this.socket.requestPlaceholderResend(msg.key)
                console.log('🔄 [ENHANCED] Requested placeholder resync, id=', messageId)
              } catch (error) {
                console.error('❌ [ENHANCED] Error requesting placeholder resync:', error)
              }
            }

            if (text === "onDemandHistSync" && this.socket) {
              try {
                const messageId = await this.socket.fetchMessageHistory(50, msg.key, msg.messageTimestamp!)
                console.log('📚 [ENHANCED] Requested on-demand sync, id=', messageId)
              } catch (error) {
                console.error('❌ [ENHANCED] Error requesting history sync:', error)
              }
            }

            // Process incoming message
            if (!msg.key.fromMe) {
              await this.processIncomingMessage(msg)
              
              // Mark as read (enhanced feature) - with error handling
              if (this.socket && this.isConnected) {
                try {
                  await this.socket.readMessages([msg.key])
                } catch (error) {
                  console.error('❌ [ENHANCED] Error marking message as read:', error)
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error handling messages upsert:', error)
    }
  }

  private async handleMessagesUpdate(updates: any[]) {
    try {
      // Reduced logging for better performance
      if (updates.length > 0) {
        console.log('📝 [ENHANCED] Message updates count:', updates.length)
      }

      for (const { key, update } of updates) {
        // Handle poll updates (from official example)
        if (update.pollUpdates) {
          console.log('🗳️ [ENHANCED] Poll update received for message:', key.id)
          // Here you could implement poll handling logic
        }

        // Handle message status updates (delivered, read, etc.)
        if (update.status) {
          await this.handleMessageStatusUpdate(key, update.status)
        }
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error handling message updates:', error)
    }
  }

  private async handleMessageStatusUpdate(key: WAMessageKey, status: number) {
    try {
      // Map WhatsApp status to our database status
      let dbStatus: string
      switch (status) {
        case 1: dbStatus = 'SENT'; break
        case 2: dbStatus = 'DELIVERED'; break
        case 3: dbStatus = 'READ'; break
        default: dbStatus = 'PENDING'; break
      }

      // Update message status in database if we have the message
      const messageId = key.id
      if (messageId) {
        await withTimeout(
          prisma.whatsAppMessage.updateMany({
            where: { 
              // We'll need to store message ID in our database for proper tracking
              id: messageId 
            },
            data: {
              status: dbStatus as any,
              updatedAt: new Date()
            }
          }),
          3000
        )
        console.log(`📊 [ENHANCED] Updated message ${messageId} status to ${dbStatus}`)
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error updating message status:', error)
    }
  }

  // Enhanced message retrieval (from official example)
  private async getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
    try {
      // Return a proper proto message as per official example
      return proto.Message.fromObject({ 
        conversation: 'Hello from TSM Bot' 
      })
    } catch (error) {
      console.error('❌ [ENHANCED] Error getting message:', error)
      return undefined
    }
  }

  // Enhanced message sending with typing indicator (from official example)
  private async sendMessageWithTyping(msg: AnyMessageContent, jid: string) {
    try {
      if (!this.socket) {
        throw new Error('Socket not available')
      }

      await this.socket.presenceSubscribe(jid)
      await delay(500)

      await this.socket.sendPresenceUpdate('composing', jid)
      await delay(2000)

      await this.socket.sendPresenceUpdate('paused', jid)

      return await this.socket.sendMessage(jid, msg)
    } catch (error) {
      console.error('❌ [ENHANCED] Error sending message with typing:', error)
      throw error
    }
  }

  async sendMessage(phone: string, message: string, type: string = 'SYSTEM_NOTIFICATION', incidentId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📤 [ENHANCED] Attempting to send message to ${phone}:`, message.substring(0, 50) + '...')
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone)
      console.log(`📱 [ENHANCED] Formatted phone: ${formattedPhone}`)
      
      // Create message record first
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
        3000
      )
      
      console.log(`📝 [ENHANCED] Message record created with ID: ${messageRecord.id}`)
      
      if (!this.isConnected || !this.socket) {
        console.log('❌ [ENHANCED] WhatsApp not connected, adding to queue...')
        return this.addToQueue(phone, message, type, incidentId, messageRecord.id)
      }

      // Check if phone number exists on WhatsApp
      try {
        const results = await this.socket.onWhatsApp(formattedPhone.replace('@s.whatsapp.net', ''))
        if (results && results.length > 0) {
          const result = results[0]
          if (!result.exists) {
            console.log(`❌ [ENHANCED] Phone number ${phone} does not exist on WhatsApp`)
            await this.updateMessageStatus(messageRecord.id, 'FAILED', 'Phone number not on WhatsApp')
            return { success: false, error: 'Phone number not on WhatsApp' }
          }
          console.log(`✅ [ENHANCED] Phone number ${phone} exists on WhatsApp`)
        }
      } catch (checkError) {
        console.error('⚠️ [ENHANCED] Error checking phone number, proceeding anyway:', checkError)
      }

      // Send message with enhanced typing indicator
      const waMessage = await this.sendMessageWithTyping({ text: message }, formattedPhone)
      
      // Update message status
      await this.updateMessageStatus(messageRecord.id, 'SENT')
      
      console.log(`✅ [ENHANCED] Message sent successfully with ID: ${messageRecord.id}`)
      
      return {
        success: true,
        messageId: messageRecord.id
      }

    } catch (error) {
      console.error(`❌ [ENHANCED] Error sending message:`, error)
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

  private async addToQueue(phone: string, message: string, type: string, incidentId: string | undefined, messageId: string) {
    const queuedMessage: QueuedMessage = {
      id: messageId,
      phone,
      message,
      type,
      incidentId,
      attempts: 0,
      maxAttempts: 3,
      timestamp: new Date()
    }
    
    this.messageQueue.push(queuedMessage)
    console.log(`📋 [ENHANCED] Message added to queue. Queue size: ${this.messageQueue.length}`)
    
    return {
      success: true,
      messageId,
      queued: true
    }
  }

  private startQueueProcessor() {
    // Process queue every 10 seconds when connected
    setInterval(async () => {
      if (this.messageQueue.length > 0 && this.isConnected && !this.isInitializing) {
        await this.processMessageQueue()
      }
    }, 10000)
  }

  private async processMessageQueue() {
    if (this.messageQueue.length === 0) {
      console.log('📋 [ENHANCED] Message queue is empty')
      return
    }

    console.log(`📋 [ENHANCED] Processing ${this.messageQueue.length} queued messages...`)
    
    const messagesToProcess = [...this.messageQueue]
    this.messageQueue = []
    
    for (const queuedMessage of messagesToProcess) {
      try {
        queuedMessage.attempts++
        
        const result = await this.sendMessage(
          queuedMessage.phone,
          queuedMessage.message,
          queuedMessage.type,
          queuedMessage.incidentId
        )
        
        if (!result.success && queuedMessage.attempts < queuedMessage.maxAttempts) {
          // Re-queue for retry
          this.messageQueue.push(queuedMessage)
          console.log(`↩️ [ENHANCED] Message ${queuedMessage.id} re-queued for retry`)
        } else if (!result.success) {
          // Mark as failed after max attempts
          await this.updateMessageStatus(queuedMessage.id, 'FAILED', 'Max retry attempts reached')
          console.log(`❌ [ENHANCED] Message ${queuedMessage.id} failed after ${queuedMessage.attempts} attempts`)
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ [ENHANCED] Error processing queued message ${queuedMessage.id}:`, error)
        
        if (queuedMessage.attempts < queuedMessage.maxAttempts) {
          this.messageQueue.push(queuedMessage)
        } else {
          await this.updateMessageStatus(queuedMessage.id, 'FAILED', 'Processing error after retries')
        }
      }
    }
    
    console.log(`✅ [ENHANCED] Queue processing completed. Remaining: ${this.messageQueue.length}`)
  }

  private async updateMessageStatus(messageId: string, status: string, error?: string) {
    try {
      await withTimeout(
        prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: {
            status: status as any,
            error: error || null,
            sentAt: status === 'SENT' ? new Date() : undefined
          }
        }),
        3000
      )
    } catch (updateError) {
      console.error('❌ [ENHANCED] Error updating message status:', updateError)
    }
  }

  private async updateSessionStatus(isConnected: boolean, qrCode?: string | null, error?: string) {
    try {
      await withTimeout(
        prisma.whatsAppSession.upsert({
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
        }),
        3000
      )
      
      console.log(`💾 [ENHANCED] Database session updated: connected=${isConnected}, qr=${qrCode ? 'present' : 'null'}`)
    } catch (error) {
      console.error('❌ [ENHANCED] Error updating session status:', error)
    }
  }

  private async processIncomingMessage(message: any) {
    try {
      const from = message.key?.remoteJid
      const messageText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || ''
      
      console.log(`📨 [ENHANCED] Received message from ${from}: ${messageText.substring(0, 50)}...`)
      
      // Enhanced auto-reply logic
      if (messageText.toLowerCase().includes('status')) {
        await this.sendMessage(
          from.replace('@s.whatsapp.net', ''),
          '🤖 *Status Inquiry Response*\n\n' +
          'Untuk melihat status incident Anda, silakan akses portal incident management kami.\n\n' +
          'Jika memerlukan bantuan lebih lanjut, hubungi administrator sistem.',
          'AUTO_REPLY'
        )
      }
      
    } catch (error) {
      console.error('❌ [ENHANCED] Error processing incoming message:', error)
    }
  }

  private scheduleReconnect(customDelay?: number) {
    if (this.isReconnecting || this.reconnectTimer) {
      console.log('🔄 [ENHANCED] Reconnection already scheduled')
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ [ENHANCED] Max reconnection attempts reached')
      return
    }

    const delay = customDelay || Math.min(
      this.minReconnectDelay * Math.pow(2, this.reconnectAttempts),
      120000 // Max 2 minutes
    )
    
    console.log(`⏳ [ENHANCED] Scheduling reconnection in ${delay / 1000}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    
    this.isReconnecting = true
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      this.isReconnecting = false
      this.reconnectAttempts++
      
      console.log(`🔄 [ENHANCED] Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      await this.initialize()
    }, delay)
  }

  private async clearSession() {
    try {
      console.log('🗑️ [ENHANCED] Clearing local session files...')
      
      if (fs.existsSync(this.sessionPath)) {
        // Remove all files in session directory
        const files = fs.readdirSync(this.sessionPath)
        for (const file of files) {
          const filePath = path.join(this.sessionPath, file)
          fs.unlinkSync(filePath)
        }
        console.log(`✅ [ENHANCED] Cleared ${files.length} session files`)
      }
      
      // Update database
      await this.updateSessionStatus(false, null, 'Session cleared')
      
    } catch (error) {
      console.error('❌ [ENHANCED] Error clearing session:', error)
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return {
      isConnected: this.isConnected,
      hasQRCode: this.qrCodeBase64 !== null,
      qrCode: this.qrCodeBase64,
      lastConnected: this.isConnected ? new Date() : null,
      lastError: null,
      sessionExists: fs.existsSync(this.sessionPath),
      storageMode: 'enhanced-local'
    }
  }

  async getQRCode() {
    return this.qrCodeBase64
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
        totalDelivered: 0, // Would need delivery receipts
        totalRead: 0, // Would need read receipts
        lastActivity: new Date(),
        queueSize: this.messageQueue.length
      }
    } catch (error) {
      console.error('❌ [ENHANCED] Error getting message stats:', error)
      return {
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        totalDelivered: 0,
        totalRead: 0,
        lastActivity: new Date(),
        queueSize: this.messageQueue.length
      }
    }
  }

  async restartConnection() {
    console.log('🔄 [ENHANCED] Restarting WhatsApp connection...')
    
    this.isConnected = false
    this.qrCode = null
    this.qrCodeBase64 = null
    
    if (this.socket) {
      try {
        this.socket.end(undefined)
      } catch (error) {
        console.error('⚠️ [ENHANCED] Error ending socket:', error)
      }
      this.socket = null
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    this.isReconnecting = false
    this.reconnectAttempts = 0
    
    setTimeout(() => {
      this.initialize()
    }, 2000)
    
    return { success: true }
  }

  async resetAndRestart() {
    console.log('🔄 [ENHANCED] Resetting and restarting WhatsApp connection...')
    
    await this.clearSession()
    return this.restartConnection()
  }

  async clearSessionManually() {
    console.log('🗑️ [ENHANCED] Clearing WhatsApp session manually...')
    await this.clearSession()
    return { success: true }
  }
}

export { EnhancedWhatsAppService }
