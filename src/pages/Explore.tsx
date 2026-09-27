import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Loader2, MapPin, Plus, Search, ShieldCheck, Star, X } from 'lucide-react'
import { DestinationMap, type MapMarkerPoint } from '@/components/trips/DestinationMap'
import { WeatherWidget } from '@/components/trips/WeatherWidget'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { findCuratedDestination, type CuratedDestination } from '@/data/curatedDestinations'
import { getVenuesInBounds, searchPlaces, type MapBounds } from '@/services/placesService'
import { tripService } from '@/services/tripService'
import type { Activity, ItineraryDay, Trip } from '@/types/database.types'

const VENUE_ZOOM_THRESHOLD = 14

interface SelectedPlace {
  id: string
  name: string
  subtitle: string
  lat: number
  lng: number
  category: Activity['category']
}

export const Explore = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewport, setViewport] = useState<{ bounds: MapBounds; zoom: number } | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
  const [selectedTripId, setSelectedTripId] = useState('')
  const [selectedDayId, setSelectedDayId] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 500)
    return () => window.clearTimeout(timeout)
  }, [search])

  const {
    data: searchResults = [],
    isFetching: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['place-search', debouncedSearch],
    queryFn: ({ signal }) => searchPlaces(debouncedSearch, signal),
    enabled: debouncedSearch.length > 1,
  })

  const showVenues = Boolean(viewport && viewport.zoom >= VENUE_ZOOM_THRESHOLD)
  const {
    data: venues = [],
    isFetching: isLoadingVenues,
    error: venuesError,
  } = useQuery({
    queryKey: ['nearby-venues', viewport?.bounds],
    queryFn: ({ signal }) => getVenuesInBounds(viewport!.bounds, signal),
    enabled: showVenues,
  })

  const { data: trips = [] } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => tripService.getTrips(user?.id),
    enabled: Boolean(user),
  })
  const { data: selectedTrip } = useQuery({
    queryKey: ['trip', selectedTripId],
    queryFn: () => tripService.getTripById(selectedTripId),
    enabled: Boolean(selectedTripId),
  })

  useEffect(() => {
    if (!selectedTripId && trips.length) setSelectedTripId(trips[0].id)
  }, [selectedTripId, trips])
  useEffect(() => setSelectedDayId(''), [selectedTripId])

  const addToTripMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlace || !selectedDayId) {
        throw new Error('Choose an itinerary day before adding this place.')
      }
      const targetDay = selectedTrip?.days.find((day) => day.id === selectedDayId)
      return tripService.addActivity({
        day_id: selectedDayId,
        place_name: selectedPlace.name,
        time_slot: null,
        notes: `Saved from Destination Explorer: ${selectedPlace.subtitle}`,
        estimated_cost: 0,
        category: selectedPlace.category,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        order_index: targetDay?.activities?.length || 0,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', selectedTripId] })
      setSelectedPlace(null)
      setSelectedDayId('')
    },
  })

  const curatedMatch = useMemo(
    () => (selectedPlace ? findCuratedDestination(selectedPlace.name, selectedPlace.subtitle) : null),
    [selectedPlace]
  )

  const searchMarkers: MapMarkerPoint[] = useMemo(
    () => searchResults.map((place) => ({ id: place.id, name: place.name, subtitle: place.subtitle, lat: place.lat, lng: place.lng })),
    [searchResults]
  )
  const venueMarkers: MapMarkerPoint[] = useMemo(
    () => venues.map((venue) => ({ id: venue.id, name: venue.name, subtitle: venue.subtitle, lat: venue.lat, lng: venue.lng })),
    [venues]
  )

  const selectSearchResult = (id: string) => {
    const place = searchResults.find((item) => item.id === id)
    if (place) {
      setSelectedPlace({
        id: place.id,
        name: place.name,
        subtitle: place.subtitle,
        lat: place.lat,
        lng: place.lng,
        category: 'sightseeing',
      })
    }
  }

  const selectVenue = (id: string) => {
    const venue = venues.find((item) => item.id === id)
    if (venue) {
      setSelectedPlace({
        id: venue.id,
        name: venue.name,
        subtitle: venue.subtitle,
        lat: venue.lat,
        lng: venue.lng,
        category: venue.category,
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Destination Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Search any place worldwide, or zoom into the map to discover real restaurants, hotels, and attractions to add to your trip.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search country, city, or landmark..."
          className="pl-10 h-10 rounded-xl bg-card border-border"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {isSearching && <Loader2 className="absolute right-3.5 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {searchError && <p className="text-xs text-red-600">{(searchError as Error).message}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <h2 className="text-sm font-bold">Explore on the map</h2>
          <span className="text-xs text-muted-foreground">
            {showVenues ? 'Showing venues in this view' : 'Zoom in to discover nearby venues'}
          </span>
        </div>
        <DestinationMap
          searchResults={searchMarkers}
          venues={venueMarkers}
          selectedId={selectedPlace?.id}
          onSelectSearchResult={selectSearchResult}
          onSelectVenue={selectVenue}
          onViewportChange={(bounds, zoom) => setViewport({ bounds, zoom })}
        />
      </div>

      {selectedPlace && <DestinationInsights place={selectedPlace} match={curatedMatch} />}

      {debouncedSearch.length > 1 && (
        <PlaceList
          title="Search results"
          isLoading={isSearching}
          error={searchError as Error | null}
          emptyText="No matches found for that search."
          places={searchResults.map((place) => ({ id: place.id, name: place.name, subtitle: place.subtitle }))}
          onAdd={selectSearchResult}
        />
      )}

      <PlaceList
        title="Venues found in this map view"
        isLoading={isLoadingVenues}
        error={venuesError as Error | null}
        emptyText={showVenues ? 'No tagged venues found here yet — try panning to a busier area.' : 'Zoom in on the map (city block level) to load nearby venues.'}
        places={venues.map((venue) => ({ id: venue.id, name: venue.name, subtitle: venue.subtitle }))}
        onAdd={selectVenue}
      />

      {selectedPlace && (
        <AddPlaceDialog
          place={selectedPlace}
          trips={trips}
          selectedTripId={selectedTripId}
          selectedDayId={selectedDayId}
          days={selectedTrip?.days || []}
          isPending={addToTripMutation.isPending}
          error={addToTripMutation.error}
          onClose={() => setSelectedPlace(null)}
          onTripChange={setSelectedTripId}
          onDayChange={setSelectedDayId}
          onAdd={() => addToTripMutation.mutate()}
        />
      )}
    </div>
  )
}

const PlaceList = ({
  title,
  isLoading,
  error,
  emptyText,
  places,
  onAdd,
}: {
  title: string
  isLoading: boolean
  error: Error | null
  emptyText: string
  places: { id: string; name: string; subtitle: string }[]
  onAdd: (id: string) => void
}) => (
  <div className="space-y-3">
    <h2 className="text-sm font-bold">{title}</h2>
    {isLoading ? (
      <Card className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </Card>
    ) : error ? (
      <Card className="p-6 text-sm text-red-600">{error.message}</Card>
    ) : places.length === 0 ? (
      <Card className="p-6 text-sm text-muted-foreground">{emptyText}</Card>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} onAdd={onAdd} />
        ))}
      </div>
    )}
  </div>
)

