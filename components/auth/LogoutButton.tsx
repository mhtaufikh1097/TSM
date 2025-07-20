"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface LogoutButtonProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export default function LogoutButton({ className, variant = "ghost" }: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: "/auth/login",
      redirect: true
    })
  }

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      className={className}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  )
}
