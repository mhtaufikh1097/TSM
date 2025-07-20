import { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import UserSettingsComponent from "@/components/settings/UserSettings"

export const metadata: Metadata = {
  title: "User Settings - TSM Incident System",
  description: "Update your profile and notification settings",
}

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }

  return (
    <DashboardLayout>
      <UserSettingsComponent />
    </DashboardLayout>
  )
}
