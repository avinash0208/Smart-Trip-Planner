import type { Activity } from '@/types/database.types'

export interface SearchPlace {
  id: string
  name: string
  subtitle: string
  lat: number
  lng: number
  type: string
}

export interface NearbyVenue {
  id: string
  name: string
  subtitle: string
  lat: number
  lng: number
  category: Activity['category']
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export const searchPlaces = async (query: string, signal?: AbortSignal): Promise<SearchPlace[]> => {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    'accept-language': 'en',
    limit: '8',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal })
  if (!response.ok) throw new Error('Search failed. Please try again.')
  const data = await response.json()

  return (data as any[]).map((item) => ({
    id: `${item.osm_type}-${item.osm_id}`,
    name: item.display_name.split(',')[0],
    subtitle: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    type: item.type || item.class,
  }))
}

const classifyVenue = (tags: Record<string, string>): Activity['category'] => {
  if (tags.amenity && ['restaurant', 'cafe', 'bar', 'fast_food', 'pub'].includes(tags.amenity)) return 'food'
  if (tags.tourism && ['hotel', 'hostel', 'guest_house', 'motel'].includes(tags.tourism)) return 'lodging'
  if (tags.leisure) return 'activity'
  return 'sightseeing'
}

export interface MapBounds {
  south: number
  west: number
  north: number
  east: number
}

export const getVenuesInBounds = async (bounds: MapBounds, signal?: AbortSignal): Promise<NearbyVenue[]> => {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const query = `[out:json][timeout:20];(
    node["tourism"~"attraction|museum|viewpoint|gallery"](${bbox});
    node["amenity"~"restaurant|cafe|bar|fast_food|pub"](${bbox});
    node["tourism"~"hotel|hostel|guest_house|motel"](${bbox});
    node["leisure"~"park|garden"](${bbox});
  );out 60;`

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    signal,
  })
  if (!response.ok) throw new Error('Unable to load nearby venues right now.')
  const data = await response.json()

  return (data.elements || [])
    .filter((element: any) => element.tags?.name)
    .map((element: any) => ({
      id: `node-${element.id}`,
      name: element.tags['name:en'] || element.tags.name,
      subtitle: element.tags.tourism || element.tags.amenity || element.tags.leisure || 'Place',
      lat: element.lat,
      lng: element.lon,
      category: classifyVenue(element.tags),
    }))
}
