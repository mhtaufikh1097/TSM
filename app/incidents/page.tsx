"use client"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import IncidentList from "@/components/incidents/list/IncidentList"

export default function IncidentsPage() {
  return (
    <DashboardLayout>
      <IncidentList />
    </DashboardLayout>
  )
}
