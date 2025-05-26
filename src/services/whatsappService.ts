/**
 * Enhanced service for handling WhatsApp messages including approval links
 */
import { nanoid } from 'nanoid';

interface WhatsAppMessageParams {
  message: string;
  to: string;
}

interface ApprovalLink {
  role: 'qc' | 'pm';
  token: string;
  inspectionId: number;
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
export const generateApprovalLink = (inspectionId: number, role: 'qc' | 'pm'): string => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      : window.location.origin;
  
  const token = nanoid(10);
  
  // Store token with inspection details (in a real app, this would be in a database)
  approvalTokens.set(token, {
    role,
    token,
    inspectionId
  });
  
  return `${baseUrl}/inspections/approve/${token}`;
};

/**
 * Validates an approval token
 * @param {string} token - The approval token to validate
 * @returns {ApprovalLink|null} - The approval details or null if invalid
 */
export const validateApprovalToken = (token: string): ApprovalLink | null => {
  const approvalDetails = approvalTokens.get(token);
  
  if (!approvalDetails) {
    return null;
  }
  
  // In a production environment, you might want to check expiration time
  return approvalDetails;
};

/**
 * Formats inspection data into a WhatsApp message with approval links
 * @param {any} inspectionData - The inspection form data
 * @param {number} inspectionId - The ID of the saved inspection
 * @returns {string} - Formatted message string
 */
export const formatInspectionMessage = (inspectionData: any, inspectionId: number): string => {
  const qcApprovalLink = generateApprovalLink(inspectionId, 'qc');
  const pmApprovalLink = generateApprovalLink(inspectionId, 'pm');
  
  return `
*New Inspection Report #${inspectionId}*
Type: ${inspectionData.inspectionType}
Location: ${inspectionData.location}
Inspector: ${inspectionData.inspectorName}
Findings: ${inspectionData.findings}
Action Required: ${inspectionData.actionRequired}
Severity: ${inspectionData.severity.toUpperCase()}

*Approval Links:*
QC Approval: ${qcApprovalLink}
PM Approval: ${pmApprovalLink}
  `.trim();
};

/**
 * Sends an inspection report via WhatsApp with approval links
 * @param {any} inspectionData - The inspection form data
 * @param {number} inspectionId - The ID of the saved inspection
 * @param {string[]} recipientNumbers - List of WhatsApp numbers to notify
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
export const sendInspectionReport = async (
  inspectionData: any, 
  inspectionId: number,
  recipientNumbers: string[] = []
): Promise<any> => {
  const messageContent = formatInspectionMessage(inspectionData, inspectionId);
  
  // Default admin number
  const adminNumber = ''; // process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '';
  
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
*Your Verification Code*
Code: ${verificationCode}`.trim();
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
  
  // Combine admin number with additional recipients
  // const allRecipients = [...new Set([adminNumber, ...recipientNumbers])].filter(Boolean);

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