import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Copy, Globe, Loader2, MapPin, Search, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import { tripService } from '@/services/tripService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Trip } from '@/types/database.types'

export const Community: React.FC = () => {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [cloningId, setCloningId] = useState<string | null>(null)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['public-trips'],
    queryFn: () => tripService.getPublicTrips(),
  })

  const cloneMutation = useMutation({
    mutationFn: (trip: Trip) => tripService.cloneTrip(trip.id, user?.id || 'demo-user-123456'),
    onMutate: (trip) => setCloningId(trip.id),
    onSuccess: ({ trip, error }) => {
      setCloningId(null)
      if (!error && trip) {
        queryClient.invalidateQueries({ queryKey: ['trips'] })
        navigate(`/trips/${trip.id}`)
      }
    },
    onError: () => setCloningId(null),
  })

  const filteredTrips = trips.filter(
    (trip) =>
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination_country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-6 w-6 text-teal-600 dark:text-teal-400" /> Community Itineraries
        </h1>
        <p className="text-sm text-muted-foreground">
          Get inspired by trips shared publicly by other travelers, and clone any of them into your own trips.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by city, country, or trip title..."
          className="pl-10 h-10 rounded-xl bg-card border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          <span className="text-xs text-muted-foreground">Loading community itineraries...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed rounded-3xl bg-card/60">
          <div className="h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No public itineraries yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Set a trip's privacy to "Public" from its edit form to share it here with the community.
            </p>
          </div>
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
                className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/80 rounded-2xl flex flex-col justify-between bg-card/90 group"
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
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold">
                      {duration} Days
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="inline-flex items-center gap-1.5 text-xs text-teal-300 font-medium mb-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-400" />
                        <span>
                          {trip.destination_city}, {trip.destination_country}
                        </span>
                      </div>
                      <h3 className="font-bold text-base leading-snug line-clamp-1 drop-shadow-sm">{trip.title}</h3>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {trip.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {trip.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span>
                          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/70 text-xs">
                      <span className="text-muted-foreground">Est. Budget:</span>
                      <span className="font-bold text-foreground">{formatPrice(trip.budget)}</span>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    onClick={() => cloneMutation.mutate(trip)}
                    disabled={cloningId === trip.id}
                    className="w-full gap-2 rounded-xl"
                  >
                    {cloningId === trip.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Clone to My Trips
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
