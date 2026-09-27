import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Trip, ItineraryDay, Activity } from '@/types/database.types'

// Mock storage for demo/offline mode
const mockTripsStorageKey = 'smartplanner_local_trips'
const mockDaysStorageKey = 'smartplanner_local_days'
const mockActivitiesStorageKey = 'smartplanner_local_activities'

const getLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

const setLocalData = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('LocalStorage write failed:', err)
  }
}

const DEFAULT_MOCK_TRIPS: Trip[] = [
  {
    id: 'demo-trip-1',
    owner_id: 'demo-user-123456',
    title: 'Cherry Blossom & Neon Nights',
    description: 'Explore the wonders of Tokyo from traditional temples in Asakusa to the cyberpunk skyline of Shinjuku.',
    destination_city: 'Tokyo',
    destination_country: 'Japan',
    start_date: '2026-10-10',
    end_date: '2026-10-18',
    budget: 240000,
    cover_image_url:
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
    visibility: 'shared',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'demo-trip-2',
    owner_id: 'demo-user-123456',
    title: 'Amalfi Coastline & Tuscan Sunsets',
    description: 'A romantic Mediterranean adventure through ancient Roman ruins, Positano cliffside villages, and Tuscan vineyards.',
    destination_city: 'Rome & Amalfi',
    destination_country: 'Italy',
    start_date: '2026-11-05',
    end_date: '2026-11-15',
    budget: 310000,
    cover_image_url:
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1000&auto=format&fit=crop&q=80',
    visibility: 'private',
    created_at: new Date('2026-09-05').toISOString(),
    updated_at: new Date('2026-09-05').toISOString(),
  },
]

const DEFAULT_MOCK_DAYS: ItineraryDay[] = [
  {
    id: 'demo-day-1',
    trip_id: 'demo-trip-1',
    day_number: 1,
    date: '2026-10-10',
    title: 'Arrival & Shibuya Night Walk',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-day-2',
    trip_id: 'demo-trip-1',
    day_number: 2,
    date: '2026-10-11',
    title: 'Historical Asakusa & Akihabara Tech',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-day-3',
    trip_id: 'demo-trip-1',
    day_number: 3,
    date: '2026-10-12',
    title: 'Mount Fuji Day Excursion & Onsen',
    created_at: new Date().toISOString(),
  },
]

const DEFAULT_MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'demo-act-1',
    day_id: 'demo-day-1',
    place_name: 'Check-in at Cerulean Tower Tokyu Hotel',
    time_slot: '03:00 PM',
    notes: 'Confirmation #JP-88912. Drop bags and refresh.',
    estimated_cost: 22000,
    category: 'lodging',
    lat: 35.6565,
    lng: 139.6997,
    order_index: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-act-2',
    day_id: 'demo-day-1',
    place_name: 'Shibuya Crossing & Hachiko Statue',
    time_slot: '06:30 PM',
    notes: 'Best photo spot from Mag’s Park rooftop.',
    estimated_cost: 0,
    category: 'sightseeing',
    lat: 35.6595,
    lng: 139.7005,
    order_index: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-act-3',
    day_id: 'demo-day-1',
    place_name: 'Dinner at Ichiran Ramen Shibuya',
    time_slot: '08:00 PM',
    notes: 'Tonkotsu broth with custom richness level 3.',
    estimated_cost: 1600,
    category: 'food',
    lat: 35.6612,
    lng: 139.7011,
    order_index: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-act-4',
    day_id: 'demo-day-2',
    place_name: 'Senso-ji Temple & Nakamise Dori Street',
    time_slot: '09:00 AM',
    notes: 'Try melonpan bread and draw fortune omikuji.',
    estimated_cost: 450,
    category: 'sightseeing',
    lat: 35.7148,
    lng: 139.7967,
    order_index: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-act-5',
    day_id: 'demo-day-2',
    place_name: 'Lunch at Kaminarimon Sansada Tempura',
    time_slot: '01:00 PM',
    notes: 'Oldest tempura restaurant in Tokyo (est. 1837).',
    estimated_cost: 2800,
    category: 'food',
    lat: 35.7113,
    lng: 139.7961,
    order_index: 1,
    created_at: new Date().toISOString(),
  },
]

