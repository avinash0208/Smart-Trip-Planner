import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface PresenceUser {
  id: string
  name: string
  avatar_url?: string | null
}

export interface CurrentCollaborator {
  id: string
  name: string
  avatarUrl?: string | null
}

const isRealTrip = (tripId: string) => !tripId.startsWith('demo-') && !tripId.startsWith('trip-')

const MAX_ACTIVITY_LOG = 6

// Subscribes to live itinerary/collaborator changes for a trip via Supabase Realtime,
// and tracks presence of everyone currently viewing the trip.
export function useTripCollaboration(
  tripId: string | undefined,
  dayIds: string[],
  currentUser: CurrentCollaborator | null
) {
  const queryClient = useQueryClient()
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([])
  const [recentActivity, setRecentActivity] = useState<string[]>([])
  const dayIdsKey = dayIds.join(',')
  const currentUserKey = currentUser ? `${currentUser.id}:${currentUser.name}:${currentUser.avatarUrl || ''}` : ''

  const pushActivity = (message: string) => {
    setRecentActivity((prev) => [message, ...prev].slice(0, MAX_ACTIVITY_LOG))
  }
  const pushActivityRef = useRef(pushActivity)
  pushActivityRef.current = pushActivity

  useEffect(() => {
    if (!tripId || !isSupabaseConfigured || !isRealTrip(tripId)) {
      setActiveUsers([])
      return
    }

    const channel = supabase.channel(`trip-collab-${tripId}`, {
      config: { presence: { key: currentUser?.id || `anon-${Date.now()}` } },
    })

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itinerary_days', filter: `trip_id=eq.${tripId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
        pushActivityRef.current('Itinerary schedule was updated')
      }
    )

    if (dayIds.length > 0) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `day_id=in.(${dayIds.join(',')})` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
          pushActivityRef.current('An activity was added, edited, or removed')
        }
      )
    }

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] })
        pushActivityRef.current('The collaborator list changed')
      }
    )

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state)
        .flat()
        .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))
      setActiveUsers(users)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && currentUser) {
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          avatar_url: currentUser.avatarUrl,
        })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, dayIdsKey, currentUserKey])

  return { activeUsers, recentActivity }
}
