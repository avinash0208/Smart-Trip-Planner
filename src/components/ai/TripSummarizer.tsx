import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Backpack, FileText, Globe, Info, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { tripService } from '@/services/tripService'
import { summarizeTrip, type TripSummary } from '@/services/aiService'

export const TripSummarizer: React.FC = () => {
  const { user } = useAuth()
  const { data: trips = [] } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => tripService.getTrips(user?.id),
  })

  const [selectedTripId, setSelectedTripId] = useState('')
  const [summary, setSummary] = useState<TripSummary | null>(null)

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id)
    }
  }, [trips, selectedTripId])

  const { data: tripDetails } = useQuery({
    queryKey: ['trip', selectedTripId],
    queryFn: () => tripService.getTripById(selectedTripId),
    enabled: Boolean(selectedTripId),
  })

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!tripDetails?.trip) throw new Error('Select a trip first')
      return summarizeTrip(tripDetails.trip, tripDetails.days)
    },
    onSuccess: (result) => setSummary(result),
  })

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId)
    setSummary(null)
    summarizeMutation.reset()
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl border-border/80 shadow-xs space-y-3">
        <label className="font-bold text-foreground text-xs block">Summarize which trip?</label>
        <select
          className="flex h-10 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          value={selectedTripId}
          onChange={(e) => handleSelectTrip(e.target.value)}
        >
          {trips.length === 0 && <option value="">No trips yet — create one first</option>}
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title} ({trip.destination_city})
            </option>
          ))}
        </select>

        <Button
          onClick={() => summarizeMutation.mutate()}
          disabled={!selectedTripId || summarizeMutation.isPending}
          className="w-full gap-2 bg-linear-to-r from-teal-600 to-emerald-600"
        >
          {summarizeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Summarizing your trip...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Your Trip in 2 Minutes
            </>
          )}
        </Button>

        {summarizeMutation.isError && (
          <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {(summarizeMutation.error as Error)?.message || 'Failed to summarize trip'}
          </div>
        )}
      </Card>

      {summary && (
        <div className="space-y-4">
          <Card className="p-5 rounded-2xl border-teal-500/30 bg-linear-to-br from-teal-500/10 via-emerald-500/5 to-transparent shadow-xs">
            <p className="text-sm sm:text-base font-extrabold text-foreground leading-snug">{summary.headline}</p>
          </Card>

          <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Trip Highlights
            </h4>
            <ul className="space-y-2">
              {summary.highlights.map((item, idx) => (
                <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Local Customs & Etiquette
            </h4>
            <ul className="space-y-2">
              {summary.local_customs.map((item, idx) => (
                <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Backpack className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Packing Suggestions
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.packing_tips.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-secondary border border-border text-[11px] font-semibold text-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
