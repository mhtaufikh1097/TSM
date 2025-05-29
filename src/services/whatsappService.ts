/**
 * Enhanced service for handling WhatsApp messages including approval links
 */
interface WhatsAppMessageParams {
  message: string;
  to: string;
}

interface ApprovalLink {
  role: 'qc' | 'pm';
  token: string;
  inspectionId: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Store for temporary approval tokens
const approvalTokens = new Map<string, ApprovalLink>();

/**
 * Enhanced sendWhatsAppMessage with better error handling and retry logic
 * @param {WhatsAppMessageParams} params - Message content and recipient
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
export const sendWhatsAppMessage = async (params: WhatsAppMessageParams): Promise<any> => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[WhatsApp] Sending message attempt ${attempt}/${maxRetries}`, {
        to: params.to,
        messageLength: params.message.length,
        timestamp: new Date().toISOString()
      });

      // Validate input parameters
      if (!params.to || !params.message) {
        throw new Error('Missing required parameters: to and message are required');
      }

      // Clean phone number format
      const cleanPhoneNumber = params.to.replace(/[^\d]/g, '');
      if (cleanPhoneNumber.length < 10) {
        throw new Error(`Invalid phone number format: ${params.to}`);
      }

      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/api/whatsapp/send-message`;

      console.log(`[WhatsApp] Making request to: ${apiUrl}`);

      const requestBody = {
        ...params,
        to: cleanPhoneNumber // Use cleaned phone number
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      console.log(`[WhatsApp] Response status: ${response.status} ${response.statusText}`);

      // Get response text first for better error debugging
      const responseText = await response.text();
      console.log(`[WhatsApp] Response body:`, responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Log detailed error information
          console.error('[WhatsApp] API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            requestBody,
            url: apiUrl
          });
        } catch (parseError) {
          console.error('[WhatsApp] Failed to parse error response:', responseText);
        }

        // Specific handling for different error codes
        if (response.status === 404) {
          throw new Error('WhatsApp API endpoint not found. Check if /api/whatsapp/send-message exists.');
        } else if (response.status === 500) {
          throw new Error(`WhatsApp server error: ${errorMessage}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`WhatsApp authentication error: ${errorMessage}`);
        } else if (response.status === 429) {
          // Rate limiting - wait before retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
          console.log(`[WhatsApp] Rate limited, waiting ${retryAfter}s before retry...`);
          await delay(retryAfter * 1000);
          throw new Error(`WhatsApp rate limited: ${errorMessage}`);
        }

        throw new Error(`WhatsApp API error: ${errorMessage}`);
      }

      // Parse successful response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('[WhatsApp] Response is not JSON, returning raw text');
        responseData = { success: true, data: responseText };
      }

      console.log('[WhatsApp] Message sent successfully:', {
        to: params.to,
        success: true,
        attempt,
        timestamp: new Date().toISOString()
      });

      return responseData;

    } catch (error) {
      lastError = error as Error;
      
      console.error(`[WhatsApp] Attempt ${attempt}/${maxRetries} failed:`, {
        error: (error as Error).message,
        to: params.to,
        timestamp: new Date().toISOString()
      });

      // Don't retry on certain errors
      if (error instanceof Error && (
          error.message.includes('Invalid phone number') ||
          error.message.includes('Missing required parameters') ||
          error.message.includes('endpoint not found'))) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
        console.log(`[WhatsApp] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  // If all retries failed, throw the last error
  console.error('[WhatsApp] All retry attempts failed');
  throw new Error(`Failed to send WhatsApp message after ${maxRetries} attempts: ${lastError?.message}`);
};

/**
 * Helper function to get base URL with fallback
 */
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  return process.env.NEXT_PUBLIC_BASE_URL || 
         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
         'http://localhost:3000';
};

/**
 * Helper function for delays
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Test WhatsApp connection
 */
