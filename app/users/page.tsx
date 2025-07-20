import { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import UserManagement from "@/components/admin/users/UserManagement"

export const metadata: Metadata = {
  title: "User Management - TSM System",
  description: "Manage users, roles, and permissions",
}

export default async function UsersPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/login")
  }

  return (
    <DashboardLayout>
      <UserManagement />
    </DashboardLayout>
  )
}
