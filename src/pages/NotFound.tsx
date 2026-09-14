import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="h-16 w-16 rounded-3xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        Looks like you've wandered off the map! The destination you are looking for doesn't exist.
      </p>
      <Link to="/dashboard">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </Link>
    </div>
  )
}
