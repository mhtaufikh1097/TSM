import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import ModernWhatsAppDashboard from "@/components/admin/whatsapp/ModernWhatsAppDashboard"

export const metadata = {
  title: "WhatsApp Management - TSM System (Updated July 25, 2025)",
  description: "WhatsApp integration management dashboard - Modern UI",
}

export default async function AdminWhatsAppPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/login")
  }

  return (
    <DashboardLayout>
      <ModernWhatsAppDashboard />
    </DashboardLayout>
  )
}
