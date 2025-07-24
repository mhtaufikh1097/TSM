import axios, { AxiosInstance } from 'axios'

interface StorageApiResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
  file?: any
  files?: any[]
}

interface WhatsAppCredentials {
  sessionId: string
  credentials: any
  lastUpdated: string
  version: string
}

class StorageApiService {
  private client: AxiosInstance
  private apiUrl: string
  private apiKey: string

  constructor() {
    // Use environment variables or fallback to production API
    this.apiUrl = process.env.STORAGE_API_URL || 'https://botlinko.biz.id'
    this.apiKey = process.env.STORAGE_API_KEY || process.env.NEXTAUTH_SECRET || 'nWxHqbR9ZLz4kTqUtZtG9TYnM2+/xEVq3FccFzjEo9M='
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    })

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('🚨 Storage API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.error || error.message
        })
        throw error
      }
    )
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health')
      return response.data.success === true
    } catch (error) {
      console.error('❌ Health check failed:', error)
      return false
    }
  }

  // File upload methods
  async uploadFile(file: Buffer, originalName: string, mimeType: string): Promise<StorageApiResponse> {
    try {
      const formData = new FormData()
      const blob = new Blob([file], { type: mimeType })
      formData.append('file', blob, originalName)

      const response = await this.client.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-Key': this.apiKey
        }
      })

      return response.data
    } catch (error: any) {
      console.error('❌ File upload failed:', error)
      throw new Error(`File upload failed: ${error.response?.data?.error || error.message}`)
    }
  }

  async uploadMultipleFiles(files: Array<{
    buffer: Buffer
    originalName: string
    mimeType: string
  }>): Promise<StorageApiResponse> {
    try {
      const formData = new FormData()
      
      files.forEach((file, index) => {
        const blob = new Blob([file.buffer], { type: file.mimeType })
        formData.append('files', blob, file.originalName)
      })

      const response = await this.client.post('/api/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-Key': this.apiKey
        }
      })

      return response.data
    } catch (error: any) {
      console.error('❌ Multiple files upload failed:', error)
      throw new Error(`Multiple files upload failed: ${error.response?.data?.error || error.message}`)
    }
  }

  // WhatsApp credentials methods
  async saveWhatsAppCredentials(sessionId: string, credentials: any): Promise<StorageApiResponse> {
    try {
      const response = await this.client.post('/api/whatsapp/credentials', {
        sessionId,
        credentials
      })

      console.log('💾 WhatsApp credentials saved to storage API:', sessionId)
      return response.data
    } catch (error: any) {
      console.error('❌ Failed to save WhatsApp credentials:', error)
      throw new Error(`Failed to save credentials: ${error.response?.data?.error || error.message}`)
    }
  }

  async getWhatsAppCredentials(sessionId: string): Promise<WhatsAppCredentials | null> {
    try {
      const response = await this.client.get(`/api/whatsapp/credentials/${sessionId}`)
      
      if (response.data.success && response.data.data) {
        console.log('📖 WhatsApp credentials retrieved from storage API:', sessionId)
        return response.data.data
      }
      
      return null
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('📭 No WhatsApp credentials found for session:', sessionId)
        return null
      }
      
      console.error('❌ Failed to get WhatsApp credentials:', error)
      throw new Error(`Failed to get credentials: ${error.response?.data?.error || error.message}`)
    }
  }

  async updateWhatsAppCredentials(sessionId: string, credentials: any): Promise<StorageApiResponse> {
    try {
      const response = await this.client.put(`/api/whatsapp/credentials/${sessionId}`, {
        credentials
      })

      console.log('🔄 WhatsApp credentials updated in storage API:', sessionId)
      return response.data
    } catch (error: any) {
      console.error('❌ Failed to update WhatsApp credentials:', error)
      throw new Error(`Failed to update credentials: ${error.response?.data?.error || error.message}`)
    }
  }

  async deleteWhatsAppCredentials(sessionId: string): Promise<StorageApiResponse> {
    try {
      const response = await this.client.delete(`/api/whatsapp/credentials/${sessionId}`)
      
      console.log('🗑️ WhatsApp credentials deleted from storage API:', sessionId)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('📭 WhatsApp credentials not found for deletion:', sessionId)
        return { success: true, message: 'Credentials not found (already deleted)' }
      }
      
      console.error('❌ Failed to delete WhatsApp credentials:', error)
      throw new Error(`Failed to delete credentials: ${error.response?.data?.error || error.message}`)
    }
  }

  async listWhatsAppSessions(): Promise<Array<{
    sessionId: string
    lastUpdated: string
    filename: string
  }>> {
    try {
      const response = await this.client.get('/api/whatsapp/sessions')
      
      if (response.data.success && response.data.sessions) {
        return response.data.sessions
      }
      
      return []
    } catch (error: any) {
      console.error('❌ Failed to list WhatsApp sessions:', error)
      return []
    }
  }

  // Utility method to test API connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const isHealthy = await this.healthCheck()
      
      if (!isHealthy) {
        return { success: false, message: 'Health check failed' }
      }

      // Test authentication
      const response = await this.client.get('/test-auth')
      
      if (response.data.success) {
        return { success: true, message: 'Connection and authentication successful' }
      }
      
      return { success: false, message: 'Authentication failed' }
    } catch (error: any) {
      return { 
        success: false, 
        message: `Connection failed: ${error.response?.data?.error || error.message}` 
      }
    }
  }
}

export const storageApiService = new StorageApiService()
export type { StorageApiResponse, WhatsAppCredentials }
