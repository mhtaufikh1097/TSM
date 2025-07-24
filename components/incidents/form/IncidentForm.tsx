"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  AlertCircle, 
  Save, 
  Send,
  Clock,
  MapPin,
  AlertTriangle
} from "lucide-react"
import { incidentFormSchema, IncidentFormData, IncidentDraftData } from "@/lib/validations/incident"
import { cn } from "@/lib/utils"

interface FilePreview {
  file: File
  id: string
  preview?: string
}

const DRAFT_KEY = "incident-form-draft"
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "bg-gray-100 text-gray-800", dotColor: "bg-gray-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-800", dotColor: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
]

export default function IncidentForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [draftSaved, setDraftSaved] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      priority: "MEDIUM"
    }
  })

  const watchedValues = watch()

  // Load draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft) {
      try {
        const draft: IncidentDraftData = JSON.parse(savedDraft)
        Object.entries(draft).forEach(([key, value]) => {
          if (value !== undefined) {
            setValue(key as keyof IncidentFormData, value)
          }
        })
      } catch (error) {
        console.error("Error loading draft:", error)
      }
    }
  }, [setValue])

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft: IncidentDraftData = {
        title: watchedValues.title,
        description: watchedValues.description,
        location: watchedValues.location,
        occurredAt: watchedValues.occurredAt,
        priority: watchedValues.priority
      }

      // Only save if at least one field has content
      const hasContent = Object.values(draft).some(value => value && value.trim() !== "")
      
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [watchedValues])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    files.forEach(file => {
      const id = Math.random().toString(36).substr(2, 9)
      const filePreview: FilePreview = { file, id }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreviews(prev => 
            prev.map(fp => 
              fp.id === id ? { ...fp, preview: e.target?.result as string } : fp
            )
          )
        }
        reader.readAsDataURL(file)
      }

      setFilePreviews(prev => [...prev, filePreview])
    })

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (id: string) => {
    setFilePreviews(prev => prev.filter(fp => fp.id !== id))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const formData = new FormData()
      
      // Append form fields
      formData.append("title", data.title)
      formData.append("description", data.description)
      formData.append("location", data.location)
      formData.append("occurredAt", data.occurredAt)
      formData.append("priority", data.priority)

      // Append files
      filePreviews.forEach(({ file }) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/incidents/create", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create incident")
      }

      // Clear draft and form
      localStorage.removeItem(DRAFT_KEY)
      reset()
      setFilePreviews([])

      // Redirect to incident detail or list
      router.push(`/incidents/detail/${result.incident.id}`)

    } catch (error) {
      console.error("Error submitting form:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to submit incident")
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveDraft = () => {
    const draft: IncidentDraftData = {
      title: watchedValues.title,
      description: watchedValues.description,
      location: watchedValues.location,
      occurredAt: watchedValues.occurredAt,
      priority: watchedValues.priority
    }

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Report New Inspection</h1>
          <p className="text-gray-700 mt-2">Provide detailed information about the inspection findings</p>
        </div>
        
        {draftSaved && (
          <div className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
            <Save className="w-4 h-4 mr-1" />
            Draft saved
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Inspection Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Brief description of the inspection"
                className={cn(
                  "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                  errors.title && "border-red-500"
                )}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Provide a detailed description of what was inspected, including any findings and immediate actions taken..."
                rows={6}
                className={cn(
                  "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                  errors.description && "border-red-500"
                )}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location *
                </Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Where was the inspection conducted?"
                  className={cn(
                    "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                    errors.location && "border-red-500"
                  )}
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="occurredAt" className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Inspection Date & Time *
                </Label>
                <Input
                  id="occurredAt"
                  type="datetime-local"
                  {...register("occurredAt")}
                  className={cn(
                    "bg-white border-gray-300 text-gray-900",
                    errors.occurredAt && "border-red-500"
                  )}
                />
                {errors.occurredAt && (
                  <p className="text-red-500 text-sm mt-1">{errors.occurredAt.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Priority Level *</Label>
              <Select
                value={watchedValues.priority}
                onValueChange={(value: string) => setValue("priority", value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")}
              >
                <SelectTrigger className={cn(
                  "bg-white border-gray-300 text-gray-900",
                  errors.priority && "border-red-500"
                )}>
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-gray-900 hover:bg-gray-50 focus:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full mr-2",
                          option.dotColor
                        )} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Evidence & Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Upload Files (Optional)</Label>
              <p className="text-sm text-gray-600 mb-3">
                Upload images, documents, or other evidence related to the incident.
                Max 10 files, 10MB each.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-dashed border-2 hover:border-blue-500"
              >
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </span>
                </div>
              </Button>
            </div>

            {/* File Previews */}
            {filePreviews.length > 0 && (
              <div className="space-y-3">
                <Label>Uploaded Files ({filePreviews.length})</Label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filePreviews.map(({ file, id, preview }) => (
                    <div key={id} className="flex items-center p-3 border rounded-lg">
                      <div className="flex-shrink-0 mr-3">
                        {preview ? (
                          <img 
                            src={preview} 
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(id)}
                        className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errors.files && (
              <p className="text-red-500 text-sm">{errors.files.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={saveDraft}
            disabled={isSubmitting}
            className="order-2 sm:order-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px] order-1 sm:order-2"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </div>
            ) : (
              <div className="flex items-center">
                <Send className="w-4 h-4 mr-2" />
                Submit Incident
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
