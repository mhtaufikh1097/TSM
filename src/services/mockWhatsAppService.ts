/**
 * Mock WhatsApp service for development/testing
 * This can be used when the actual WhatsApp connection is not available
 */

export const mockWhatsAppService = {
  /**
   * Mock function to simulate sending WhatsApp messages
   */
  sendMessage: async (to: string, message: string): Promise<{ success: boolean; message: string }> => {
    console.log(`[MockWhatsApp] Simulating message send to ${to}:`);
    console.log(`[MockWhatsApp] Message: ${message}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success (you can modify this to test failures)
    return {
      success: true,
      message: 'Message sent successfully (mock)'
    };
  },

  /**
   * Mock function to check connection status
   */
  checkStatus: async (): Promise<{ connected: boolean; user: any }> => {
    return {
      connected: true,
      user: { id: 'mock_user', name: 'Mock User' }
    };
  }
};

/**
 * Environment flag to enable/disable mock mode
 */
export const USE_MOCK_WHATSAPP = process.env.NODE_ENV === 'development' && process.env.MOCK_WHATSAPP === 'true';
