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
 * Sends a WhatsApp message to the specified recipient
 * @param {WhatsAppMessageParams} params - Message content and recipient
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
export const sendWhatsAppMessage = async (params: WhatsAppMessageParams): Promise<any> => {
  try {
    const baseUrl =
      typeof window === "undefined"
        ? process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        : "";

    const response = await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

/**
 * Generates an approval link with a unique token
 * @param {number} inspectionId - The ID of the inspection
 * @param {'qc'|'pm'} role - The role that should approve
 * @returns {string} - The approval link
 */
/**
 * Enhanced generateDetailLink dengan database storage
 */
export const generateDetailLink = async (
  inspectionId: number,
  role: 'qc' | 'pm'
): Promise<string> => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002"
      : window.location.origin;

  // Kirim expirationHours dengan nama yang benar
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/store/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspectionId, role, expirationHours: 24 }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to get approval token');
  }

  return `${baseUrl}/inspections/detail/${inspectionId}?token=${result.token}&role=${role}`;
};

/**
 * Validates an approval token
 * @param {string} token - The approval token to validate
 * @returns {ApprovalLink|null} - The approval details or null if invalid
 */
/**
 * Enhanced validateApprovalToken dengan database
 */
export const validateApprovalToken = async (
  token: string
): Promise<ApprovalLink | null> => {
  try {
    const baseUrl =
      typeof window === "undefined"
        ? process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002"
        : window.location.origin;

    const response = await fetch(`${baseUrl}/api/store/validate?token=${encodeURIComponent(token)}`);
    if (!response.ok) {
      return null;
    }
    const tokenData = await response.json();

    if (tokenData.isUsed) {
      console.log('Token already used:', token);
      return null;
    }

    return {
      token: tokenData.token,
      inspectionId: tokenData.inspectionId,
      role: tokenData.role,
    };
  } catch (error) {
    console.error('Error validating approval token:', error);
    return null;
  }
};

/**
 * Formats inspection data into a WhatsApp message with approval links
 * @param {any} inspectionData - The inspection form data
 * @param {number} inspectionId - The ID of the saved inspection
 * @returns {string} - Formatted message string
 */
/**
 * Enhanced formatInspectionMessage dengan async generateDetailLink
 */
export const formatInspectionMessage = async (
  inspectionData: any,
  inspectionId: number
): Promise<string> => {
  const qcDetailLink = await generateDetailLink(inspectionId, 'qc');
  const pmDetailLink = await generateDetailLink(inspectionId, 'pm');

  const message = `
🔍 *New Inspection Report #${inspectionId}*

📋 **Details:**
• Type: ${inspectionData.inspectionType}
• Location: ${inspectionData.location}
• Inspector: ${inspectionData.inspectorName || 'N/A'}
• Severity: ${inspectionData.severity.toUpperCase()}

📝 **Findings:**
${inspectionData.findings}

⚠️ **Action Required:**
${inspectionData.actionRequired}

📅 Created: ${new Date().toLocaleString()}

*Review Links:*
🔍 QC Review: ${qcDetailLink}
📋 PM Review: ${pmDetailLink}

Click the link above to view full details and take action.
  `.trim();

  return message;
};

/**
 * Sends an inspection report via WhatsApp with approval links
 * @param {any} inspectionData - The inspection form data
 * @param {number} inspectionId - The ID of the saved inspection
 * @param {string[]} recipientNumbers - List of WhatsApp numbers to notify
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
/**
 * Enhanced sendInspectionReport dengan async message formatting
 */
export const sendInspectionReport = async (
  inspectionData: any,
  inspectionId: number,
  recipientNumbers: string[] = []
): Promise<any> => {
  const messageContent = await formatInspectionMessage(inspectionData, inspectionId);

  // Default admin number
  const adminNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '';

  // Combine admin number with additional recipients
  const allRecipients = Array.from(new Set([adminNumber, ...recipientNumbers])).filter(Boolean);

  // Send to all recipients
  const sendPromises = allRecipients.map(recipient =>
    sendWhatsAppMessage({
      message: messageContent,
      to: recipient
    })
  );

  return Promise.all(sendPromises);
};

export const formatVerificationCode = (verificationCode: string): string => {
 return `
🔐 *Your Verification Code*

Code: *${verificationCode}*

⏰ This code will expire in 5 minutes.
🔒 Keep this code private and secure.`.trim();
};

export const sendVerificationCode = async (verificationCode: string, phoneNumber: string): Promise<any> => {
  const messageContent = formatVerificationCode(verificationCode);

  return sendWhatsAppMessage({
    message: messageContent,
    to: phoneNumber
  });
};

/**
 * Sends a notification about an approval action
 * @param {any} inspectionData - The inspection data
 * @param {'approved'|'rejected'} action - The action taken
 * @param {string} comment - Comment provided with the action
 * @param {string} approverName - Name of the person who took the action
 * @param {string} role - Role of the approver (qc or pm)
 * @param {string[]} recipientNumbers - List of WhatsApp numbers to notify
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
export const sendApprovalNotification = async (
  inspectionId: number,
  action: 'approved' | 'rejected',
  comment: string,
  approverName: string,
  role: 'qc' | 'pm',
  recipientNumbers: string[] = []
): Promise<any> => {
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
  
  // Default admin number
  const adminNumber = ''; //process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '';
  const allRecipients = Array.from(new Set([adminNumber, ...recipientNumbers])).filter(Boolean);
  
  // Send to all recipients
  const sendPromises = allRecipients.map(recipient => 
    sendWhatsAppMessage({
      message: messageContent,
      to: recipient
    })
  );
  
  return Promise.all(sendPromises);
};