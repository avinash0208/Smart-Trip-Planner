import React, { useState, useEffect } from 'react'
import {
  Compass,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  X,
  Sparkles,
  Link as LinkIcon,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useCurrency } from '@/context/CurrencyContext'
import { tripService } from '@/services/tripService'
import type { Trip, TripVisibility } from '@/types/database.types'

interface CreateTripModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (trip: Trip) => void
  editingTrip?: Trip | null
}

// Character limits enforced across the form
const LIMITS = {
  title: 80,
  city: 60,
  country: 60,
  description: 300,
} as const

// Curated by travel theme (not by specific city) so any destination — desert,
// mountains, beach, etc. — has a relevant cover, plus a custom URL fallback below.
const COVER_PRESETS = [
  {
    label: 'City Lights',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Coastline',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tropical Island',
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Desert / Dunes',
    url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mountains',
    url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Historic / Culture',
    url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Forest / Nature',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Snow / Alps',
    url: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Safari / Wildlife',
    url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Countryside',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Lake / River',
    url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Modern Metropolis',
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1000&auto=format&fit=crop&q=80',
  },
]

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingTrip,
}) => {
  const { user } = useAuth()
  const { symbol, currency } = useCurrency()
  const isEditMode = Boolean(editingTrip)

  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState('2026-10-15')
  const [endDate, setEndDate] = useState('2026-10-22')
  const [budget, setBudget] = useState('150000')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<TripVisibility>('private')
  const [coverImageUrl, setCoverImageUrl] = useState(COVER_PRESETS[0].url)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill the form when opening in edit mode, reset when opening for a new trip
  useEffect(() => {
    if (!isOpen) return

    if (editingTrip) {
      setTitle(editingTrip.title)
      setCity(editingTrip.destination_city)
      setCountry(editingTrip.destination_country)
      setStartDate(editingTrip.start_date)
      setEndDate(editingTrip.end_date)
      setBudget(String(editingTrip.budget))
      setDescription(editingTrip.description || '')
      setVisibility(editingTrip.visibility)
      const presetMatch = COVER_PRESETS.some((p) => p.url === editingTrip.cover_image_url)
      setCoverImageUrl(editingTrip.cover_image_url || COVER_PRESETS[0].url)
      setCustomImageUrl(presetMatch ? '' : editingTrip.cover_image_url || '')
    } else {
      setTitle('')
      setCity('')
      setCountry('')
      setStartDate('2026-10-15')
      setEndDate('2026-10-22')
      setBudget('150000')
      setDescription('')
      setVisibility('private')
      setCoverImageUrl(COVER_PRESETS[0].url)
      setCustomImageUrl('')
    }
    setError(null)
  }, [isOpen, editingTrip])

  if (!isOpen) return null

  // Calculate duration in days
  const calculateDays = () => {
    if (!startDate || !endDate) return 1
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff + 1 : 1
  }

  // Keep end date valid whenever start date changes
  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    if (endDate && value && new Date(endDate) < new Date(value)) {
      setEndDate(value)
    }
  }

  // Unsplash "page" links (unsplash.com/photos/<slug>) are not hotlinkable images —
  // there's no client-side way to resolve them to a real photo without an API key.
  const isUnsplashPageLink = (raw: string) => /unsplash\.com\/photos\//i.test(raw.trim())

  const handleCustomImageChange = (value: string) => {
    setCustomImageUrl(value)
    const trimmed = value.trim()
    if (trimmed && !isUnsplashPageLink(trimmed)) {
      setCoverImageUrl(trimmed)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city || !country || !startDate || !endDate) {
      setError('Please fill in destination and dates')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than the start date')
      return
    }

    if (title.length > LIMITS.title || city.length > LIMITS.city || country.length > LIMITS.country || description.length > LIMITS.description) {
      setError('One or more fields exceed the allowed character limit')
      return
    }

    if (customImageUrl && isUnsplashPageLink(customImageUrl)) {
      setError('The cover image URL is an Unsplash page link, not a direct image. Please paste the direct image URL instead.')
      return
    }

    const durationDays = calculateDays()
    setError(null)
    setIsLoading(true)

    const finalTitle = title.trim() || `${city} Getaway`

    if (isEditMode && editingTrip) {
      const { trip, error: updateError } = await tripService.updateTrip(editingTrip.id, {
        title: finalTitle,
        description: description.trim() || null,
        destination_city: city.trim(),
        destination_country: country.trim(),
        start_date: startDate,
        end_date: endDate,
        budget: Number(budget) || 0,
        cover_image_url: coverImageUrl,
        visibility,
      })

      setIsLoading(false)

      if (updateError || !trip) {
        setError(updateError?.message || 'Failed to update trip')
      } else {
        onSuccess(trip)
        onClose()
      }
      return
    }

    const { trip, error: createError } = await tripService.createTrip(
      {
        owner_id: user?.id || 'demo-user-123456',
        title: finalTitle,
        description: description.trim() || null,
        destination_city: city.trim(),
        destination_country: country.trim(),
        start_date: startDate,
        end_date: endDate,
        budget: Number(budget) || 0,
        cover_image_url: coverImageUrl,
        visibility,
      },
      durationDays
    )

    setIsLoading(false)

    if (createError || !trip) {
      setError(createError?.message || 'Failed to create trip')
    } else {
      onSuccess(trip)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex items-center justify-between border-b border-border/70 p-4 sm:p-5 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              {isEditMode ? <Pencil className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-foreground">
                {isEditMode ? 'Edit Trip' : 'Create New Trip'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEditMode ? 'Update destination, dates, or budget' : 'Set up your destination, dates, and budget'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="create-trip-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm"
        >
          {error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs flex items-center justify-between">
              <span>Trip Title</span>
              <span className="text-muted-foreground font-normal">{title.length}/{LIMITS.title}</span>
            </label>
            <Input
              placeholder="e.g. Kyoto Autumn Exploration & Tea Houses"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LIMITS.title}
              className="rounded-xl"
            />
          </div>

          {/* Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs flex items-center justify-between">
                <span>City / Region *</span>
                <span className="text-muted-foreground font-normal">{city.length}/{LIMITS.city}</span>
              </label>
              <Input
                placeholder="e.g. Jaisalmer"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={LIMITS.city}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs flex items-center justify-between">
                <span>Country *</span>
                <span className="text-muted-foreground font-normal">{country.length}/{LIMITS.country}</span>
              </label>
              <Input
                placeholder="e.g. India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={LIMITS.country}
                className="rounded-xl"
                required
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Start Date *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> End Date *
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
          </div>

          <div className="text-xs text-teal-800 dark:text-teal-300 font-bold bg-teal-500/10 px-3.5 py-2 rounded-xl flex items-center justify-between border border-teal-500/20">
            <span>Calculated Duration:</span>
            <span className="font-extrabold">{calculateDays()} Days</span>
          </div>

          {/* Budget & Visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Estimated Budget ({symbol} {currency})
              </label>
              <Input
                type="number"
                min="0"
                step="500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-foreground text-xs">Privacy / Sharing</label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as TripVisibility)}
              >
                <option value="private" className="bg-card text-foreground">🔒 Private (Only Me)</option>
                <option value="shared" className="bg-card text-foreground">👥 Shared (With Collaborators)</option>
                <option value="public" className="bg-card text-foreground">🌐 Public (Community)</option>
              </select>
            </div>
          </div>

          {/* Cover Image Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Cover Photo Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setCoverImageUrl(preset.url)
                    setCustomImageUrl('')
                  }}
                  className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    coverImageUrl === preset.url
                      ? 'border-teal-500 ring-2 ring-teal-500/30 scale-102 shadow-xs'
                      : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/50 flex items-end p-1 text-[9px] text-white font-bold truncate">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom cover image override — for destinations not covered by a theme above */}
            <div className="pt-1 space-y-1.5">
              <label className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Or paste a direct image URL (e.g. a Jaisalmer desert photo)
              </label>
              <div className="flex items-center gap-2">
                {customImageUrl && !isUnsplashPageLink(customImageUrl) && (
                  <img
                    src={coverImageUrl}
                    alt="Custom cover preview"
                    className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <Input
                  placeholder="https://images.unsplash.com/photo-..."
                  value={customImageUrl}
                  onChange={(e) => handleCustomImageChange(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {customImageUrl && isUnsplashPageLink(customImageUrl) ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                  ⚠️ That's an Unsplash page link, not a direct image — it won't load as a cover photo.
                  Open the link, right-click the photo itself → "Copy Image Address", then paste that URL here instead.
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Search{' '}
                  <a
                    href={`https://unsplash.com/s/photos/${encodeURIComponent(city || 'travel')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 dark:text-teal-400 underline"
                  >
                    Unsplash for "{city || 'your destination'}"
                  </a>
                  , open a photo, right-click the image itself → Copy Image Address, then paste it here.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground text-xs flex items-center justify-between">
              <span>Trip Notes / Vibe</span>
              <span className="text-muted-foreground font-normal">{description.length}/{LIMITS.description}</span>
            </label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 resize-none h-16"
              placeholder="What makes this journey special? Any must-visit spots?"
              value={description}
              maxLength={LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-2.5 p-4 sm:p-5 border-t border-border/70 bg-card shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl text-xs h-9 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-trip-form"
            disabled={isLoading}
            className="gap-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white h-9 px-5 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isEditMode ? 'Saving...' : 'Creating Trip...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{isEditMode ? 'Save Changes' : 'Create Itinerary'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
