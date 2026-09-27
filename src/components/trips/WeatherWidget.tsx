import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Loader2,
  Sun,
  Thermometer,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getForecast, isWeatherConfigured, type WeatherCondition, type WeatherLocation } from '@/services/weatherService'
import { cn } from '@/lib/utils'

interface WeatherWidgetProps {
  location: WeatherLocation
  className?: string
  compact?: boolean
}

const CONDITION_ICON: Record<WeatherCondition, React.ReactNode> = {
  clear: <Sun className="h-full w-full text-amber-500" />,
  clouds: <Cloud className="h-full w-full text-slate-400" />,
  rain: <CloudRain className="h-full w-full text-sky-500" />,
  drizzle: <CloudDrizzle className="h-full w-full text-sky-400" />,
  thunderstorm: <CloudLightning className="h-full w-full text-violet-500" />,
  snow: <CloudSnow className="h-full w-full text-cyan-400" />,
  mist: <CloudFog className="h-full w-full text-slate-400" />,
  other: <Cloud className="h-full w-full text-slate-400" />,
}

const formatDayLabel = (dateStr: string, index: number): string => {
  if (index === 0) return 'Today'
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dateStr))
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location, className, compact = false }) => {
  const locationKey = location.lat != null ? `${location.lat},${location.lng}` : `${location.city},${location.country}`

  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['weather', locationKey],
    queryFn: () => getForecast(location),
    enabled: Boolean(location.city || (location.lat != null && location.lng != null)),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })

  const visibleDays = compact ? 5 : 7

  return (
    <Card className={cn('p-4 sm:p-5 rounded-2xl border-border/80 shadow-xs', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Weather Forecast
        </h3>
        {!isWeatherConfigured && (
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Sample data
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error || !forecast || forecast.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Weather data isn't available right now.</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {forecast.slice(0, visibleDays).map((day, idx) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/40 border border-border/50 text-center"
            >
              <span className="text-[10px] font-bold text-muted-foreground">{formatDayLabel(day.date, idx)}</span>
              <div className="h-6 w-6">{CONDITION_ICON[day.condition]}</div>
              <span className="text-[11px] font-bold text-foreground">{day.maxTemp}°</span>
              <span className="text-[10px] text-muted-foreground">{day.minTemp}°</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
