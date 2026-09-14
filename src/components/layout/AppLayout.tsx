import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/context/AuthContext'
import { CreateTripModal } from '@/components/trips/CreateTripModal'
import type { Trip } from '@/types/database.types'

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const handleTripCreated = (newTrip: Trip) => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
    navigate(`/trips/${newTrip.id}`)
  }

  // Only render global modal if we are on pages that don't have their own modal (like Explore, Settings)
  const hasPageSpecificModal = location.pathname === '/dashboard' || location.pathname === '/trips'

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex w-full">
        {user && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenCreateTrip={() => {
              if (hasPageSpecificModal) {
                // If on trips or dashboard, trigger new trip via event or modal
                window.dispatchEvent(new CustomEvent('open-create-trip'))
              } else {
                setIsCreateTripOpen(true)
              }
            }}
          />
        )}

        <main className="flex-1 w-full min-w-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {!hasPageSpecificModal && (
        <CreateTripModal
          isOpen={isCreateTripOpen}
          onClose={() => setIsCreateTripOpen(false)}
          onSuccess={handleTripCreated}
        />
      )}
    </div>
  )
}
