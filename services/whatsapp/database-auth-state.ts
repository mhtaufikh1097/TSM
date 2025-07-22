import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds } from '@whiskeysockets/baileys'
import { prisma } from '@/lib/db'

interface DatabaseAuthState {
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

/**
 * Encode binary/object data to Base64 string for database storage
 */
function encodeToBase64(data: any): string {
  try {
    const jsonString = JSON.stringify(data, (key, value) => {
      // Handle Buffer objects
      if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
        return {
          __buffer: true,
          data: Buffer.from(value.data).toString('base64')
        }
      }
      // Handle Uint8Array
      if (value instanceof Uint8Array) {
        return {
          __uint8array: true,
          data: Buffer.from(value).toString('base64')
        }
      }
      return value
    })
    return Buffer.from(jsonString).toString('base64')
  } catch (error) {
    console.error('❌ Failed to encode data to Base64:', error)
    return ''
  }
}

/**
 * Decode Base64 string back to original data structure
 */
function decodeFromBase64(base64String: string): any {
  try {
    if (!base64String) return null
    
    const jsonString = Buffer.from(base64String, 'base64').toString('utf-8')
    return JSON.parse(jsonString, (key, value) => {
      // Restore Buffer objects
      if (value && typeof value === 'object' && value.__buffer === true) {
        return Buffer.from(value.data, 'base64')
      }
      // Restore Uint8Array
      if (value && typeof value === 'object' && value.__uint8array === true) {
        return new Uint8Array(Buffer.from(value.data, 'base64'))
      }
      return value
    })
  } catch (error) {
    console.error('❌ Failed to decode Base64 data:', error)
    return null
  }
}

/**
 * Database-based authentication state for WhatsApp with Base64 encoding
 * This replaces the file-based useMultiFileAuthState for Vercel compatibility
 */
export async function useDatabaseAuthState(): Promise<DatabaseAuthState> {
  // Get existing session data from database
  const session = await prisma.whatsAppSession.upsert({
    where: { id: 'main' },
    create: {
      id: 'main',
      isConnected: false,
      creds: undefined,
      keys: undefined
    },
    update: {}
  })

  // Initialize credentials from database or create new ones
  let creds: AuthenticationCreds
  let keys: any = {}

  if (session.creds && typeof session.creds === 'string') {
    try {
      console.log('🔄 Loading existing WhatsApp credentials from database...')
      const decodedCreds = decodeFromBase64(session.creds as string)
      
      if (decodedCreds && decodedCreds.noiseKey && decodedCreds.pairingEphemeralKeyPair) {
        creds = decodedCreds
        console.log('✅ Successfully loaded credentials from database')
      } else {
        console.log('⚠️ Stored credentials invalid, creating new ones')
        creds = initAuthCreds()
      }
    } catch (error) {
      console.log('⚠️ Failed to parse stored credentials, creating new ones:', error)
      creds = initAuthCreds()
    }
  } else {
    console.log('🆕 Creating new WhatsApp credentials')
    creds = initAuthCreds()
  }

  // Load keys from database if available
  if (session.keys && typeof session.keys === 'string') {
    try {
      const decodedKeys = decodeFromBase64(session.keys as string)
      if (decodedKeys && typeof decodedKeys === 'object') {
        keys = decodedKeys
        console.log('✅ Successfully loaded session keys from database')
      }
    } catch (error) {
      console.log('⚠️ Failed to parse stored keys, starting with empty keys:', error)
      keys = {}
    }
  }

  // Save function to persist changes to database
  const saveCreds = async () => {
    try {
      // Encode credentials and keys to Base64
      const encodedCreds = encodeToBase64(creds)
      const encodedKeys = encodeToBase64(keys)
      
      if (encodedCreds && encodedKeys) {
        await prisma.whatsAppSession.update({
          where: { id: 'main' },
          data: {
            creds: encodedCreds,
            keys: encodedKeys,
            updatedAt: new Date()
          }
        })
        console.log('💾 WhatsApp session state saved to database (Base64 encoded)')
      } else {
        console.warn('⚠️ Failed to encode credentials, skipping save')
      }
    } catch (error) {
      console.error('❌ Failed to save credentials to database:', error)
    }
  }

  // Create the auth state object
  const state: AuthenticationState = {
    creds,
    keys: {
      get: (type: keyof SignalDataTypeMap, ids: string[]) => {
        const data: { [id: string]: any } = {}
        for (const id of ids) {
          const key = `${type}.${id}`
          if (keys[key]) {
            data[id] = keys[key]
          }
        }
        return data
      },
      set: (data: any) => {
        for (const category in data) {
          for (const id in data[category]) {
            const key = `${category}.${id}`
            const value = data[category][id]
            if (value) {
              keys[key] = value
            } else {
              delete keys[key]
            }
          }
        }
      }
    }
  }

  return { state, saveCreds }
}

/**
 * Clear all authentication data from database
 */
export async function clearDatabaseAuthState(): Promise<void> {
  try {
    await prisma.whatsAppSession.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        isConnected: false,
        qrCode: null,
        creds: undefined,
        keys: undefined
      },
      update: {
        isConnected: false,
        qrCode: null,
        creds: undefined,
        keys: undefined,
        updatedAt: new Date()
      }
    })
    console.log('🗑️ WhatsApp authentication state cleared from database')
  } catch (error) {
    console.error('❌ Failed to clear auth state from database:', error)
  }
}
