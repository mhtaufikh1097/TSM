import { writeFile, readFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

interface WhatsAppCredentials {
  noiseKey?: Buffer
  pairingEphemeralKeyPair?: any
  signedIdentityKey?: any
  signedPreKey?: any
  registrationId?: number
  advSecretKey?: string
  processedHistoryMessages?: any[]
  nextPreKeyId?: number
  firstUnuploadedPreKeyId?: number
  accountSyncCounter?: number
  accountSettings?: any
  registered?: boolean
  pairingCode?: string
  lastPropHash?: string
  routingInfo?: any
}

interface WhatsAppKeys {
  [key: string]: any
}

interface WhatsAppAuthState {
  creds: WhatsAppCredentials
  keys: WhatsAppKeys
}

class JSONAuthStateService {
  private dataDir: string
  private credsFile: string
  private keysFile: string

  constructor() {
    // Use data directory that works both locally and on cPanel
    this.dataDir = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'data', 'whatsapp')
      : path.join(process.cwd(), 'data', 'whatsapp')
    
    this.credsFile = path.join(this.dataDir, 'creds.json')
    this.keysFile = path.join(this.dataDir, 'keys.json')
  }

  private async ensureDataDir(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true })
    }
  }

  private serializeData(data: any): string {
    return JSON.stringify(data, (key, value) => {
      // Convert Buffer to base64 string for JSON storage
      if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
        return {
          type: 'Buffer',
          data: Buffer.from(value.data).toString('base64')
        }
      }
      return value
    }, 2)
  }

  private deserializeData(jsonString: string): any {
    return JSON.parse(jsonString, (key, value) => {
      // Convert base64 string back to Buffer
      if (value && value.type === 'Buffer' && typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64')
      }
      return value
    })
  }

  async saveCredentials(creds: WhatsAppCredentials): Promise<void> {
    try {
      await this.ensureDataDir()
      const serializedCreds = this.serializeData(creds)
      await writeFile(this.credsFile, serializedCreds, 'utf8')
      console.log('✅ WhatsApp credentials saved to JSON file')
    } catch (error) {
      console.error('❌ Error saving credentials:', error)
      throw error
    }
  }

  async loadCredentials(): Promise<WhatsAppCredentials | null> {
    try {
      if (!existsSync(this.credsFile)) {
        return null
      }
      
      const data = await readFile(this.credsFile, 'utf8')
      const creds = this.deserializeData(data)
      console.log('✅ WhatsApp credentials loaded from JSON file')
      return creds
    } catch (error) {
      console.error('❌ Error loading credentials:', error)
      return null
    }
  }

  async saveKeys(keys: WhatsAppKeys): Promise<void> {
    try {
      await this.ensureDataDir()
      const serializedKeys = this.serializeData(keys)
      await writeFile(this.keysFile, serializedKeys, 'utf8')
      console.log('✅ WhatsApp keys saved to JSON file')
    } catch (error) {
      console.error('❌ Error saving keys:', error)
      throw error
    }
  }

  async loadKeys(): Promise<WhatsAppKeys> {
    try {
      if (!existsSync(this.keysFile)) {
        return {}
      }
      
      const data = await readFile(this.keysFile, 'utf8')
      const keys = this.deserializeData(data)
      console.log('✅ WhatsApp keys loaded from JSON file')
      return keys
    } catch (error) {
      console.error('❌ Error loading keys:', error)
      return {}
    }
  }

  async clearAuthState(): Promise<void> {
    try {
      const fs = require('fs')
      
      if (existsSync(this.credsFile)) {
        fs.unlinkSync(this.credsFile)
      }
      
      if (existsSync(this.keysFile)) {
        fs.unlinkSync(this.keysFile)
      }
      
      console.log('✅ WhatsApp auth state cleared from JSON files')
    } catch (error) {
      console.error('❌ Error clearing auth state:', error)
      throw error
    }
  }

  async getAuthState(): Promise<WhatsAppAuthState> {
    const creds = await this.loadCredentials()
    const keys = await this.loadKeys()
    
    return {
      creds: creds || {} as WhatsAppCredentials,
      keys
    }
  }

  async saveAuthState(state: WhatsAppAuthState): Promise<void> {
    await Promise.all([
      this.saveCredentials(state.creds),
      this.saveKeys(state.keys)
    ])
  }
}

export const jsonAuthStateService = new JSONAuthStateService()

// Baileys-compatible auth state functions
export function useJSONAuthState() {
  const saveState = async () => {
    // This will be called by Baileys when credentials need to be saved
  }

  const loadState = async () => {
    const authState = await jsonAuthStateService.getAuthState()
    return authState
  }

  const saveCreds = async (creds: WhatsAppCredentials) => {
    await jsonAuthStateService.saveCredentials(creds)
  }

  return {
    state: loadState(),
    saveCreds
  }
}

export async function clearJSONAuthState(): Promise<void> {
  await jsonAuthStateService.clearAuthState()
}
