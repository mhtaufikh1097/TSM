"use client"

import Sidebar from "@/components/layouts/Sidebar"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, MapPin, Calendar } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function CreateIncidentPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    priority: "MEDIUM",
    occurredAt: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/incidents">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Incidents
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Report New Incident
            </h1>
            <p className="mt-1 text-gray-600">
              Provide detailed information about the incident for proper tracking
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Incident Title *
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Brief description of the incident"
                    required
                    className="h-12"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Detailed Description *
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed information about what happened, when, and any immediate actions taken..."
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location *
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Specify the exact location where the incident occurred"
                      required
                      className="h-12 pl-10"
                    />
                  </div>
                </div>

                {/* Priority and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                      Priority Level
                    </Label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full h-12 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occurredAt" className="text-sm font-medium text-gray-700">
                      When did this occur? *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="occurredAt"
                        name="occurredAt"
                        type="datetime-local"
                        value={formData.occurredAt}
                        onChange={handleInputChange}
                        required
                        className="h-12 pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Attachments (Optional)
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drop files here or click to upload
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported formats: JPG, PNG, PDF, DOC (Max 10MB)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-6">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none h-12"
                  >
                    Submit Incident Report
                  </Button>
                  <Link href="/incidents" className="flex-1 sm:flex-none">
                    <Button type="button" variant="outline" className="w-full h-12">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
