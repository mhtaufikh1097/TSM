"use client"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import IncidentList from "@/components/incidents/list/IncidentList"

export default function IncidentsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <IncidentList />
      </div>
    </DashboardLayout>
  )
}
