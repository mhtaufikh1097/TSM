"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Bell, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "QC Review", href: "/qc-review", icon: CheckCircle2, roles: ["ADMIN", "QC"] },
  { name: "PM Approval", href: "/pm-approval", icon: Clock, roles: ["ADMIN", "PM"] },
  { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN", "PM"] },
  { name: "Notifications", href: "/notifications", icon: Bell, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
]

export default function Sidebar({ className = "" }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: "/auth/login",
      redirect: true
    })
  }

  const filteredNavigation = navigation.filter(item => 
    session?.user.role && item.roles.includes(session.user.role)
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-800"
      case "QC": return "bg-blue-100 text-blue-800"
      case "PM": return "bg-green-100 text-green-800"
      case "REPORTER": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Incident System</h1>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "User"}
            </p>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(session?.user?.role || "")}`}>
                {session?.user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-blue-700" : "text-gray-400"}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  )
}
