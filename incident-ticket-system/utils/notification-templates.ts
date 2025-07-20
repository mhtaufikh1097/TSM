import { Incident, User } from '@prisma/client'

export interface CustomNotificationTemplate {
  qcReview: (incident: IncidentWithReporter, baseUrl: string, token: string) => string
  pmReview: (incident: IncidentWithReporter, baseUrl: string, token: string) => string
  qcApproved: (incident: IncidentWithUsers, comment?: string) => string
  qcRejected: (incident: IncidentWithUsers, comment?: string) => string
  pmApproved: (incident: IncidentWithUsers, comment?: string) => string
  pmRejected: (incident: IncidentWithUsers, comment?: string) => string
}

interface IncidentWithReporter extends Incident {
  reporter: User
}

interface IncidentWithUsers extends Incident {
  reporter: User
  qc?: User | null
  pm?: User | null
}

export const customNotificationTemplates: CustomNotificationTemplate = {
  qcReview: (incident, baseUrl, token) => `
🚨 *New Incident Report - QC Review Required*

🎫 *Ticket ID:* ${incident.id}

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• Severity: ${incident.priority}

📝 *Findings:*
${incident.description}

⚠️ *Action Required:*
Please review this incident report and take appropriate action.

📅 Created: ${new Date(incident.createdAt).toLocaleString('en-US')}

Review Links:
🔍 QC Review: ${baseUrl}/incidents/detail/${incident.id}?token=${token}&role=qc

Click the link above to view full details and take action.
  `.trim(),

  pmReview: (incident, baseUrl, token) => `
🚨 *Incident Report - PM Approval Required*

🎫 *Ticket ID:* ${incident.id}

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• Severity: ${incident.priority}

📝 *Findings:*
${incident.description}

⚠️ *Action Required:*
QC has approved this incident. Final approval required.

📅 Created: ${new Date(incident.createdAt).toLocaleString('en-US')}

Review Links:
📋 PM Review: ${baseUrl}/incidents/detail/${incident.id}?token=${token}&role=pm

Click the link above to view full details and take action.
  `.trim(),

  qcApproved: (incident, comment) => `
✅ *Incident Approved by QC*

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• QC: ${incident.qc?.name || 'Unknown'}

📝 *QC Notes:*
${comment || 'No additional comments'}

📅 Approved: ${new Date().toLocaleString('en-US')}

✅ Status: Forwarded to PM for final approval
  `.trim(),

  qcRejected: (incident, comment) => `
❌ *Incident Rejected by QC*

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• QC: ${incident.qc?.name || 'Unknown'}

📝 *Rejection Reason:*
${comment || 'No reason provided'}

📅 Rejected: ${new Date().toLocaleString('en-US')}

❌ Status: Incident requires revision
  `.trim(),

  pmApproved: (incident, comment) => `
🎉 *Incident FINAL APPROVED*

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• PM: ${incident.pm?.name || 'Unknown'}

📝 *PM Notes:*
${comment || 'No additional comments'}

📅 Final Approval: ${new Date().toLocaleString('en-US')}

✅ Status: APPROVED - Work will commence shortly
📞 Field team will contact you soon
  `.trim(),

  pmRejected: (incident, comment) => `
❌ *Incident REJECTED by PM*

📋 *Details:*
• Type: ${incident.title}
• Location: ${incident.location}
• Inspector: ${incident.reporter.name}
• PM: ${incident.pm?.name || 'Unknown'}

📝 *Rejection Reason:*
${comment || 'No reason provided'}

📅 Rejected: ${new Date().toLocaleString('en-US')}

❌ Status: Incident rejected - Please review and resubmit if necessary
  `.trim()
}
