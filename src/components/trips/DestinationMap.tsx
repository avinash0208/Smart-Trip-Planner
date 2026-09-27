import { useEffect } from 'react'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { EnglishBasemapLayer } from '@/components/trips/EnglishBasemapLayer'
import type { MapBounds } from '@/services/placesService'

export interface MapMarkerPoint {
  id: string
  name: string
  subtitle?: string
  lat: number
  lng: number
}

interface DestinationMapProps {
  searchResults: MapMarkerPoint[]
  venues: MapMarkerPoint[]
  selectedId?: string
  onSelectSearchResult: (id: string) => void
  onSelectVenue: (id: string) => void
  onViewportChange: (bounds: MapBounds, zoom: number) => void
}

const searchIcon = divIcon({
  className: 'destination-map-marker',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const venueIcon = divIcon({
  className: 'venue-map-marker',
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const MapFocus = ({ point }: { point?: MapMarkerPoint }) => {
  const map = useMap()

  useEffect(() => {
    if (point) {
      map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 6), { duration: 0.75 })
    }
  }, [point, map])

  return null
}

const ViewportWatcher = ({ onViewportChange }: { onViewportChange: DestinationMapProps['onViewportChange'] }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      onViewportChange(
        {
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        },
        map.getZoom()
      )
    },
  })

  return null
}

export const DestinationMap = ({
  searchResults,
  venues,
  selectedId,
  onSelectSearchResult,
  onSelectVenue,
  onViewportChange,
}: DestinationMapProps) => {
  const selectedPoint = [...searchResults, ...venues].find((point) => point.id === selectedId)

  return (
    <MapContainer
      center={[30, 15]}
      zoom={2}
      minZoom={1}
      zoomAnimation={false}
      wheelPxPerZoomLevel={300}
      wheelDebounceTime={100}
      maxBounds={[[-85.06, -Infinity], [85.06, Infinity]]}
      maxBoundsViscosity={1}
      className="h-80 w-full z-0"
    >
      <EnglishBasemapLayer />
      <MapFocus point={selectedPoint} />
      <ViewportWatcher onViewportChange={onViewportChange} />
      {searchResults.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={searchIcon}
          eventHandlers={{ click: () => onSelectSearchResult(point.id) }}
        >
          <Popup>
            <strong>{point.name}</strong>
            {point.subtitle && <div>{point.subtitle}</div>}
            <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => onSelectSearchResult(point.id)}>
              Add to itinerary
            </Button>
          </Popup>
        </Marker>
      ))}
      {venues.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={venueIcon}
          eventHandlers={{ click: () => onSelectVenue(point.id) }}
        >
          <Popup>
            <strong>{point.name}</strong>
            {point.subtitle && <div>{point.subtitle}</div>}
            <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => onSelectVenue(point.id)}>
              Add to itinerary
            </Button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}