const PlaceCard = ({
  place,
  onAdd,
}: {
  place: { id: string; name: string; subtitle: string }
  onAdd: (id: string) => void
}) => (
  <div className="group relative">
    <Card className="p-4 flex items-start justify-between gap-3 rounded-2xl">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-bold text-foreground truncate">
          <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          <span className="truncate">{place.name}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{place.subtitle}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 rounded-xl gap-1.5" onClick={() => onAdd(place.id)}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </Card>

    {/* Untruncated preview that appears on hover so long names/addresses stay readable */}
    <div className="invisible absolute inset-x-0 top-0 z-20 origin-top scale-95 rounded-2xl border border-border bg-card p-4 opacity-0 shadow-2xl transition-all duration-150 ease-out group-hover:visible group-hover:scale-100 group-hover:opacity-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>{place.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{place.subtitle}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 rounded-xl gap-1.5" onClick={() => onAdd(place.id)}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  </div>
)

const DestinationInsights = ({ place, match }: { place: SelectedPlace; match: CuratedDestination | null }) => (
  <div className="space-y-3">
    <h2 className="text-sm font-bold">Destination insights</h2>
    <WeatherWidget location={{ lat: place.lat, lng: place.lng, city: place.name }} compact />
    {match ? (
      <Card className="overflow-hidden rounded-2xl">
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          <img src={match.image} alt={match.city} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white">
            <div className="flex items-center gap-1 text-xs text-teal-300">
              <MapPin className="h-3 w-3" />
              {match.country}
            </div>
            <h3 className="font-extrabold text-lg">{match.city}</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
              {match.rating} <span className="text-muted-foreground font-normal">({match.reviews} reviews)</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Safety {match.safetyRating}/5
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Best time: {match.bestSeason}
            </span>
            <span className="rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 font-semibold">
              {match.budgetLevel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{match.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {match.highlights.map((highlight) => (
              <span key={highlight} className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold">
                {highlight}
              </span>
            ))}
            {match.vibes.map((vibe) => (
              <span key={vibe} className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                {vibe}
              </span>
            ))}
          </div>
        </div>
      </Card>
    ) : (
      <Card className="p-6 text-sm text-muted-foreground">
        No curated travel guide yet for <strong className="text-foreground">{place.name}</strong>. Highlights, safety
        ratings, and seasonal tips are currently available for a set of popular world destinations.
      </Card>
    )}
  </div>
)

const AddPlaceDialog = ({
  place,
  trips,
  selectedTripId,
  selectedDayId,
  days,
  isPending,
  error,
  onClose,
  onTripChange,
  onDayChange,
  onAdd,
}: {
  place: SelectedPlace
  trips: Trip[]
  selectedTripId: string
  selectedDayId: string
  days: ItineraryDay[]
  isPending: boolean
  error: Error | null
  onClose: () => void
  onTripChange: (id: string) => void
  onDayChange: (id: string) => void
  onAdd: () => void
}) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-start justify-between p-5 border-b border-border/70">
        <div>
          <h2 className="text-lg font-bold">Add {place.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Choose where this place belongs.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <label className="block space-y-1.5 text-xs font-bold">
          <span>Trip</span>
          <select
            value={selectedTripId}
            onChange={(event) => onTripChange(event.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal"
          >
            <option value="">Select a trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-xs font-bold">
          <span>Itinerary day</span>
          <select
            value={selectedDayId}
            onChange={(event) => onDayChange(event.target.value)}
            disabled={!selectedTripId}
            className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal disabled:opacity-50"
          >
            <option value="">Select a day</option>
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                Day {day.day_number}: {day.title || 'Exploration'}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-xs text-red-600">{error.message}</p>}
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-border/70">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={!selectedDayId || isPending} onClick={onAdd} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
          <Plus className="h-3.5 w-3.5" />
          {isPending ? 'Adding...' : 'Add to itinerary'}
        </Button>
      </div>
    </div>
  </div>
)
