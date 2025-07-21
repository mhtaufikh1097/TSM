"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { 
  Home, 
  AlertTriangle, 
  FileText, 
  BarChart3, 
  Bell, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  User,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

interface SidebarProps {
  className?: string
  isMobile?: boolean
  isOpen?: boolean
  onToggle?: () => void
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Inspeksi", href: "/incidents", icon: AlertTriangle, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Analitik", href: "/reports", icon: BarChart3, roles: ["ADMIN", "PM"] },
  { name: "Notifikasi", href: "/notifications", icon: Bell, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
  { name: "Pengguna", href: "/users", icon: Users, roles: ["ADMIN"] },
  { name: "Pengaturan", href: "/settings", icon: Settings, roles: ["ADMIN", "REPORTER", "QC", "PM"] },
]

export default function Sidebar({ className = "", isMobile = false, isOpen = true, onToggle }: SidebarProps) {
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/logo-wika.png" 
              alt="WIKA Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900">WIKA TSM</h1>
            <p className="text-xs text-gray-600">Inspection System</p>
          </div>
        </div>
        {isMobile && onToggle && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className="p-2 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "User"}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(session?.user?.role || "")}`}>
                {session?.user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => isMobile && onToggle && onToggle()}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-gray-400"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Keluar
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        {/* Mobile Overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
        
        {/* Mobile Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {sidebarContent}
        </div>
      </>
    )
  }

  // Desktop Sidebar
  return (
    <div className={`w-64 border-r border-gray-200 ${className}`}>
      {sidebarContent}
    </div>
  )
}
