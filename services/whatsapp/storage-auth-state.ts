import { AuthenticationState, AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys'
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import { storageApiService } from '../storage-api'

interface StorageAuthState {
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

/**
 * Custom auth state handler that uses the storage API instead of local files
 */
export const useStorageApiAuthState = async (sessionId: string = 'main'): Promise<StorageAuthState> => {
  let creds: AuthenticationCreds = initAuthCreds()
  let keys: any = {}

  // Function to read auth state from storage API
  const readData = async () => {
    try {
      const credentialsData = await storageApiService.getWhatsAppCredentials(sessionId)
      
      if (credentialsData?.credentials) {
        console.log('📖 Loading WhatsApp auth state from storage API...')
        
        // Parse the stored credentials
        const storedData = credentialsData.credentials
        
        if (storedData.creds) {
          creds = JSON.parse(JSON.stringify(storedData.creds), BufferJSON.reviver)
        }
        
        if (storedData.keys) {
          keys = JSON.parse(JSON.stringify(storedData.keys), BufferJSON.reviver)
        }
        
        console.log('✅ Auth state loaded successfully from storage API')
      } else {
        console.log('🆕 No existing auth state found, creating new credentials...')
        creds = initAuthCreds()
        keys = {}
      }
    } catch (error) {
      console.error('❌ Error reading auth state from storage API:', error)
      console.log('🆕 Creating new credentials due to error...')
      creds = initAuthCreds()
      keys = {}
    }
  }

  // Function to write auth state to storage API
  const writeData = async () => {
    try {
      const authData = {
        creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
        keys: JSON.parse(JSON.stringify(keys, BufferJSON.replacer))
      }

      // Check if credentials already exist
      const existingData = await storageApiService.getWhatsAppCredentials(sessionId)
      
      if (existingData) {
        await storageApiService.updateWhatsAppCredentials(sessionId, authData)
        console.log('🔄 Auth state updated in storage API')
      } else {
        await storageApiService.saveWhatsAppCredentials(sessionId, authData)
        console.log('💾 Auth state saved to storage API')
      }
    } catch (error) {
      console.error('❌ Error saving auth state to storage API:', error)
      throw error
    }
  }

  // Load initial data
  await readData()

  return {
    state: {
      creds,
      keys: {
        get: (type: keyof SignalDataTypeMap, ids: string[]) => {
          const key = `${type}-${ids.join('-')}`
          return keys[key]
        },
        set: (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const key = `${category}-${id}`
              if (value) {
                keys[key] = value
              } else {
                delete keys[key]
              }
            }
          }
        }
      }
    },
    saveCreds: async () => {
      await writeData()
    }
  }
}

/**
 * Clear auth state from storage API
 */
export const clearStorageApiAuthState = async (sessionId: string = 'main'): Promise<void> => {
  try {
    await storageApiService.deleteWhatsAppCredentials(sessionId)
    console.log('🗑️ Auth state cleared from storage API')
  } catch (error) {
    console.error('❌ Error clearing auth state from storage API:', error)
    throw error
  }
}

/**
 * Check if auth state exists in storage API
 */
export const hasStorageApiAuthState = async (sessionId: string = 'main'): Promise<boolean> => {
  try {
    const credentialsData = await storageApiService.getWhatsAppCredentials(sessionId)
    return !!credentialsData?.credentials
  } catch (error) {
    console.error('❌ Error checking auth state in storage API:', error)
    return false
  }
}
