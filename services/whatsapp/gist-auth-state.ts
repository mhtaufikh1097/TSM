import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds } from '@whiskeysockets/baileys'

// Load environment variables
if (typeof window === 'undefined') {
  require('dotenv').config()
}

interface GistAuthState {
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

interface GistContent {
  creds?: string
  keys?: string
  lastUpdated?: string
}

/**
 * GitHub Gist Auth State for WhatsApp
 * Stores WhatsApp authentication data in a private GitHub Gist
 */
class GistAuthStateManager {
  private gistId: string
  private githubToken: string
  private filename: string = 'whatsapp-auth-state.json'

  constructor() {
    this.gistId = process.env.WHATSAPP_GIST_ID || ''
    this.githubToken = process.env.GITHUB_TOKEN || ''
    
    if (!this.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required for Gist storage')
    }
  }

  /**
   * Encode binary/object data to Base64 string for Gist storage
   */
  private encodeToBase64(data: any): string {
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
  private decodeFromBase64(base64Data: string): any {
    try {
      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8')
      return JSON.parse(jsonString, (key, value) => {
        // Restore Buffer objects
        if (value && typeof value === 'object' && value.__buffer === true) {
          return {
            type: 'Buffer',
            data: Array.from(Buffer.from(value.data, 'base64'))
          }
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
   * Create a new private GitHub Gist
   */
  private async createGist(content: GistContent): Promise<string> {
    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'WhatsApp Authentication State - WIKA TSM System',
          public: false,
          files: {
            [this.filename]: {
              content: JSON.stringify(content, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create Gist: ${response.status} ${response.statusText}`)
      }

      const gist = await response.json()
      console.log('✅ Created new GitHub Gist for WhatsApp auth state:', gist.id)
      return gist.id
    } catch (error) {
      console.error('❌ Failed to create GitHub Gist:', error)
      throw error
    }
  }

  /**
   * Update existing GitHub Gist
   */
  private async updateGist(gistId: string, content: GistContent): Promise<void> {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [this.filename]: {
              content: JSON.stringify(content, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update Gist: ${response.status} ${response.statusText}`)
      }

      console.log('💾 Updated GitHub Gist with WhatsApp auth state')
    } catch (error) {
      console.error('❌ Failed to update GitHub Gist:', error)
      throw error
    }
  }

  /**
   * Get content from GitHub Gist
   */
  private async getGistContent(gistId: string): Promise<GistContent | null> {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      })

      if (response.status === 404) {
        console.log('📝 Gist not found, will create new one')
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Gist: ${response.status} ${response.statusText}`)
      }

      const gist = await response.json()
      const file = gist.files[this.filename]
      
      if (!file) {
        console.log('📝 Auth state file not found in Gist')
        return null
      }

      return JSON.parse(file.content) as GistContent
    } catch (error) {
      console.error('❌ Failed to get Gist content:', error)
      return null
    }
  }

  /**
   * Save auth state to GitHub Gist
   */
  private async saveToGist(creds: AuthenticationCreds, keys: any): Promise<void> {
    try {
      const content: GistContent = {
        creds: this.encodeToBase64(creds),
        keys: this.encodeToBase64(keys),
        lastUpdated: new Date().toISOString()
      }

      if (this.gistId) {
        // Update existing Gist
        await this.updateGist(this.gistId, content)
      } else {
        // Create new Gist
        this.gistId = await this.createGist(content)
        // Log the Gist ID for user to add to environment variables
        console.log('🔑 IMPORTANT: Add this to your .env file:')
        console.log(`WHATSAPP_GIST_ID=${this.gistId}`)
      }
    } catch (error) {
      console.error('❌ Failed to save auth state to Gist:', error)
      throw error
    }
  }

  /**
   * Load auth state from GitHub Gist
   */
  private async loadFromGist(): Promise<{ creds: AuthenticationCreds, keys: any } | null> {
    try {
      if (!this.gistId) {
        console.log('📝 No Gist ID provided, will create new auth state')
        return null
      }

      const content = await this.getGistContent(this.gistId)
      if (!content) {
        return null
      }

      const creds = content.creds ? this.decodeFromBase64(content.creds) : null
      const keys = content.keys ? this.decodeFromBase64(content.keys) : {}

      if (creds && creds.noiseKey && creds.pairingEphemeralKeyPair) {
        console.log('✅ Successfully loaded WhatsApp credentials from GitHub Gist')
        return { creds, keys }
      } else {
        console.log('⚠️ Stored credentials in Gist are invalid')
        return null
      }
    } catch (error) {
      console.error('❌ Failed to load auth state from Gist:', error)
      return null
    }
  }

  /**
   * Clear auth state from GitHub Gist
   */
  async clearAuthState(): Promise<void> {
    try {
      if (!this.gistId) {
        console.log('📝 No Gist ID provided, nothing to clear')
        return
      }

      const emptyContent: GistContent = {
        creds: undefined,
        keys: undefined,
        lastUpdated: new Date().toISOString()
      }

      await this.updateGist(this.gistId, emptyContent)
      console.log('🗑️ WhatsApp authentication state cleared from GitHub Gist')
    } catch (error) {
      console.error('❌ Failed to clear auth state from Gist:', error)
    }
  }

  /**
   * Create WhatsApp auth state using GitHub Gist storage
   */
  async createAuthState(): Promise<GistAuthState> {
    let creds: AuthenticationCreds
    let keys: any = {}

    // Try to load existing auth state from Gist
    const existingAuth = await this.loadFromGist()
    
    if (existingAuth) {
      creds = existingAuth.creds
      keys = existingAuth.keys
    } else {
      console.log('🆕 Creating new WhatsApp credentials')
      creds = initAuthCreds()
    }

    // Save function to persist changes to Gist
    const saveCreds = async () => {
      await this.saveToGist(creds, keys)
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
}

// Export the main function
export async function useGistAuthState(): Promise<GistAuthState> {
  const manager = new GistAuthStateManager()
  return await manager.createAuthState()
}

// Export clear function
export async function clearGistAuthState(): Promise<void> {
  const manager = new GistAuthStateManager()
  await manager.clearAuthState()
}
