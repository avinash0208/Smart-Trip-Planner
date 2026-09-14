import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plane,
  Compass,
  Calendar,
  DollarSign,
  Plus,
  Sparkles,
  MapPin,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import { tripService } from '@/services/tripService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { CreateTripModal } from '@/components/trips/CreateTripModal'
import type { Trip } from '@/types/database.types'

export const Dashboard: React.FC = () => {
  const { profile, user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  React.useEffect(() => {
    const handleOpen = () => setIsCreateModalOpen(true)
    window.addEventListener('open-create-trip', handleOpen)
    return () => window.removeEventListener('open-create-trip', handleOpen)
  }, [])

  // Fetch trips from Supabase / local service
  const {
    data: trips = [],
    isLoading,
    refetch,
  } = useQuery<Trip[]>({
    queryKey: ['trips', user?.id],
    queryFn: async () => {
      const res = await tripService.getTrips(user?.id)
      return res || []
    },
    enabled: Boolean(user),
  })

  // Calculate dynamic stats from trips
  const uniqueCountries = new Set(trips.map((t) => t.destination_country.trim().toLowerCase())).size

  const totalTravelDays = trips.reduce((acc, t) => {
    const start = new Date(t.start_date).getTime()
    const end = new Date(t.end_date).getTime()
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
    return acc + (isNaN(days) ? 0 : days)
  }, 0)

  const totalBudget = trips.reduce((acc, t) => acc + (Number(t.budget) || 0), 0)

  // Sort upcoming
  const today = new Date().toISOString().split('T')[0]
  const upcomingTrips = trips
    .filter((t) => t.end_date >= today)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const handleTripCreated = (newTrip: Trip) => {
    refetch()
    navigate(`/trips/${newTrip.id}`)
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-900 via-teal-800 to-emerald-900 dark:from-teal-950 dark:via-slate-900 dark:to-emerald-950 text-white p-8 md:p-10 shadow-xl border border-teal-700/30">
        <div className="absolute right-0 top-0 bottom-0 w-2/3 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-teal-300 via-emerald-400 to-transparent" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-teal-100">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Smart AI Itinerary & Discovery</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Where to next, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Traveler'}? ✈️
          </h1>
          <p className="text-teal-100/90 text-sm sm:text-base leading-relaxed max-w-xl">
            Design your ideal holiday with AI-powered day schedules, interactive maps, and team collaboration.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-white text-teal-950 hover:bg-teal-50 font-bold text-xs sm:text-sm rounded-xl px-5 py-2.5 shadow-lg gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Plan New Trip</span>
            </Button>
            <Link to="/explore">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/25 font-semibold text-xs sm:text-sm rounded-xl px-5 py-2.5 backdrop-blur-xs gap-2"
              >
                <Compass className="h-4 w-4" />
                <span>Explore Destinations</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/70 hover:shadow-md hover:border-teal-500/40 transition-all duration-300 bg-card/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Itineraries
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Plane className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{trips.length}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>{upcomingTrips.length} active or scheduled</span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md hover:border-teal-500/40 transition-all duration-300 bg-card/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Target Countries
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Compass className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{uniqueCountries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Across your travel blueprints
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md hover:border-teal-500/40 transition-all duration-300 bg-card/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Days Planned
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{totalTravelDays}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Scheduled adventures
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 hover:shadow-md hover:border-teal-500/40 transition-all duration-300 bg-card/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Allocated Budget
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{formatPrice(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Across active itineraries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Trips Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Your Upcoming Adventures</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review schedule timelines, day plans, and saved places
            </p>
          </div>
          <Link to="/trips">
            <Button variant="ghost" size="sm" className="text-teal-600 dark:text-teal-400 gap-1">
              <span>View all trips</span>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="text-xs text-muted-foreground">Loading your trips...</span>
          </div>
        ) : upcomingTrips.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">No upcoming trips planned yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ready to explore? Create your next destination itinerary with customized daily activities.
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Create First Trip</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingTrips.slice(0, 4).map((trip) => {
              const start = new Date(trip.start_date).getTime()
              const end = new Date(trip.end_date).getTime()
              const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)

              return (
                <Card
                  key={trip.id}
                  className="overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-border/80 rounded-2xl group flex flex-col justify-between bg-card/90"
                >
                  <div>
                    <div className="relative h-52 w-full overflow-hidden bg-muted">
                      <img
                        src={
                          trip.cover_image_url ||
                          'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80'
                        }
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute top-3.5 left-3.5 flex gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                          {duration} Days
                        </span>
                        <Badge
                          variant={
                            trip.visibility === 'public'
                              ? 'default'
                              : trip.visibility === 'shared'
                              ? 'success'
                              : 'secondary'
                          }
                          className="capitalize text-[10px]"
                        >
                          {trip.visibility}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-950/60 backdrop-blur-md text-[11px] text-teal-300 font-semibold mb-1.5 border border-teal-500/20">
                          <MapPin className="h-3 w-3 text-teal-400" />
                          <span>
                            {trip.destination_city}, {trip.destination_country}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-lg leading-snug line-clamp-1 drop-shadow-sm">
                          {trip.title}
                        </h3>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                          <span>
                            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                          </span>
                        </div>
                        <div className="font-bold text-foreground text-xs">
                          {formatPrice(trip.budget)}
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0">
                    <Link to={`/trips/${trip.id}`} className="block w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs font-semibold rounded-xl hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-500/30 transition-colors cursor-pointer"
                      >
                        Open Detailed Itinerary
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Trip Creation Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTripCreated}
      />
    </div>
  )
}
