import { z } from "zod"

export const incidentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must not exceed 200 characters"),
  
  description: z
    .string()
    .min(1, "Description is required")
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must not exceed 2000 characters"),
  
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location must not exceed 200 characters"),
  
  occurredAt: z
    .string()
    .min(1, "Inspection date and time is required")
    .refine((date) => {
      const inspectionDate = new Date(date)
      const now = new Date()
      // Allow future dates but not past dates (older than now)
      return inspectionDate >= now
    }, "Inspection date cannot be in the past"),
  
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    message: "Priority is required",
  }),
  
  files: z
    .array(z.instanceof(File))
    .optional()
    .refine((files) => {
      if (!files) return true
      return files.length <= 10
    }, "Maximum 10 files allowed")
    .refine((files) => {
      if (!files) return true
      const maxSize = 10 * 1024 * 1024 // 10MB
      return files.every(file => file.size <= maxSize)
    }, "Each file must be less than 10MB")
    .refine((files) => {
      if (!files) return true
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
      return files.every(file => allowedTypes.includes(file.type))
    }, "Only images, PDF, Word documents, and text files are allowed")
})

export type IncidentFormData = z.infer<typeof incidentFormSchema>

// Draft schema for auto-save (all fields optional)
export const incidentDraftSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  occurredAt: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
})

export type IncidentDraftData = z.infer<typeof incidentDraftSchema>
