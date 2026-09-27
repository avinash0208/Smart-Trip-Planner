import { useMemo } from 'react'
import { divIcon, type LatLngExpression } from 'leaflet'
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { EnglishBasemapLayer } from '@/components/trips/EnglishBasemapLayer'
import type { Activity } from '@/types/database.types'

interface ItineraryMapProps {
  activities: Activity[]
  fallbackCenter?: LatLngExpression
  className?: string
}

const categoryColors: Record<Activity['category'], string> = {
  sightseeing: '#059669',
  food: '#d97706',
  lodging: '#4f46e5',
  transit: '#0284c7',
  activity: '#7c3aed',
  other: '#475569',
}

const createMarkerIcon = (category: Activity['category'], order: number) =>
  divIcon({
    className: 'itinerary-map-marker',
    html: `<span style="background:${categoryColors[category]}">${order}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

export const ItineraryMap = ({
  activities,
  fallbackCenter = [20, 0],
  className = '',
}: ItineraryMapProps) => {
  const mappedActivities = useMemo(
    () =>
      activities.filter(
        (activity): activity is Activity & { lat: number; lng: number } =>
          typeof activity.lat === 'number' && typeof activity.lng === 'number'
      ),
    [activities]
  )
  const center = mappedActivities.length
    ? ([mappedActivities[0].lat, mappedActivities[0].lng] as LatLngExpression)
    : fallbackCenter
  const route = mappedActivities.map(
    (activity) => [activity.lat, activity.lng] as LatLngExpression
  )

  return (
    <MapContainer
      center={center}
      zoom={mappedActivities.length ? 13 : 2}
      minZoom={1}
      zoomAnimation={false}
      wheelPxPerZoomLevel={300}
      wheelDebounceTime={100}
      maxBounds={[[-85.06, -Infinity], [85.06, Infinity]]}
      maxBoundsViscosity={1}
      className={className}
    >
      <EnglishBasemapLayer />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#0d9488', weight: 4 }} />}
      {mappedActivities.map((activity, index) => (
        <Marker
          key={activity.id}
          position={[activity.lat, activity.lng]}
          icon={createMarkerIcon(activity.category, index + 1)}
        >
          <Popup>
            <strong>{activity.place_name}</strong>
            {activity.time_slot && <div>{activity.time_slot}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}