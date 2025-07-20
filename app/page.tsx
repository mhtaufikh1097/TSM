"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== "loading" && session) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Incident Ticket System
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sistem manajemen tiket insiden dengan approval workflow dan notifikasi WhatsApp
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Selamat Datang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <h3 className="font-semibold mb-2">Fitur Utama:</h3>
              <ul className="space-y-1">
                <li>• Pelaporan insiden dengan upload bukti</li>
                <li>• Alur approval QC → PM</li>
                <li>• Notifikasi WhatsApp otomatis</li>
                <li>• Dashboard dan laporan</li>
                <li>• Role-based access control</li>
              </ul>
            </div>
            
            <div className="space-y-3 pt-4">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full">
                  Masuk ke Sistem
                </Button>
              </Link>
              
              <Link href="/auth/register" className="w-full">
                <Button variant="outline" className="w-full">
                  Daftar Akun Baru
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Dikembangkan untuk manajemen insiden WIKA TSM</p>
        </div>
      </div>
    </div>
  )
}
