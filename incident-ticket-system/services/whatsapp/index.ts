import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@baileys/md'
import { Boom } from '@hapi/boom'
import path from 'path'

class WhatsAppService {
  private socket: any = null
  private isConnected = false

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        path.join(process.cwd(), 'whatsapp_session')
      )

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      })

      this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
      this.socket.ev.on('creds.update', saveCreds)

      return this.socket
    } catch (error) {
      console.error('WhatsApp initialization error:', error)
      throw error
    }
  }

  private handleConnectionUpdate(update: any) {
    const { connection, lastDisconnect } = update
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed due to:', lastDisconnect?.error)
      
      if (shouldReconnect) {
        this.initialize()
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connected successfully')
      this.isConnected = true
    }
  }

  async sendMessage(to: string, message: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp not connected')
    }

    try {
      // Format phone number (remove + and add @s.whatsapp.net)
      const formattedNumber = to.replace(/\+/g, '') + '@s.whatsapp.net'
      
      await this.socket.sendMessage(formattedNumber, {
        text: message
      })
      
      console.log(`Message sent to ${to}:`, message)
      return { success: true }
    } catch (error) {
      console.error('Send message error:', error)
      throw error
    }
  }
}

export const whatsappService = new WhatsAppService()
