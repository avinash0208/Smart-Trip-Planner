const OPENWEATHER_API_KEY = (import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim()

export const isWeatherConfigured = Boolean(
  OPENWEATHER_API_KEY && !OPENWEATHER_API_KEY.includes('your-openweather') && !OPENWEATHER_API_KEY.includes('placeholder')
)

if (!isWeatherConfigured) {
  console.warn(
    '⚠️ OpenWeatherMap is not configured. VITE_OPENWEATHER_API_KEY is missing — weather widgets will use offline sample data.'
  )
}

const FORECAST_ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast'

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'drizzle' | 'thunderstorm' | 'snow' | 'mist' | 'other'

export interface DailyForecast {
  date: string // YYYY-MM-DD
  condition: WeatherCondition
  description: string
  minTemp: number
  maxTemp: number
}

export interface WeatherLocation {
  city?: string
  country?: string
  lat?: number
  lng?: number
}

const mapWeatherMain = (main: string): WeatherCondition => {
  const normalized = main.toLowerCase()
  if (normalized === 'clear') return 'clear'
  if (normalized === 'clouds') return 'clouds'
  if (normalized === 'rain') return 'rain'
  if (normalized === 'drizzle') return 'drizzle'
  if (normalized === 'thunderstorm') return 'thunderstorm'
  if (normalized === 'snow') return 'snow'
  if (['mist', 'fog', 'haze', 'smoke', 'dust', 'sand', 'ash'].includes(normalized)) return 'mist'
  return 'other'
}

// Deterministic offline sample forecast so the widget always renders something useful without an API key
function mockForecast(seed: string, days: number): DailyForecast[] {
  const conditions: WeatherCondition[] = ['clear', 'clouds', 'clear', 'rain', 'clouds', 'clear', 'drizzle']
  const descriptions: Record<WeatherCondition, string> = {
    clear: 'clear sky',
    clouds: 'scattered clouds',
    rain: 'light rain',
    drizzle: 'light drizzle',
    thunderstorm: 'thunderstorms',
    snow: 'light snow',
    mist: 'misty',
    other: 'variable conditions',
  }
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const baseTemp = 18 + (hash % 14) // 18-31°C base

  return Array.from({ length: days }).map((_, idx) => {
    const date = new Date()
    date.setDate(date.getDate() + idx)
    const condition = conditions[(hash + idx) % conditions.length]
    const dayVariance = ((hash >> idx) % 5) - 2
    return {
      date: date.toISOString().split('T')[0],
      condition,
      description: descriptions[condition],
      minTemp: Math.round(baseTemp + dayVariance - 4),
      maxTemp: Math.round(baseTemp + dayVariance + 4),
    }
  })
}

interface ForecastListItem {
  dt_txt: string
  main: { temp_min: number; temp_max: number }
  weather: { main: string; description: string }[]
}

// Aggregates OpenWeatherMap's 3-hour steps (up to 5 days) into one summary per calendar day
function aggregateToDailyForecast(list: ForecastListItem[]): DailyForecast[] {
  const byDate = new Map<string, ForecastListItem[]>()
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0]
    const bucket = byDate.get(date) || []
    bucket.push(item)
    byDate.set(date, bucket)
  }

  return Array.from(byDate.entries()).map(([date, items]) => {
    const minTemp = Math.min(...items.map((i) => i.main.temp_min))
    const maxTemp = Math.max(...items.map((i) => i.main.temp_max))

    // Prefer the entry closest to midday as the representative condition for the day
    const midday = items.reduce((closest, item) => {
      const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0], 10)
      const closestHour = parseInt(closest.dt_txt.split(' ')[1].split(':')[0], 10)
      return Math.abs(hour - 12) < Math.abs(closestHour - 12) ? item : closest
    }, items[0])

    const weather = midday.weather[0]
    return {
      date,
      condition: mapWeatherMain(weather?.main || 'other'),
      description: weather?.description || '',
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
    }
  })
}

export async function getForecast(location: WeatherLocation): Promise<DailyForecast[]> {
  const seed = location.city || `${location.lat},${location.lng}` || 'default'

  if (!isWeatherConfigured) {
    return mockForecast(seed, 7)
  }

  try {
    const params = new URLSearchParams({ units: 'metric', appid: OPENWEATHER_API_KEY })
    if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lng))
    } else if (location.city) {
      params.set('q', location.country ? `${location.city},${location.country}` : location.city)
    } else {
      throw new Error('No location provided for weather lookup')
    }

    const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Weather request failed (${response.status})`)
    }

    const data = await response.json()
    const daily = aggregateToDailyForecast(data.list as ForecastListItem[])
    if (daily.length === 0) throw new Error('No forecast data returned')
    return daily
  } catch (err) {
    console.error('Weather fetch failed, falling back to offline sample data:', err)
    return mockForecast(seed, 7)
  }
}
