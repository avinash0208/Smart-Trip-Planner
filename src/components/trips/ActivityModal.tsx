import React, { useState, useEffect } from 'react'
import {
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Tag,
  Loader2,
  X,
  Plus,
  Save,
  Landmark,
  Utensils,
  Hotel,
  Bus,
  Mountain,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrency } from '@/context/CurrencyContext'
import type { Activity } from '@/types/database.types'

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
  dayId: string
  dayNumber: number
  activityToEdit?: Activity | null
  onSave: (activity: Omit<Activity, 'id' | 'created_at'>, activityId?: string) => Promise<void>
}

// Distinct icon + color per category so it's instantly recognizable while planning
const CATEGORIES = [
  {
    value: 'sightseeing',
    label: 'Sightseeing & Attractions',
    icon: Landmark,
    activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-xs',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'food',
    label: 'Food & Dining',
    icon: Utensils,
    activeClass: 'bg-amber-600 border-amber-600 text-white shadow-xs',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    value: 'lodging',
    label: 'Hotel & Stay',
    icon: Hotel,
    activeClass: 'bg-indigo-600 border-indigo-600 text-white shadow-xs',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    value: 'transit',
    label: 'Transport & Transit',
    icon: Bus,
    activeClass: 'bg-sky-600 border-sky-600 text-white shadow-xs',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    value: 'activity',
    label: 'Activity & Adventure',
    icon: Mountain,
    activeClass: 'bg-violet-600 border-violet-600 text-white shadow-xs',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  {
    value: 'other',
    label: 'Other / Notes',
    icon: StickyNote,
    activeClass: 'bg-slate-600 border-slate-600 text-white shadow-xs',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
] as const

const TIME_PRESETS = [
  '08:30 AM',
  '10:00 AM',
  '01:00 PM',
  '03:30 PM',
  '06:00 PM',
  '08:30 PM',
]

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  dayId,
  dayNumber,
  activityToEdit,
  onSave,
}) => {
  const { symbol, currency } = useCurrency()
  const [placeName, setPlaceName] = useState('')
  const [timeSlot, setTimeSlot] = useState('10:00 AM')
  const [category, setCategory] = useState<Activity['category']>('sightseeing')
  const [cost, setCost] = useState('0')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activityToEdit) {
      setPlaceName(activityToEdit.place_name)
      setTimeSlot(activityToEdit.time_slot || '10:00 AM')
      setCategory(activityToEdit.category)
      setCost(String(activityToEdit.estimated_cost || 0))
      setNotes(activityToEdit.notes || '')
    } else {
      setPlaceName('')
      setTimeSlot('10:00 AM')
      setCategory('sightseeing')
      setCost('0')
      setNotes('')
    }
  }, [activityToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!placeName.trim()) {
      setError('Please provide a place or activity name')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      await onSave(
        {
          day_id: dayId,
          place_name: placeName.trim(),
          time_slot: timeSlot.trim() || null,
          category,
          estimated_cost: Number(cost) || 0,
          notes: notes.trim() || null,
          order_index: activityToEdit ? activityToEdit.order_index : 99,
        },
        activityToEdit?.id
      )
      setIsLoading(false)
      onClose()
    } catch (err: any) {
      setIsLoading(false)
      setError(err.message || 'Failed to save activity')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/70 p-4 sm:p-5 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                {activityToEdit ? 'Edit Activity' : `Add Activity to Day ${dayNumber}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                Schedule a place, dining stop, or attraction
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

        {error && (
          <div className="p-3 m-4 mb-0 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}

        <form id="activity-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Place Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Place / Activity Name *</label>
            <Input
              placeholder="e.g. Fushimi Inari Taisha Shrine"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          {/* Time Slot */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400" /> Time Slot
            </label>
            <Input
              placeholder="10:00 AM"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="rounded-xl"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimeSlot(preset)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Category — icon picker for instant visual recognition */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1">
              <Tag className="h-3 w-3 text-teal-600 dark:text-teal-400" /> Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value as Activity['category'])}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                      isSelected
                        ? cat.activeClass
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                    title={cat.label}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : cat.iconClass}`} />
                    <span className="text-[9px] font-bold leading-tight line-clamp-2">
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-teal-600 dark:text-teal-400" /> Estimated Cost ({symbol} {currency})
            </label>
            <Input
              type="number"
              min="0"
              step="50"
              placeholder="0 (Free)"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground flex items-center gap-1">
              <FileText className="h-3 w-3 text-teal-600 dark:text-teal-400" /> Notes & Booking Reference
            </label>
            <textarea
              className="flex w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 resize-none h-16"
              placeholder="e.g. Buy admission tickets online; best photography near summit torii gates"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 p-4 border-t border-border/70 bg-card shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="activity-modal-form"
            size="sm"
            disabled={isLoading}
            className="gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                {activityToEdit ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{activityToEdit ? 'Save Changes' : 'Add Activity'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
