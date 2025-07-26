"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Menu, Bell, LogOut, User, ChevronDown, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

interface HeaderProps {
  onMenuClick?: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<any[]>([])
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!session?.user) return
      
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.stats?.unread || 0)
          setRecentNotifications(data.notifications?.slice(0, 3) || [])
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    
    // Polling setiap 30 detik untuk update realtime
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [session])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Don't close if clicking on a button inside the dropdown
      if (target.closest('[data-dropdown-button]')) {
        return
      }
      
      if (showNotifications || showUserMenu) {
        setShowNotifications(false)
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications, showUserMenu])

  const handleLogout = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    try {
      setIsLoggingOut(true)
      setShowUserMenu(false)
      
      console.log("Starting logout process...") // Debug log
      
      // Call signOut with proper configuration
      const result = await signOut({ 
        callbackUrl: "/auth/login",
        redirect: false // Change to false to handle manually
      })
      
      console.log("SignOut result:", result) // Debug log
      
      // Manual redirect after successful logout
      window.location.href = "/auth/login"
      
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
      // Fallback: force redirect
      window.location.href = "/auth/login"
    }
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
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {recentNotifications.length > 0 ? (
                    <div className="space-y-3">
                      {recentNotifications.map((notification) => (
                        <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                          <div className="flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.read ? 'bg-gray-300' : 'bg-blue-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium line-clamp-2">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(notification.createdAt).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-gray-100">
                        <Link href="/notifications">
                          <Button variant="outline" size="sm" className="w-full text-gray-800">
                            <Eye className="w-4 h-4 mr-2" />
                            View All Notifications
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  )}
                </CardContent>
              </div>
            )}
          </div>

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
                    data-dropdown-button="true"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowUserMenu(false)
                      setTimeout(() => {
                        window.location.href = "/settings"
                      }, 100)
                    }}
                    className="w-full justify-start px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Profile Settings
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    data-dropdown-button="true"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleLogout(e)
                    }}
                    disabled={isLoggingOut}
                    className="w-full justify-start px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {isLoggingOut ? "Logging out..." : "Keluar"}
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
