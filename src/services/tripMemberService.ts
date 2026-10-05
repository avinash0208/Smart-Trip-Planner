import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { MemberRole, TripMember } from '@/types/database.types'

const mockMembersStorageKey = 'smartplanner_local_trip_members'

const getLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

const setLocalData = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('LocalStorage write failed:', err)
  }
}

const isRealTrip = (tripId: string) => !tripId.startsWith('demo-') && !tripId.startsWith('trip-')

export const tripMemberService = {
  async getMembers(tripId: string): Promise<TripMember[]> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('trip_members')
          .select('*, profile:profiles(*)')
          .eq('trip_id', tripId)
          .order('invited_at', { ascending: true })

        if (error) throw new Error(error.message)
        return (data || []) as unknown as TripMember[]
      } catch (err) {
        console.error('Failed to get trip members from Supabase:', err)
        throw err
      }
    }

    return getLocalData<TripMember[]>(mockMembersStorageKey, []).filter((m) => m.trip_id === tripId)
  },

  async inviteByEmail(
    tripId: string,
    email: string,
    role: MemberRole
  ): Promise<{ member: TripMember | null; error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase()

    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase.functions.invoke('invite-collaborator', {
          body: { tripId, email: normalizedEmail, role },
        })
        if (error) return { member: null, error: new Error(error.message || 'Failed to invite collaborator') }
        if (!data || typeof data !== 'object' || !('member' in data) || !data.member) {
          const message = typeof data === 'object' && data !== null && 'error' in data ? data.error : null
          return { member: null, error: new Error(typeof message === 'string' ? message : 'Failed to invite collaborator') }
        }
        return { member: data.member as TripMember, error: null }
      } catch (err: unknown) {
        return { member: null, error: new Error(err instanceof Error ? err.message : 'Failed to invite collaborator') }
      }
    }

    // Local / Demo fallback — creates a placeholder collaborator entry
    const currentMembers = getLocalData<TripMember[]>(mockMembersStorageKey, [])
    if (currentMembers.some((m) => m.trip_id === tripId && m.profile?.email === normalizedEmail)) {
      return { member: null, error: new Error('This person is already a collaborator on this trip.') }
    }

    const newMember: TripMember = {
      id: `mem-${Date.now()}`,
      trip_id: tripId,
      user_id: `invited-${Date.now()}`,
      role,
      created_at: new Date().toISOString(),
      profile: {
        id: `invited-${Date.now()}`,
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        avatar_url: null,
        travel_preferences: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }
    setLocalData(mockMembersStorageKey, [...currentMembers, newMember])
    return { member: newMember, error: null }
  },

  async updateRole(memberId: string, role: MemberRole): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !memberId.startsWith('mem-')) {
      try {
        const { error } = await supabase.from('trip_members').update({ role }).eq('id', memberId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentMembers = getLocalData<TripMember[]>(mockMembersStorageKey, [])
    setLocalData(
      mockMembersStorageKey,
      currentMembers.map((m) => (m.id === memberId ? { ...m, role } : m))
    )
    return { error: null }
  },

  async removeMember(memberId: string): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !memberId.startsWith('mem-')) {
      try {
        const { error } = await supabase.from('trip_members').delete().eq('id', memberId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentMembers = getLocalData<TripMember[]>(mockMembersStorageKey, [])
    setLocalData(
      mockMembersStorageKey,
      currentMembers.filter((m) => m.id !== memberId)
    )
    return { error: null }
  },
}
