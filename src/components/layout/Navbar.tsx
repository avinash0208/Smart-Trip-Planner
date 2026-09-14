import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, LogOut, User as UserIcon, Menu, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { CurrencySelector } from './CurrencySelector'
import { Button } from '@/components/ui/button'

export const Navbar: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  const { user, profile, signOut, isConfigured } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/75 transition-colors">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl text-muted-foreground hover:text-foreground"
              onClick={onToggleSidebar}
              aria-label="Toggle Navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Compass className="h-5 w-5 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight bg-linear-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                SmartPlanner
              </span>
              <span className="hidden sm:block text-[10px] text-muted-foreground font-medium -mt-1 tracking-wider uppercase">
                AI Travel Companion
              </span>
            </div>
          </Link>

          {!isConfigured && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
              <Sparkles className="h-3 w-3" />
              <span>Demo Mode (Supabase not connected)</span>
            </div>
          )}
        </div>

        {/* Right: Actions & User Dropdown */}
        <div className="flex items-center gap-2.5">
          <CurrencySelector />
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-secondary/60 hover:bg-secondary border border-border transition-all focus:outline-hidden cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User Avatar'}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-teal-500/30"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="hidden md:inline-block text-xs font-semibold text-foreground max-w-30 truncate">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border bg-card backdrop-blur-md p-2 text-card-foreground shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3 py-2.5 border-b border-border/70">
                      <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || 'Traveler'}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="py-1.5">
                      <Link
                        to="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-accent text-foreground transition-colors"
                      >
                        <UserIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span>Profile & Preferences</span>
                      </Link>
                    </div>

                    <div className="border-t border-border/70 pt-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="rounded-xl text-xs">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
