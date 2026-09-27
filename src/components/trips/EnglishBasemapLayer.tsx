import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getEnglishMapStyle } from '@/lib/englishBasemap'

// Renders OpenFreeMap vector tiles through Leaflet, with labels forced to English.
export const EnglishBasemapLayer = () => {
  const map = useMap()

  useEffect(() => {
    let cancelled = false
    let layer: any

    const attach = async () => {
      const [{ maplibreGL }, style] = await Promise.all([
        import('@maplibre/maplibre-gl-leaflet'),
        getEnglishMapStyle(),
      ])
      if (cancelled) return
      layer = maplibreGL({
        style,
        attribution: '&copy; OpenFreeMap &copy; OpenMapTiles &copy; OpenStreetMap contributors',
      })
      layer!.addTo(map)
    }

    attach()

    return () => {
      cancelled = true
      if (layer) map.removeLayer(layer)
    }
  }, [map])

  return null
}
