import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      className="relative flex items-center justify-between w-16 h-8 p-1 rounded-full bg-secondary border border-border transition-colors duration-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 cursor-pointer shadow-inner"
    >
      <div
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-card shadow-md flex items-center justify-center transition-transform duration-300 ease-out border border-border/50 ${
          isDark ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-teal-400 fill-teal-400/20" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
        )}
      </div>
      <span className="w-6 flex justify-center">
        <Sun className={`h-3.5 w-3.5 transition-opacity ${isDark ? 'opacity-30' : 'opacity-0'}`} />
      </span>
      <span className="w-6 flex justify-center">
        <Moon className={`h-3.5 w-3.5 transition-opacity ${isDark ? 'opacity-0' : 'opacity-30'}`} />
      </span>
    </button>
  )
}
