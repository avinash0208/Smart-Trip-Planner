import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MapPin,
  Calendar,
  Search,
  Users,
  Lock,
  Globe,
  Loader2,
  Trash2,
  Edit,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import { tripService } from '@/services/tripService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { CreateTripModal } from '@/components/trips/CreateTripModal'
import { DeleteTripDialog } from '@/components/trips/DeleteTripDialog'
import type { Trip } from '@/types/database.types'

export const MyTrips: React.FC = () => {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterVisibility, setFilterVisibility] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null)
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null)

  React.useEffect(() => {
    const handleOpen = () => setIsCreateModalOpen(true)
    window.addEventListener('open-create-trip', handleOpen)
    return () => window.removeEventListener('open-create-trip', handleOpen)
  }, [])

  // Fetch all trips for current user
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => tripService.getTrips(user?.id),
    enabled: Boolean(user),
  })

  // Delete trip mutation
  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => tripService.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      setTripToDelete(null)
    },
  })

  const handleTripCreated = (newTrip: Trip) => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
    navigate(`/trips/${newTrip.id}`)
  }

  const handleTripUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
    setTripToEdit(null)
  }

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return
    await deleteMutation.mutateAsync(tripToDelete.id)
  }

  // Filter and search
  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination_country.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterVisibility === 'all' || trip.visibility === filterVisibility

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header with Search and Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Trips & Itineraries</h1>
          <p className="text-sm text-muted-foreground">
            Manage, plan, and share your upcoming and past travel itineraries
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>New Trip</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, country, or trip title..."
            className="pl-10 h-10 rounded-xl bg-card border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Visibility Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'private', 'shared', 'public'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterVisibility(filter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterVisibility === filter
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Trip Cards Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          <span className="text-xs text-muted-foreground">Fetching your trips...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed rounded-3xl bg-card/60">
          <div className="h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No itineraries found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try adjusting your search criteria or filter tags.'
                : 'Start organizing your dream vacation today!'}
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            <span>Plan New Trip</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const start = new Date(trip.start_date).getTime()
            const end = new Date(trip.end_date).getTime()
            const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)

            return (
              <Card
                key={trip.id}
                className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/80 rounded-2xl flex flex-col justify-between group bg-card/90"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    <img
                      src={
                        trip.cover_image_url ||
                        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold">
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
                        className="text-[10px] capitalize"
                      >
                        {trip.visibility === 'public' ? (
                          <Globe className="h-3 w-3 mr-1 inline" />
                        ) : trip.visibility === 'shared' ? (
                          <Users className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1 inline" />
                        )}
                        {trip.visibility}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setTripToEdit(trip)
                        }}
                        className="p-1.5 rounded-xl bg-black/50 text-white/80 hover:text-teal-300 hover:bg-black/80 transition-colors backdrop-blur-xs cursor-pointer"
                        title="Edit Trip"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setTripToDelete(trip)
                        }}
                        className="p-1.5 rounded-xl bg-black/50 text-white/80 hover:text-red-400 hover:bg-black/80 transition-colors backdrop-blur-xs cursor-pointer"
                        title="Delete Trip"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="inline-flex items-center gap-1.5 text-xs text-teal-300 font-medium mb-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-400" />
                        <span>
                          {trip.destination_city}, {trip.destination_country}
                        </span>
                      </div>
                      <h3 className="font-bold text-base leading-snug line-clamp-1 drop-shadow-sm">
                        {trip.title}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span>
                          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/70 text-xs">
                      <span className="text-muted-foreground">Target Budget:</span>
                      <span className="font-bold text-foreground">
                        {formatPrice(trip.budget)}
                      </span>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Link to={`/trips/${trip.id}`} className="block w-full">
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold rounded-xl hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-500/30"
                    >
                      View Full Schedule & Map
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTripCreated}
      />

      {/* Edit Trip Modal */}
      <CreateTripModal
        isOpen={Boolean(tripToEdit)}
        editingTrip={tripToEdit}
        onClose={() => setTripToEdit(null)}
        onSuccess={handleTripUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTripDialog
        isOpen={Boolean(tripToDelete)}
        onClose={() => setTripToDelete(null)}
        onConfirm={handleDeleteConfirm}
        tripTitle={tripToDelete?.title || ''}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
