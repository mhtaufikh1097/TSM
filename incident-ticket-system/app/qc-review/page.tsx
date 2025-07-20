"use client"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import RoleGuard from "@/components/auth/RoleGuard"
import QCDashboard from "@/components/qc/dashboard/QCDashboard"

export default function QCReviewPage() {
  return (
    <DashboardLayout>
      <RoleGuard allowedRoles={["QC", "ADMIN"]}>
        <QCDashboard />
      </RoleGuard>
    </DashboardLayout>
  )
}
