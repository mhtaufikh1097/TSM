import nodemailer from "nodemailer"

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    // Email configuration from environment variables
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
      }
    }

    // Only create transporter if email credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig)
    } else {
      console.warn("Email credentials not configured. Email features will be disabled.")
    }
  }

  async sendEmail(options: {
    to: string | string[]
    subject: string
    html?: string
    text?: string
    attachments?: Array<{
      filename: string
      content: Buffer
      contentType: string
    }>
  }) {
    if (!this.transporter) {
      throw new Error("Email service not configured")
    }

    const mailOptions = {
      from: `"TSM Incident System" <${process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    }

    try {
      const result = await this.transporter.sendMail(mailOptions)
      console.log("Email sent successfully:", result.messageId)
      return result
    } catch (error) {
      console.error("Error sending email:", error)
      throw error
    }
  }

  async sendReportEmail(options: {
    recipients: string[]
    reportType: string
    dateRange: { from: string; to: string }
    pdfBuffer: Buffer
    summary: {
      totalIncidents: number
      resolutionRate: number
      urgentIncidents: number
    }
  }) {
    const { recipients, reportType, dateRange, pdfBuffer, summary } = options

    const subject = `TSM Incident Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} (${dateRange.from} to ${dateRange.to})`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>TSM Incident Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
          }
          .content {
            padding: 30px 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          .stat-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #667eea;
          }
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 5px;
          }
          .stat-label {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .download-section {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .download-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 10px;
          }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
          }
          .urgent-alert {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
          }
          .urgent-alert h3 {
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 TSM Incident Report</h1>
            <p>Period: ${dateRange.from} to ${dateRange.to}</p>
          </div>
          
          <div class="content">
            <h2>Executive Summary</h2>
            <p>Your ${reportType} incident report for the specified period is ready for review.</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${summary.totalIncidents}</div>
                <div class="stat-label">Total Incidents</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${summary.resolutionRate}%</div>
                <div class="stat-label">Resolution Rate</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${summary.urgentIncidents}</div>
                <div class="stat-label">Urgent Cases</div>
              </div>
            </div>

            ${summary.urgentIncidents > 0 ? `
              <div class="urgent-alert">
                <h3>⚠️ Attention Required</h3>
                <p>There are ${summary.urgentIncidents} urgent incidents that require immediate attention. Please review the detailed report for more information.</p>
              </div>
            ` : ''}
            
            <div class="download-section">
              <h3>📊 Detailed Report</h3>
              <p>The complete ${reportType} report with charts, detailed analysis, and incident breakdown is attached to this email.</p>
              <p><strong>File:</strong> incident-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf</p>
            </div>

            <h3>📈 Key Insights</h3>
            <ul>
              <li><strong>Performance:</strong> ${summary.resolutionRate >= 80 ? 'Excellent' : summary.resolutionRate >= 60 ? 'Good' : 'Needs Improvement'} resolution rate</li>
              <li><strong>Workload:</strong> ${summary.totalIncidents > 50 ? 'High' : summary.totalIncidents > 20 ? 'Moderate' : 'Low'} incident volume</li>
              <li><strong>Priority:</strong> ${summary.urgentIncidents > 5 ? 'High priority' : 'Standard priority'} cases detected</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This report was automatically generated by the TSM Incident Management System.</p>
            <p>For questions or support, contact your system administrator.</p>
            <p><small>Generated on ${new Date().toLocaleString()}</small></p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
TSM Incident Report - ${reportType}
Period: ${dateRange.from} to ${dateRange.to}

Executive Summary:
- Total Incidents: ${summary.totalIncidents}
- Resolution Rate: ${summary.resolutionRate}%
- Urgent Cases: ${summary.urgentIncidents}

The detailed report is attached as a PDF file.

This report was automatically generated by the TSM Incident Management System.
Generated on ${new Date().toLocaleString()}
    `

    const attachments = [{
      filename: `incident-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]

    return this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
      attachments
    })
  }

  async sendScheduledReportNotification(options: {
    recipients: string[]
    scheduleName: string
    nextRunDate: Date
  }) {
    const { recipients, scheduleName, nextRunDate } = options

    const subject = `Scheduled Report Configured: ${scheduleName}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">📅 Scheduled Report Configuration</h2>
        <p>A new scheduled report has been configured:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Report Name:</strong> ${scheduleName}<br>
          <strong>Next Run:</strong> ${nextRunDate.toLocaleString()}<br>
          <strong>Recipients:</strong> ${recipients.join(', ')}
        </div>
        <p>You will receive automated reports according to this schedule.</p>
        <p><small>TSM Incident Management System</small></p>
      </div>
    `

    return this.sendEmail({
      to: recipients,
      subject,
      html
    })
  }

  isConfigured(): boolean {
    return this.transporter !== null
  }
}

export const emailService = new EmailService()
