export const ROLES = {
  ADMIN: 'ADMIN',
  REPORTER: 'REPORTER',
  QC: 'QC',
  PM: 'PM'
} as const

export const STATUS = {
  PENDING_QC: 'PENDING_QC',
  APPROVED_QC: 'APPROVED_QC',
  REJECTED_QC: 'REJECTED_QC',
  PENDING_PM: 'PENDING_PM',
  APPROVED_PM: 'APPROVED_PM',
  REJECTED_PM: 'REJECTED_PM'
} as const

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export const WHATSAPP_MESSAGES = {
  NEW_INCIDENT: (incident: any) => 
    `🚨 *Tiket Insiden Baru*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `📍 *Lokasi:* ${incident.location}\n` +
    `👤 *Pelapor:* ${incident.reporter.name}\n` +
    `🕒 *Waktu:* ${incident.occurredAt}\n\n` +
    `Silakan cek dan proses: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  QC_APPROVED: (incident: any) => 
    `✅ *Tiket Disetujui QC*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *QC:* ${incident.qc.name}\n` +
    `🕒 *Waktu Approval:* ${incident.qcAt}\n\n` +
    `Menunggu final approval PM: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  QC_REJECTED: (incident: any) => 
    `❌ *Tiket Ditolak QC*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *QC:* ${incident.qc.name}\n` +
    `💬 *Komentar:* ${incident.qcComment}\n\n` +
    `Detail: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  PM_APPROVED: (incident: any) => 
    `✅ *Tiket Disetujui Final*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *PM:* ${incident.pm.name}\n` +
    `🕒 *Waktu Approval:* ${incident.pmAt}\n\n` +
    `Tiket telah disetujui dan dapat diproses lebih lanjut.`,
    
  PM_REJECTED: (incident: any) => 
    `❌ *Tiket Ditolak Final*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *PM:* ${incident.pm.name}\n` +
    `💬 *Komentar:* ${incident.pmComment}\n\n` +
    `Tiket telah ditolak secara final.`
}
