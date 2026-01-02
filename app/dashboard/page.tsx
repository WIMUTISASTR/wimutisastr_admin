'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { getSession, signOut, getUser, isAdminEmail } from '../lib/auth'
import DashboardContent from './shared/DashboardContent'
import UsersContent from './features/users/UsersContent'
import BooksContent from './features/books/BooksContent'
import VideosContent from './features/videos/VideosContent'

export default function Dashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState('dashboard')

  useEffect(() => {
    // Check both PIN verification and Supabase session
    const checkAuth = async () => {
      const pinVerified = localStorage.getItem('pinVerified')
      
      if (pinVerified !== 'true') {
        router.push('/')
        return
      }

      try {
        const session = await getSession()
        if (session) {
          // Verify the user is the admin email
          const user = await getUser()
          if (user && user.email && isAdminEmail(user.email)) {
            setIsAuthenticated(true)
          } else {
            // Not admin email, sign out and redirect
            await signOut()
            localStorage.removeItem('pinVerified')
            router.push('/')
          }
        } else {
          localStorage.removeItem('pinVerified')
          router.push('/')
        }
      } catch (error) {
        localStorage.removeItem('pinVerified')
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await signOut()
      localStorage.removeItem('pinVerified')
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if signOut fails
      localStorage.removeItem('pinVerified')
      router.push('/')
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'upload-document', label: 'Upload Document', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { id: 'upload-video', label: 'Upload Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        onLogout={handleLogout}
        menuItems={menuItems}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeMenu === 'dashboard' && <DashboardContent />}
          {activeMenu === 'users' && <UsersContent />}
          {activeMenu === 'upload-document' && <BooksContent />}
          {activeMenu === 'upload-video' && <VideosContent />}
        </main>
      </div>
    </div>
  )
}
