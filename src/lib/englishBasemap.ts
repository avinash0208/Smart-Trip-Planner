import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre GL v6 needs its worker bundle registered explicitly under Vite, or no tiles ever render.
setWorkerUrl(maplibreWorkerUrl)

// OpenFreeMap vector style patched to prefer English/Latin names, falling back to local names.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

let cachedStyle: Promise<any> | null = null

const englishTextField = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]

export const getEnglishMapStyle = (): Promise<any> => {
  if (!cachedStyle) {
    cachedStyle = fetch(STYLE_URL)
      .then((response) => response.json())
      .then((style: any) => ({
        ...style,
        layers: style.layers.map((layer: any) =>
          layer.layout?.['text-field']
            ? { ...layer, layout: { ...layer.layout, 'text-field': englishTextField } }
            : layer
        ),
      }))
  }
  return cachedStyle
}
