"use client"

import Sidebar from "@/components/layouts/Sidebar"

import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, AlertTriangle, Clock, Users } from "lucide-react"

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      type: "incident",
      title: "New incident reported",
      message: "Equipment malfunction in Zone A requires immediate attention",
      time: "2 minutes ago",
      read: false,
      icon: AlertTriangle,
      iconColor: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      id: 2,
      type: "approval",
      title: "Incident approved",
      message: "Incident #INC-001 has been approved by PM",
      time: "1 hour ago",
      read: false,
      icon: CheckCircle,
      iconColor: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      id: 3,
      type: "review",
      title: "QC review required",
      message: "3 incidents are pending your review",
      time: "3 hours ago",
      read: true,
      icon: Clock,
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      id: 4,
      type: "assignment",
      title: "You've been assigned",
      message: "New incident has been assigned to you for review",
      time: "5 hours ago",
      read: true,
      icon: Users,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ]

  return (
       <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Notifications
              </h1>
              <p className="mt-1 text-gray-600">
                Stay updated with the latest incident activities
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button variant="outline">
                Mark All as Read
              </Button>
            </div>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-red-600">2</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-blue-600">4</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-green-600">15</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notification) => {
            const IconComponent = notification.icon
            return (
              <Card 
                key={notification.id} 
                className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md ${
                  !notification.read ? 'ring-2 ring-blue-100' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${notification.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-6 h-6 ${notification.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-base font-semibold ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full inline-block"></span>
                            )}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {notification.message}
                          </p>
                          <p className="text-gray-500 text-xs mt-2">
                            {notification.time}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {!notification.read && (
                            <Button variant="outline" size="sm">
                              Mark as Read
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! Check back later for updates.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
