"use client"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import RoleGuard from "@/components/auth/RoleGuard"
import IncidentForm from "@/components/incidents/form/IncidentForm"

export default function CreateIncidentPage() {
  return (
    <DashboardLayout>
      <RoleGuard allowedRoles={["REPORTER", "ADMIN"]}>
        <div className="min-h-screen bg-gray-50">
          <IncidentForm />
        </div>
      </RoleGuard>
    </DashboardLayout>
  )
}
