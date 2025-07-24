import axios, { AxiosInstance } from 'axios'
import https from 'https'

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
    
    // Create HTTPS agent to handle SSL certificate issues
    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false, // Only verify SSL in production
      keepAlive: true,
      timeout: 30000
    })
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      httpsAgent: httpsAgent,
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
      // In development, if we can't reach the API, just return false without throwing
      if (process.env.NODE_ENV === 'development') {
        const response = await this.client.get('/health')
        return response.data.success === true
      } else {
        const response = await this.client.get('/health')
        return response.data.success === true
      }
    } catch (error) {
      console.log('📡 Storage API not accessible, continuing with local fallback')
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
      // Handle SSL certificate errors specifically
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || 
          error.message?.includes('unable to verify the first certificate')) {
        console.warn('⚠️ SSL certificate verification failed for save operation')
        return { success: false, error: 'SSL verification failed' }
      }
      
      console.error('❌ Failed to save WhatsApp credentials:', error)
      return { success: false, error: error.response?.data?.error || error.message }
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
      
      // Handle SSL certificate errors specifically
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || 
          error.message?.includes('unable to verify the first certificate')) {
        console.warn('⚠️ SSL certificate verification failed, but continuing...')
        return null
      }
      
      console.error('❌ Failed to get WhatsApp credentials:', error)
      // Return null instead of throwing to allow graceful fallback
      return null
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
      // Handle SSL certificate errors specifically
      if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || 
          error.message?.includes('unable to verify the first certificate')) {
        console.warn('⚠️ SSL certificate verification failed for update operation')
        return { success: false, error: 'SSL verification failed' }
      }
      
      console.error('❌ Failed to update WhatsApp credentials:', error)
      return { success: false, error: error.response?.data?.error || error.message }
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
