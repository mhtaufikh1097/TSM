"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Menu, Bell, LogOut, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface HeaderProps {
  onMenuClick?: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!session?.user) return
      
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.stats?.unread || 0)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }

    fetchUnreadCount()
    
    // Polling setiap 30 detik untuk update realtime
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [session])

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: "/auth/login",
      redirect: true
    })
  }

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
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu + Title */}
        <div className="flex items-center space-x-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          {title && (
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
          )}
        </div>

        {/* Center - Logo for mobile */}
        <div className="flex lg:hidden items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TSM</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">System</span>
        </div>

        {/* Right side - Notifications + User */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <Link href="/notifications">
            <Button variant="ghost" size="sm" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {session?.user?.name || "User"}
                </div>
                <div className="text-xs text-gray-500">
                  {session?.user?.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </Button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {session?.user?.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {session?.user?.email}
                      </div>
                      <Badge className={`mt-2 text-xs ${getRoleColor(session?.user?.role || "")}`}>
                        {session?.user?.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowUserMenu(false)
                      window.location.href = "/settings"
                    }}
                    className="w-full justify-start px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Profile Settings
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Keluar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}