export const testWhatsAppConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/whatsapp/status`, {// Assuming you have a status endpoint
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[WhatsApp] Connection test result:', data);
      return data.connected === true;
    }
    
    return false;
  } catch (error) {
    console.error('[WhatsApp] Connection test failed:', error);
    return false;
  }
};

/**
 * Enhanced generateDetailLink dengan database storage dan better error handling
 */
export const generateDetailLink = async (
  inspectionId: number,
  role: 'qc' | 'pm'
): Promise<string> => {
  try {
    console.log(`[DetailLink] Generating link for inspection ${inspectionId}, role: ${role}`);
    
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/store/token`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        inspectionId, 
        role, 
        expirationHours: 24 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    const detailLink = `${baseUrl}/inspections/detail/${inspectionId}?token=${result.token}&role=${role}`;
    
    console.log(`[DetailLink] Generated successfully for inspection ${inspectionId}`);
    return detailLink;

  } catch (error) {
    console.error(`[DetailLink] Failed to generate link:`, error);
    throw new Error(`Failed to generate detail link: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Enhanced validateApprovalToken dengan database dan better error handling
 */
export const validateApprovalToken = async (
  token: string
): Promise<ApprovalLink | null> => {
  try {
    console.log(`[ValidateToken] Validating token: ${token.substring(0, 8)}...`);
    
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/store/validate?token=${encodeURIComponent(token)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`[ValidateToken] Token validation failed: ${response.status}`);
      return null;
    }
    
    const tokenData = await response.json();

    if (tokenData.isUsed) {
      console.log('[ValidateToken] Token already used:', token);
      return null;
    }

    console.log(`[ValidateToken] Token valid for inspection ${tokenData.inspectionId}`);
    return {
      token: tokenData.token,
      inspectionId: tokenData.inspectionId,
      role: tokenData.role,
    };
  } catch (error) {
    console.error('[ValidateToken] Error validating approval token:', error);
    return null;
  }
};

/**
 * Enhanced formatInspectionMessage dengan async generateDetailLink dan better formatting
 */
export const formatInspectionMessage = async (
  inspectionData: any,
  inspectionId: number
): Promise<string> => {
  try {
    console.log(`[FormatMessage] Formatting message for inspection ${inspectionId}`);
    
    // Generate links with error handling
    let qcDetailLink = '';
    let pmDetailLink = '';
    
    try {
      qcDetailLink = await generateDetailLink(inspectionId, 'qc');
    } catch (error) {
      console.error('[FormatMessage] Failed to generate QC link:', error);
      qcDetailLink = 'Link generation failed';
    }
    
    try {
      pmDetailLink = await generateDetailLink(inspectionId, 'pm');
    } catch (error) {
      console.error('[FormatMessage] Failed to generate PM link:', error);
      pmDetailLink = 'Link generation failed';
    }

    const message = `
🔍 *New Inspection Report #${inspectionId}*

📋 **Details:**
• Type: ${inspectionData.inspectionType || 'Not specified'}
• Location: ${inspectionData.location || 'Not specified'}
• Inspector: ${inspectionData.inspectorName || 'N/A'}
• Severity: ${(inspectionData.severity || 'medium').toUpperCase()}

📝 **Findings:**
${inspectionData.findings || 'No findings provided'}

⚠️ **Action Required:**
${inspectionData.actionRequired || 'No action specified'}

📅 Created: ${new Date().toLocaleString()}

*Review Links:*
🔍 QC Review: ${qcDetailLink}
📋 PM Review: ${pmDetailLink}

Click the link above to view full details and take action.
    `.trim();

    console.log(`[FormatMessage] Message formatted successfully for inspection ${inspectionId}`);
    return message;
    
  } catch (error) {
    console.error('[FormatMessage] Error formatting inspection message:', error);
    throw new Error(`Failed to format inspection message: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Enhanced sendInspectionReport dengan better error handling dan logging
 */
export const sendInspectionReport = async (
  inspectionData: any,
  inspectionId: number,
  recipientNumbers: string[] = []
): Promise<any> => {
  try {
    console.log(`[SendReport] Sending inspection report ${inspectionId} to ${recipientNumbers.length} recipients`);
    
    const messageContent = await formatInspectionMessage(inspectionData, inspectionId);

    // Default admin number
    const adminNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '';

    // Combine admin number with additional recipients
    const allRecipients = Array.from(new Set([adminNumber, ...recipientNumbers]))
      .filter(Boolean)
      .filter(num => num.trim().length > 0);

    if (allRecipients.length === 0) {
      throw new Error('No valid recipients found for WhatsApp notification');
    }

    console.log(`[SendReport] Sending to recipients:`, allRecipients);

    // Send to all recipients with individual error handling
    const results = await Promise.allSettled(
      allRecipients.map(async (recipient) => {
        try {
          const result = await sendWhatsAppMessage({
            message: messageContent,
            to: recipient
          });
          console.log(`[SendReport] Successfully sent to ${recipient}`);
          return { recipient, success: true, result };
        } catch (error) {
          console.error(`[SendReport] Failed to send to ${recipient}:`, error);
          return { recipient, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    console.log(`[SendReport] Report sent: ${successful.length} successful, ${failed.length} failed`);

    if (failed.length > 0) {
      console.error('[SendReport] Some messages failed:', failed);
    }

    return {
      success: successful.length > 0,
      total: allRecipients.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    };

  } catch (error) {
    console.error('[SendReport] Error sending inspection report:', error);
    throw new Error(`Failed to format inspection message: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const formatVerificationCode = (verificationCode: string): string => {
  return `
🔐 *Your Verification Code*

Code: *${verificationCode}*

⏰ This code will expire in 5 minutes.
🔒 Keep this code private and secure.`.trim();
};

export const sendVerificationCode = async (verificationCode: string, phoneNumber: string): Promise<any> => {
  try {
    console.log(`[VerificationCode] Sending code to ${phoneNumber}`);
    
    const messageContent = formatVerificationCode(verificationCode);

    const result = await sendWhatsAppMessage({
      message: messageContent,
      to: phoneNumber
    });

    console.log(`[VerificationCode] Code sent successfully to ${phoneNumber}`);
    return result;
    
  } catch (error) {
    console.error('[VerificationCode] Failed to send verification code:', error);
    throw new Error(`Failed to send verification code: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Enhanced sendApprovalNotification dengan better error handling
 */
export const sendApprovalNotification = async (
  inspectionId: number,
  action: 'approved' | 'rejected',
  comment: string,
  approverName: string,
  role: 'qc' | 'pm',
  recipientNumbers: string[] = []
): Promise<any> => {
  try {
    console.log(`[ApprovalNotification] Sending ${action} notification for inspection ${inspectionId}`);
    
    const actionText = action === 'approved' ? 'APPROVED' : 'REJECTED';
    const roleText = role === 'qc' ? 'Quality Control' : 'Project Manager';
    
    const messageContent = `
*Inspection #${inspectionId} ${actionText}*
By: ${approverName} (${roleText})
Comment: ${comment || 'No comment provided'}

Status: ${action === 'approved' 
  ? (role === 'qc' ? 'Waiting for PM approval' : 'Fully approved') 
  : 'Rejected - requires revision'}
    `.trim();
    
    // Default admin number (commented out as per original)
    const adminNumber = ''; // process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '';
    const allRecipients = Array.from(new Set([adminNumber, ...recipientNumbers]))
      .filter(Boolean)
      .filter(num => num.trim().length > 0);
    
    if (allRecipients.length === 0) {
      console.warn('[ApprovalNotification] No recipients configured, skipping notification');
      return { success: true, message: 'No recipients configured' };
    }
    
    // Send to all recipients with individual error handling
    const results = await Promise.allSettled(
      allRecipients.map(async (recipient) => {
        try {
          const result = await sendWhatsAppMessage({
            message: messageContent,
            to: recipient
          });
          console.log(`[ApprovalNotification] Successfully sent to ${recipient}`);
          return { recipient, success: true, result };
        } catch (error) {
          console.error(`[ApprovalNotification] Failed to send to ${recipient}:`, error);
          return { recipient, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    console.log(`[ApprovalNotification] Notification sent: ${successful.length} successful, ${failed.length} failed`);

    return {
      success: successful.length > 0,
      total: allRecipients.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    };
    
  } catch (error) {
    console.error('[ApprovalNotification] Error sending approval notification:', error);
    throw new Error(`Failed to format inspection message: ${error instanceof Error ? error.message : String(error)}`);
  }
};