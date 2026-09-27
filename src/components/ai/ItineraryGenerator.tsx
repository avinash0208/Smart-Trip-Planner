import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Wand2,
  Loader2,
  MapPin,
  Calendar,
  RefreshCw,
  Save,
  Clock,
  Utensils,
  Landmark,
  Hotel,
  Mountain,
  Bus,
  StickyNote,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import { tripService } from '@/services/tripService'
import {
  generateItinerary,
  type BudgetTier,
  type GeneratedDay,
  type TravelPace,
} from '@/services/aiService'
import type { Activity } from '@/types/database.types'

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000&auto=format&fit=crop&q=80'

const BUDGET_TIERS: { value: BudgetTier; label: string; hint: string }[] = [
  { value: 'budget', label: '$ Budget', hint: 'Hostels, street food, public transit' },
  { value: 'mid-range', label: '$$ Mid-range', hint: 'Comfortable hotels & varied dining' },
  { value: 'luxury', label: '$$$ Luxury', hint: 'Premium stays & fine dining' },
]

const PACE_OPTIONS: { value: TravelPace; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'fast-paced', label: 'Fast-paced' },
]

const INTEREST_OPTIONS = ['History', 'Foodie', 'Nature', 'Nightlife', 'Adventure', 'Shopping', 'Culture', 'Relaxation']

const CATEGORY_STYLES: Record<Activity['category'], { icon: React.ReactNode; className: string }> = {
  sightseeing: { icon: <Landmark className="h-3 w-3" />, className: 'bg-emerald-600 text-white' },
  food: { icon: <Utensils className="h-3 w-3" />, className: 'bg-amber-600 text-white' },
  lodging: { icon: <Hotel className="h-3 w-3" />, className: 'bg-indigo-600 text-white' },
  transit: { icon: <Bus className="h-3 w-3" />, className: 'bg-sky-600 text-white' },
  activity: { icon: <Mountain className="h-3 w-3" />, className: 'bg-violet-600 text-white' },
  other: { icon: <StickyNote className="h-3 w-3" />, className: 'bg-slate-600 text-white' },
}

const addDaysToDate = (dateStr: string, days: number): string => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export const ItineraryGenerator: React.FC = () => {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState('2026-10-15')
  const [numDays, setNumDays] = useState(4)
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('mid-range')
  const [pace, setPace] = useState<TravelPace>('moderate')
  const [interests, setInterests] = useState<string[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedDays, setGeneratedDays] = useState<GeneratedDay[] | null>(null)

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const totalEstimatedCost = (generatedDays || []).reduce(
    (sum, day) => sum + day.activities.reduce((daySum, a) => daySum + (Number(a.estimated_cost) || 0), 0),
    0
  )

  const handleGenerate = async () => {
    if (!city.trim() || !country.trim()) {
      setError('Please enter both a destination city and country')
      return
    }
    setError(null)
    setIsGenerating(true)
    try {
      const days = await generateItinerary({
        city: city.trim(),
        country: country.trim(),
        numDays,
        budgetTier,
        pace,
        interests,
      })
      setGeneratedDays(days)
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveTrip = async () => {
    if (!generatedDays || generatedDays.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      const { trip, error: createError } = await tripService.createTrip(
        {
          owner_id: user?.id || 'demo-user-123456',
          title: `${city.trim()} AI-Crafted Itinerary`,
          description: `AI-generated ${numDays}-day itinerary for ${city.trim()}, ${country.trim()} (${budgetTier} budget, ${pace} pace).`,
          destination_city: city.trim(),
          destination_country: country.trim(),
          start_date: startDate,
          end_date: addDaysToDate(startDate, numDays - 1),
          budget: totalEstimatedCost,
          cover_image_url: DEFAULT_COVER_IMAGE,
          visibility: 'private',
        },
        numDays
      )

      if (createError || !trip) {
        throw new Error(createError?.message || 'Failed to create trip')
      }

      const { days: realDays } = await tripService.getTripById(trip.id)
      const sortedRealDays = [...realDays].sort((a, b) => a.day_number - b.day_number)

      await Promise.all(
        generatedDays.flatMap((genDay, dayIdx) => {
          const realDay = sortedRealDays[dayIdx] || sortedRealDays.find((d) => d.day_number === genDay.day_number)
          if (!realDay) return []
          return genDay.activities.map((activity, activityIdx) =>
            tripService.addActivity({
              day_id: realDay.id,
              place_name: activity.place_name,
              time_slot: activity.time_slot,
              category: activity.category,
              estimated_cost: activity.estimated_cost,
              notes: activity.notes,
              lat: null,
              lng: null,
              order_index: activityIdx,
            })
          )
        })
      )

      queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate(`/trips/${trip.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save the generated itinerary as a trip')
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6 rounded-3xl border-border/80 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Destination City *
            </label>
            <Input
              placeholder="e.g. Lisbon"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs">Country *</label>
            <Input
              placeholder="e.g. Portugal"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs">Duration (Days)</label>
            <Input
              type="number"
              min={1}
              max={14}
              value={numDays}
              onChange={(e) => setNumDays(Math.min(14, Math.max(1, Number(e.target.value) || 1)))}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-foreground text-xs">Budget Tier</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {BUDGET_TIERS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => setBudgetTier(tier.value)}
                className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  budgetTier === tier.value
                    ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-secondary/70'
                }`}
              >
                <div>{tier.label}</div>
                <div className={`text-[10px] font-normal mt-0.5 ${budgetTier === tier.value ? 'text-teal-100' : 'text-muted-foreground'}`}>
                  {tier.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-foreground text-xs">Travel Pace</label>
          <div className="grid grid-cols-3 gap-2">
            {PACE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPace(option.value)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  pace === option.value
                    ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-secondary/70'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-foreground text-xs">Interests (optional)</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  interests.includes(interest)
                    ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                    : 'bg-card border-border text-foreground hover:bg-secondary/70'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full gap-2 bg-linear-to-r from-teal-600 to-emerald-600"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Crafting your itinerary...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Generate My Itinerary
            </>
          )}
        </Button>
      </Card>

      {generatedDays && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 backdrop-blur-xs p-4 rounded-2xl border border-border/80 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Preview: {city}, {country}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {generatedDays.length} days • Estimated cost: <span className="font-bold text-teal-600 dark:text-teal-400">{formatPrice(totalEstimatedCost)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button size="sm" onClick={handleSaveTrip} disabled={isSaving} className="gap-1.5">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save as New Trip
              </Button>
            </div>
          </div>

          {generatedDays.map((day) => (
            <Card key={day.day_number} className="p-4 sm:p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-foreground">
                Day {day.day_number}: {day.title}
              </h4>
              <div className="space-y-2">
                {day.activities.map((activity, idx) => {
                  const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.other
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60"
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${style.className}`}>{style.icon}</div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {activity.time_slot}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> {formatPrice(activity.estimated_cost)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{activity.place_name}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{activity.notes}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
