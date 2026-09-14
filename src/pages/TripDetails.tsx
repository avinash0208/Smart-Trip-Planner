import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  MapPin,
  Clock,
  Plus,
  ArrowLeft,
  DollarSign,
  Sparkles,
  Share2,
  Trash2,
  Utensils,
  Landmark,
  Hotel,
  Mountain,
  Bus,
  StickyNote,
  Compass,
  Check,
  Edit,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { tripService } from '@/services/tripService'
import { useCurrency } from '@/context/CurrencyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ActivityModal } from '@/components/trips/ActivityModal'
import { CreateTripModal } from '@/components/trips/CreateTripModal'
import type { Activity } from '@/types/database.types'

export const TripDetails: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null)
  const [isEditTripOpen, setIsEditTripOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch Trip Details & Days
  const {
    data,
    isLoading,
    error: tripError,
  } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripService.getTripById(tripId || ''),
    enabled: Boolean(tripId),
  })

  const trip = data?.trip
  const days = data?.days || []

  // Add / Edit Activity Mutation
  const saveActivityMutation = useMutation({
    mutationFn: async ({
      activity,
      activityId,
    }: {
      activity: Omit<Activity, 'id' | 'created_at'>
      activityId?: string
    }) => {
      if (activityId) {
        return tripService.updateActivity(activityId, activity)
      } else {
        return tripService.addActivity(activity)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
      setIsActivityModalOpen(false)
      setActivityToEdit(null)
    },
  })

  // Delete Activity Mutation
  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: string) => tripService.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
    },
  })

  // Add Day Mutation
  const addDayMutation = useMutation({
    mutationFn: async () => {
      if (!trip) return
      const nextDayNum = days.length + 1
      const startDate = new Date(trip.start_date)
      const nextDate = new Date(startDate)
      nextDate.setDate(startDate.getDate() + (nextDayNum - 1))

      return tripService.addDay(
        trip.id,
        nextDayNum,
        nextDate.toISOString().split('T')[0],
        'Exploring More'
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
      setActiveDayIndex(days.length)
    },
  })

  const currentDay = days[activeDayIndex] || days[0]

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'food':
        return {
          icon: <Utensils className="h-4 w-4 text-white" />,
          bg: 'bg-amber-600 text-white border-amber-600',
        }
      case 'lodging':
        return {
          icon: <Hotel className="h-4 w-4 text-white" />,
          bg: 'bg-indigo-600 text-white border-indigo-600',
        }
      case 'transit':
        return {
          icon: <Bus className="h-4 w-4 text-white" />,
          bg: 'bg-sky-600 text-white border-sky-600',
        }
      case 'activity':
        return {
          icon: <Mountain className="h-4 w-4 text-white" />,
          bg: 'bg-violet-600 text-white border-violet-600',
        }
      case 'other':
        return {
          icon: <StickyNote className="h-4 w-4 text-white" />,
          bg: 'bg-slate-600 text-white border-slate-600',
        }
      default:
        return {
          icon: <Landmark className="h-4 w-4 text-white" />,
          bg: 'bg-emerald-600 text-white border-emerald-600',
        }
    }
  }

  // Calculate day total cost
  const currentDayCost = (currentDay?.activities || []).reduce(
    (sum, a) => sum + (Number(a.estimated_cost) || 0),
    0
  )

  // Calculate all days total cost
  const allDaysTotalCost = days.reduce(
    (total, day) =>
      total +
      (day.activities || []).reduce(
        (daySum, a) => daySum + (Number(a.estimated_cost) || 0),
        0
      ),
    0
  )

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground">Loading itinerary details...</p>
      </div>
    )
  }

  if (!trip || tripError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <FolderOpen className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Trip Not Found</h2>
          <p className="text-xs text-muted-foreground">
            This trip might have been deleted or moved.
          </p>
        </div>
        <Button onClick={() => navigate('/trips')} variant="outline">
          Back to All Trips
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Back and Action Bar */}
      <div className="flex items-center justify-between">
        <Link to="/trips">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Trips</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditTripOpen(true)}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Trip</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Trip</span>
              </>
            )}
          </Button>
          <Link to="/ai-planner">
            <Button
              size="sm"
              className="gap-1.5 bg-linear-to-r from-teal-600 to-emerald-600"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI Co-pilot</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-muted min-h-64 sm:min-h-72 shadow-xl border border-border/80 group">
        <img
          src={
            trip.cover_image_url ||
            'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80'
          }
          alt={trip.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-black/20" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-end min-h-64 sm:min-h-72 text-white space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-600/90 text-white font-bold text-xs shadow-xs">
              {days.length} Days Schedule
            </span>
            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 capitalize text-xs font-semibold">
              {trip.visibility} Mode
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
            {trip.title}
          </h1>

          {trip.description && (
            <p className="text-xs sm:text-sm text-teal-100/90 line-clamp-2 max-w-2xl leading-relaxed">
              {trip.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-teal-200 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-4 w-4 text-teal-400" /> {trip.destination_city},{' '}
              {trip.destination_country}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 text-teal-400" /> {formatDate(trip.start_date)} -{' '}
              {formatDate(trip.end_date)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="h-4 w-4 text-teal-400" /> Budget: {formatPrice(trip.budget)}{' '}
              <span className="opacity-80 text-xs text-white">
                (Planned: {formatPrice(allDaysTotalCost)})
              </span>
            </span>
          </div>

          {/* Budget Health Progress bar */}
          {trip.budget > 0 && (
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-[11px] text-teal-200 font-medium mb-1">
                <span>Budget Allocated: {formatPrice(allDaysTotalCost)}</span>
                <span>
                  {Math.round((allDaysTotalCost / trip.budget) * 100)}% of {formatPrice(trip.budget)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allDaysTotalCost > trip.budget
                      ? 'bg-red-400'
                      : allDaysTotalCost > trip.budget * 0.85
                      ? 'bg-amber-400'
                      : 'bg-teal-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((allDaysTotalCost / trip.budget) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day Selector Tabs with Add Day Button */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/80">
        {days.map((day, idx) => (
          <button
            key={day.id}
            onClick={() => setActiveDayIndex(idx)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeDayIndex === idx
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                : 'bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            Day {day.day_number}{' '}
            <span className="opacity-80 font-normal text-xs">({formatDate(day.date)})</span>
          </button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => addDayMutation.mutate()}
          disabled={addDayMutation.isPending}
          className="gap-1.5 text-xs shrink-0 rounded-2xl hover:bg-teal-500/10 hover:text-teal-600 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Day</span>
        </Button>
      </div>

      {/* Day Content & Activities Timeline */}
      {currentDay ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 backdrop-blur-xs p-5 rounded-2xl border border-border/80 shadow-xs">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                Day {currentDay.day_number}: {currentDay.title || 'Exploration'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                <span>{formatDate(currentDay.date)}</span>
                <span>•</span>
                <span>
                  {currentDay.activities?.length || 0} Scheduled Activities
                </span>
                <span>•</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  Est. Day Cost: {formatPrice(currentDayCost)}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setActivityToEdit(null)
                setIsActivityModalOpen(true)
              }}
              className="gap-1.5 self-start sm:self-auto rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Activity</span>
            </Button>
          </div>

          {/* Activities List */}
          {(!currentDay.activities || currentDay.activities.length === 0) ? (
            <Card className="p-12 text-center space-y-3 border-dashed rounded-2xl bg-card/50">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
                <Compass className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">No activities scheduled for this day</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add attractions, restaurants, coffee spots, or museum tickets to design your day.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActivityToEdit(null)
                  setIsActivityModalOpen(true)
                }}
                className="gap-1.5 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Activity</span>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentDay.activities.map((activity) => {
                const badge = getCategoryBadge(activity.category)

                return (
                  <Card
                    key={activity.id}
                    className="border-l-4 border-l-teal-500 hover:shadow-md hover:border-teal-500/60 transition-all rounded-2xl shadow-xs bg-card/85"
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 shadow-inner ${badge.bg}`}>
                          {badge.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {activity.time_slot && (
                              <span className="text-xs font-bold text-white flex items-center gap-1 bg-teal-600 px-2 py-0.5 rounded-md">
                                <Clock className="h-3 w-3" /> {activity.time_slot}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${badge.bg}`}
                            >
                              {activity.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-foreground text-sm sm:text-base">
                            {activity.place_name}
                          </h4>
                          {activity.notes && (
                            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                              {activity.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/70">
                        <span className="text-xs font-bold text-foreground bg-secondary px-3 py-1.5 rounded-xl">
                          {activity.estimated_cost && activity.estimated_cost > 0
                            ? formatPrice(activity.estimated_cost)
                            : 'Free'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActivityToEdit(activity)
                              setIsActivityModalOpen(true)
                            }}
                            className="text-muted-foreground hover:text-teal-600 p-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
                            title="Edit Activity"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteActivityMutation.mutate(activity.id)}
                            className="text-muted-foreground hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Activity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Activity Add/Edit Modal */}
      {currentDay && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false)
            setActivityToEdit(null)
          }}
          dayId={currentDay.id}
          dayNumber={currentDay.day_number}
          activityToEdit={activityToEdit}
          onSave={async (activityData, activityId) => {
            await saveActivityMutation.mutateAsync({
              activity: activityData,
              activityId,
            })
          }}
        />
      )}

      {/* Edit Trip Modal */}
      <CreateTripModal
        isOpen={isEditTripOpen}
        editingTrip={trip}
        onClose={() => setIsEditTripOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
          queryClient.invalidateQueries({ queryKey: ['trips'] })
        }}
      />
    </div>
  )
}
