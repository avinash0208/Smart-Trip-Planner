import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Compass,
  MapPin,
  Settings,
  Sparkles,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenCreateTrip?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenCreateTrip,
}) => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Trips', path: '/trips', icon: MapPin },
    { name: 'Explore Places', path: '/explore', icon: Compass },
    { name: 'AI Planner', path: '/ai-planner', icon: Sparkles, badge: 'AI Pro' },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile backdrop - below header */}
      {isOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-black/40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-16 bottom-0 left-0 z-30 w-64 border-r bg-card/85 backdrop-blur-xl px-4 py-6 transition-all duration-300 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0 overflow-y-auto',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="space-y-6">
          {/* Quick Create Trip Action */}
          <div className="px-1">
            <button
              onClick={() => {
                onClose()
                if (onOpenCreateTrip) onOpenCreateTrip()
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-linear-to-r from-teal-600 via-teal-500 to-emerald-500 text-white font-semibold text-xs shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Plan New Trip</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 px-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-4 w-4 group-hover:scale-110 transition-transform',
                            isActive ? 'text-white' : 'text-teal-600 dark:text-teal-400'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[9px] font-bold rounded-full border',
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-linear-to-r from-teal-500/20 to-emerald-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Bottom Banner */}
        <div className="rounded-2xl bg-linear-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>AI Travel Assistant</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Personalized day schedules, foodie recommendations & instant travel tips.
          </p>
        </div>
      </aside>
    </>
  )
}
