// services/whatsappService.ts
/**
 * Service for handling WhatsApp message sending
 */

interface WhatsAppMessageParams {
  message: string;
  to: string;
}

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
 * Formats inspection data into a WhatsApp message
 * @param {any} inspectionData - The inspection form data
 * @returns {string} - Formatted message string
 */
export const formatInspectionMessage = (inspectionData: any): string => {
  return `
*New Inspection Report*
Type: ${inspectionData.inspectionType}
Location: ${inspectionData.location}
Inspector: ${inspectionData.inspectorName}
Findings: ${inspectionData.findings}
Action Required: ${inspectionData.actionRequired}
Severity: ${inspectionData.severity.toUpperCase()}
  `.trim();
};

/**
 * Sends an inspection report via WhatsApp
 * @param {any} inspectionData - The inspection form data
 * @returns {Promise<any>} - Response from the WhatsApp API
 */
export const sendInspectionReport = async (inspectionData: any): Promise<any> => {
  const messageContent = formatInspectionMessage(inspectionData);
  
  return sendWhatsAppMessage({
    message: messageContent,
    to: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || ''
  });
};


export const formatVerificationCode = (verificationCode: any): string => {
  return `
  *Your Verification Code*
  Code : ${verificationCode}`.trim();
};


export const sendVerificationCode = async (verificationcode: string, phone_number: any): Promise<any> => {
  const messageContent = formatVerificationCode(verificationcode);

  return sendWhatsAppMessage({
    message: messageContent,
    to: phone_number || ''
  });
};