export const tripService = {
  // Fetch trips for current user
  async getTrips(userId?: string): Promise<Trip[]> {
    if (isSupabaseConfigured && userId && !userId.startsWith('demo-')) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return data as Trip[]
        }
      } catch (err) {
        console.error('Failed to get trips from Supabase:', err)
      }
    }

    // Local / Demo storage fallback
    return getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
  },

  // Create a new trip with initial itinerary days
  async createTrip(
    tripData: Omit<Trip, 'id' | 'created_at' | 'updated_at'>,
    numDays: number
  ): Promise<{ trip: Trip | null; error: Error | null }> {
    if (isSupabaseConfigured && tripData.owner_id && !tripData.owner_id.startsWith('demo-')) {
      try {
        // 1. Insert trip in Supabase
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .insert(tripData)
          .select()
          .single()

        if (tripError || !trip) {
          return { trip: null, error: new Error(tripError?.message || 'Failed to create trip') }
        }

        // 2. Generate itinerary days
        const startDate = new Date(trip.start_date)
        const dayInserts = Array.from({ length: Math.max(numDays, 1) }).map((_, idx) => {
          const dayDate = new Date(startDate)
          dayDate.setDate(startDate.getDate() + idx)
          return {
            trip_id: trip.id,
            day_number: idx + 1,
            date: dayDate.toISOString().split('T')[0],
            title: `${trip.destination_city} Exploration`,
          }
        })

        const { error: daysError } = await supabase.from('itinerary_days').insert(dayInserts)
        if (daysError) {
          console.error('Error creating itinerary days in Supabase:', daysError.message)
        }

        return { trip: trip as Trip, error: null }
      } catch (err: any) {
        return { trip: null, error: new Error(err.message || 'Unknown error creating trip') }
      }
    }

    // Local / Demo storage fallback
    const newTripId = `trip-${Date.now()}`
    const newTrip: Trip = {
      ...tripData,
      id: newTripId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentTrips = getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
    setLocalData(mockTripsStorageKey, [newTrip, ...currentTrips])

    // Generate local days
    const currentDays = getLocalData<ItineraryDay[]>(mockDaysStorageKey, DEFAULT_MOCK_DAYS)
    const startDate = new Date(tripData.start_date)
    const newDays: ItineraryDay[] = Array.from({ length: Math.max(numDays, 1) }).map((_, idx) => {
      const dayDate = new Date(startDate)
      dayDate.setDate(startDate.getDate() + idx)
      return {
        id: `day-${Date.now()}-${idx + 1}`,
        trip_id: newTripId,
        day_number: idx + 1,
        date: dayDate.toISOString().split('T')[0],
        title: `${tripData.destination_city} Highlights`,
        created_at: new Date().toISOString(),
      }
    })
    setLocalData(mockDaysStorageKey, [...currentDays, ...newDays])

    return { trip: newTrip, error: null }
  },

  // Update trip metadata
  async updateTrip(
    tripId: string,
    updates: Partial<Trip>
  ): Promise<{ trip: Trip | null; error: Error | null }> {
    if (isSupabaseConfigured && !tripId.startsWith('demo-') && !tripId.startsWith('trip-')) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', tripId)
          .select()
          .single()

        if (error) return { trip: null, error: new Error(error.message) }
        return { trip: data as Trip, error: null }
      } catch (err: any) {
        return { trip: null, error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentTrips = getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
    const updatedTrips = currentTrips.map((t) =>
      t.id === tripId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    )
    setLocalData(mockTripsStorageKey, updatedTrips)
    const updated = updatedTrips.find((t) => t.id === tripId) || null
    return { trip: updated, error: null }
  },

  // Get full trip details including days and activities
  async getTripById(tripId: string): Promise<{
    trip: Trip | null
    days: (ItineraryDay & { activities: Activity[] })[]
    error: Error | null
  }> {
    if (!tripId) {
      return { trip: null, days: [], error: new Error('Invalid trip ID') }
    }

    if (isSupabaseConfigured && !tripId.startsWith('demo-') && !tripId.startsWith('trip-')) {
      try {
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single()

        if (tripError || !trip) {
          // Fall back to local in case it was a local demo trip
          console.warn('Supabase trip query failed, checking local store:', tripError?.message)
        } else {
          const { data: days } = await supabase
            .from('itinerary_days')
            .select(`
              *,
              activities (*)
            `)
            .eq('trip_id', tripId)
            .order('day_number', { ascending: true })

          const sortedDays = (days || []).map((day: any) => ({
            ...day,
            activities: (day.activities || []).sort(
              (a: Activity, b: Activity) => a.order_index - b.order_index
            ),
          }))

          return { trip: trip as Trip, days: sortedDays, error: null }
        }
      } catch (err: any) {
        console.warn('Supabase fetch error:', err.message)
      }
    }

    // Local fallback
    const currentTrips = getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
    let trip = currentTrips.find((t) => t.id === tripId) || null

    // If not found in currentTrips, check DEFAULT_MOCK_TRIPS directly
    if (!trip) {
      trip = DEFAULT_MOCK_TRIPS.find((t) => t.id === tripId) || DEFAULT_MOCK_TRIPS[0]
    }

    const currentDays = getLocalData<ItineraryDay[]>(mockDaysStorageKey, DEFAULT_MOCK_DAYS)
    const currentActivities = getLocalData<Activity[]>(mockActivitiesStorageKey, DEFAULT_MOCK_ACTIVITIES)

    let tripDays = currentDays
      .filter((d) => d.trip_id === trip.id)
      .sort((a, b) => a.day_number - b.day_number)
      .map((day) => ({
        ...day,
        activities: currentActivities
          .filter((a) => a.day_id === day.id)
          .sort((a, b) => a.order_index - b.order_index),
      }))

    if (tripDays.length === 0) {
      tripDays = DEFAULT_MOCK_DAYS.map((day) => ({
        ...day,
        activities: DEFAULT_MOCK_ACTIVITIES.filter((a) => a.day_id === day.id),
      }))
    }

    return { trip, days: tripDays, error: null }
  },

  // Add an activity to an itinerary day
  async addActivity(
    activity: Omit<Activity, 'id' | 'created_at'>
  ): Promise<{ activity: Activity | null; error: Error | null }> {
    if (isSupabaseConfigured && !activity.day_id.startsWith('demo-') && !activity.day_id.startsWith('day-')) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .insert(activity)
          .select()
          .single()

        if (error) return { activity: null, error: new Error(error.message) }
        return { activity: data as Activity, error: null }
      } catch (err: any) {
        return { activity: null, error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentActivities = getLocalData<Activity[]>(mockActivitiesStorageKey, DEFAULT_MOCK_ACTIVITIES)
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    setLocalData(mockActivitiesStorageKey, [...currentActivities, newActivity])
    return { activity: newActivity, error: null }
  },

  // Update activity
  async updateActivity(
    activityId: string,
    updates: Partial<Activity>
  ): Promise<{ activity: Activity | null; error: Error | null }> {
    if (isSupabaseConfigured && !activityId.startsWith('demo-') && !activityId.startsWith('act-')) {
      try {
        const { data, error } = await supabase
          .from('activities')
          .update(updates)
          .eq('id', activityId)
          .select()
          .single()

        if (error) return { activity: null, error: new Error(error.message) }
        return { activity: data as Activity, error: null }
      } catch (err: any) {
        return { activity: null, error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentActivities = getLocalData<Activity[]>(mockActivitiesStorageKey, DEFAULT_MOCK_ACTIVITIES)
    const updatedActivities = currentActivities.map((a) =>
      a.id === activityId ? { ...a, ...updates } : a
    )
    setLocalData(mockActivitiesStorageKey, updatedActivities)
    const updated = updatedActivities.find((a) => a.id === activityId) || null
    return { activity: updated, error: null }
  },

  // Delete an activity
  async deleteActivity(activityId: string): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !activityId.startsWith('demo-') && !activityId.startsWith('act-')) {
      try {
        const { error } = await supabase.from('activities').delete().eq('id', activityId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentActivities = getLocalData<Activity[]>(mockActivitiesStorageKey, DEFAULT_MOCK_ACTIVITIES)
    setLocalData(
      mockActivitiesStorageKey,
      currentActivities.filter((a) => a.id !== activityId)
    )
    return { error: null }
  },

  // Add a day to a trip
  async addDay(
    tripId: string,
    dayNumber: number,
    date: string,
    title?: string
  ): Promise<{ day: ItineraryDay | null; error: Error | null }> {
    if (isSupabaseConfigured && !tripId.startsWith('demo-') && !tripId.startsWith('trip-')) {
      try {
        const { data, error } = await supabase
          .from('itinerary_days')
          .insert({
            trip_id: tripId,
            day_number: dayNumber,
            date,
            title: title || 'Exploration',
          })
          .select()
          .single()

        if (error) return { day: null, error: new Error(error.message) }
        return { day: data as ItineraryDay, error: null }
      } catch (err: any) {
        return { day: null, error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentDays = getLocalData<ItineraryDay[]>(mockDaysStorageKey, DEFAULT_MOCK_DAYS)
    const newDay: ItineraryDay = {
      id: `day-${Date.now()}`,
      trip_id: tripId,
      day_number: dayNumber,
      date,
      title: title || 'Exploration',
      created_at: new Date().toISOString(),
    }
    setLocalData(mockDaysStorageKey, [...currentDays, newDay])
    return { day: newDay, error: null }
  },

  // Delete trip
  async deleteTrip(tripId: string): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !tripId.startsWith('demo-') && !tripId.startsWith('trip-')) {
      try {
        const { error } = await supabase.from('trips').delete().eq('id', tripId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    // Local fallback
    const currentTrips = getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
    setLocalData(
      mockTripsStorageKey,
      currentTrips.filter((t) => t.id !== tripId)
    )
    return { error: null }
  },

  // Fetch publicly shared trips for the Community feed
  async getPublicTrips(): Promise<Trip[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(60)

        if (!error && data) return data as Trip[]
      } catch (err) {
        console.error('Failed to get public trips from Supabase:', err)
      }
    }

    // Local / Demo fallback
    const localTrips = getLocalData<Trip[]>(mockTripsStorageKey, DEFAULT_MOCK_TRIPS)
    return [...DEFAULT_MOCK_TRIPS, ...localTrips].filter((t) => t.visibility === 'public')
  },

  // Duplicates a trip (with its days & activities) as a new private trip for the given owner
  async cloneTrip(sourceTripId: string, newOwnerId: string): Promise<{ trip: Trip | null; error: Error | null }> {
    const { trip: sourceTrip, days: sourceDays, error: fetchError } = await this.getTripById(sourceTripId)
    if (fetchError || !sourceTrip) {
      return { trip: null, error: fetchError || new Error('Trip not found') }
    }

    const { trip: newTrip, error: createError } = await this.createTrip(
      {
        owner_id: newOwnerId,
        title: `${sourceTrip.title} (Copy)`,
        description: sourceTrip.description,
        destination_city: sourceTrip.destination_city,
        destination_country: sourceTrip.destination_country,
        start_date: sourceTrip.start_date,
        end_date: sourceTrip.end_date,
        budget: sourceTrip.budget,
        cover_image_url: sourceTrip.cover_image_url,
        visibility: 'private',
      },
      Math.max(sourceDays.length, 1)
    )

    if (createError || !newTrip) {
      return { trip: null, error: createError || new Error('Failed to clone trip') }
    }

    const { days: newDays } = await this.getTripById(newTrip.id)
    const sortedNewDays = [...newDays].sort((a, b) => a.day_number - b.day_number)

    await Promise.all(
      sourceDays.flatMap((day, dayIdx) => {
        const targetDay = sortedNewDays[dayIdx]
        if (!targetDay) return []
        return (day.activities || []).map((activity, activityIdx) =>
          this.addActivity({
            day_id: targetDay.id,
            place_name: activity.place_name,
            time_slot: activity.time_slot,
            notes: activity.notes,
            estimated_cost: activity.estimated_cost,
            category: activity.category,
            lat: activity.lat,
            lng: activity.lng,
            order_index: activityIdx,
          })
        )
      })
    )

    return { trip: newTrip, error: null }
  },
}
