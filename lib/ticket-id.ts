/**
 * Generate ticket ID yang mudah diingat dengan format: TSM-YYYY-XXXX
 * Contoh: TSM-2025-0001, TSM-2025-0002, dll.
 */

export function generateTicketId(): string {
  const currentYear = new Date().getFullYear()
  const timestamp = Date.now().toString()
  
  // Ambil 4 digit terakhir dari timestamp dan pad dengan 0
  const lastDigits = timestamp.slice(-4)
  const paddedNumber = lastDigits.padStart(4, '0')
  
  return `TSM-${currentYear}-${paddedNumber}`
}

/**
 * Generate ticket ID sequential berdasarkan database
 * Format: TSM-YYYY-NNNN (N = nomor urut)
 */
export function generateSequentialTicketId(lastTicketNumber: number = 0): string {
  const currentYear = new Date().getFullYear()
  const nextNumber = lastTicketNumber + 1
  const paddedNumber = nextNumber.toString().padStart(4, '0')
  
  return `TSM-${currentYear}-${paddedNumber}`
}

/**
 * Extract nomor urut dari ticket ID
 */
export function extractTicketNumber(ticketId: string): number {
  const match = ticketId.match(/TSM-\d{4}-(\d{4})/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Validate format ticket ID
 */
export function isValidTicketId(ticketId: string): boolean {
  return /^TSM-\d{4}-\d{4}$/.test(ticketId)
}
