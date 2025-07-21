"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  AlertTriangle, 
  BarChart3, 
  Bell, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  User,
  Menu,
  X,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import Header from "./Header"

interface ResponsiveSidebarProps {
  children: React.ReactNode
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Inspeksi", href: "/incidents", icon: AlertTriangle, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Analitik", href: "/reports", icon: BarChart3, roles: ["ADMIN", "PM"] },
  { name: "Notifikasi", href: "/notifications", icon: Bell, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "WhatsApp", href: "/admin/whatsapp", icon: MessageSquare, roles: ["ADMIN"] },
  { name: "Pengguna", href: "/users", icon: Users, roles: ["ADMIN"] },
  { name: "Pengaturan", href: "/settings", icon: Settings, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/logo-wika.png" 
              alt="WIKA Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">WIKA TSM</h1>
            <p className="text-xs text-gray-600">Inspection System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mr-3 transition-colors",
                isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
              )} />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info Footer - Only show on mobile */}
      <div className="lg:hidden px-3 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "User"}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                getRoleColor(session?.user?.role || "")
              )}>
                {session?.user?.role}
              </span>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl py-3"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  )
}

export default function ResponsiveSidebar({ children }: ResponsiveSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-white lg:shadow-lg">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col">
        {/* Top bar for mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="p-2"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo-wika.png" 
                    alt="WIKA Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">WIKA TSM</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
