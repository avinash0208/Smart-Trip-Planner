import { useEffect } from 'react'
import { divIcon, type LatLngExpression } from 'leaflet'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { EnglishBasemapLayer } from '@/components/trips/EnglishBasemapLayer'

interface LocationPickerMapProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
  className?: string
}

const pinIcon = divIcon({
  className: 'location-picker-marker',
  html: '<span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const ClickToPlacePin = ({ onChange }: { onChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (event) => onChange(event.latlng.lat, event.latlng.lng),
  })
  return null
}

const RecenterOnChange = ({ position }: { position: LatLngExpression | null }) => {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 12))
    }
  }, [position, map])

  return null
}

export const LocationPickerMap = ({
  latitude,
  longitude,
  onChange,
  className = '',
}: LocationPickerMapProps) => {
  const position: LatLngExpression | null =
    typeof latitude === 'number' && typeof longitude === 'number' ? [latitude, longitude] : null

  return (
    <MapContainer
      center={position || [20, 0]}
      zoom={position ? 12 : 2}
      minZoom={1}
      zoomAnimation={false}
      wheelPxPerZoomLevel={300}
      wheelDebounceTime={100}
      maxBounds={[[-85.06, -Infinity], [85.06, Infinity]]}
      maxBoundsViscosity={1}
      className={className}
    >
      <RecenterOnChange position={position} />
      <ClickToPlacePin onChange={onChange} />
      <EnglishBasemapLayer />
      {position && (
        <Marker
          position={position}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latLng = event.target.getLatLng()
              onChange(latLng.lat, latLng.lng)
            },
          }}
        />
      )}
    </MapContainer>
  )
}
