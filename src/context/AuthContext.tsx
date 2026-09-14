import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/database.types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInDemo: () => void
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
}

const DEMO_USER: User = {
  id: 'demo-user-123456',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Avinash Gupta' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@smartplanner.io',
} as User

const DEMO_PROFILE: Profile = {
  id: 'demo-user-123456',
  email: 'demo@smartplanner.io',
  full_name: 'Avinash Gupta',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  travel_preferences: {
    pace: 'moderate',
    interests: ['Culture', 'Photography', 'Food & Wine', 'Nature'],
    dietary: ['Vegetarian'],
    budget_preference: 'mid-range',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Fetch or create user profile
  const fetchProfile = async (userId: string, userEmail?: string, userFullName?: string) => {
    if (!isSupabaseConfigured) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet, insert one
        const newProfile: Partial<Profile> = {
          id: userId,
          email: userEmail || '',
          full_name: userFullName || userEmail?.split('@')[0] || 'Traveler',
        }
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && created) {
          setProfile(created as Profile)
        }
      } else if (data) {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  useEffect(() => {
    // Check if demo user was saved
    const savedDemo = localStorage.getItem('demo_auth_active')
    if (savedDemo === 'true') {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    // Supabase Auth Listeners
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name)
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Automatic mock login
      setUser(DEMO_USER)
      setProfile({ ...DEMO_PROFILE, email, full_name: email.split('@')[0] })
      localStorage.setItem('demo_auth_active', 'true')
      return { error: null }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: new Error(error.message) }
    }

    // Set state immediately instead of waiting for onAuthStateChange to avoid
    // a race condition where ProtectedRoute redirects before user is populated.
    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
      await fetchProfile(
        data.session.user.id,
        data.session.user.email,
        data.session.user.user_metadata?.full_name
      )
    }
    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER)
      setProfile({
        ...DEMO_PROFILE,
        email,
        full_name: fullName || email.split('@')[0],
      })
      localStorage.setItem('demo_auth_active', 'true')
      return { error: null }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) {
      return { error: new Error(error.message) }
    }

    // If email confirmation is disabled, Supabase returns a session immediately.
    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
      await fetchProfile(data.session.user.id, data.session.user.email, fullName)
    }
    return { error: null }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      localStorage.setItem('demo_auth_active', 'true')
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signInDemo = () => {
    setUser(DEMO_USER)
    setProfile(DEMO_PROFILE)
    localStorage.setItem('demo_auth_active', 'true')
  }

  const signOut = async () => {
    localStorage.removeItem('demo_auth_active')
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: null }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') }

    if (!isSupabaseConfigured || user.id === DEMO_USER.id) {
      setProfile((prev) => (prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null))
      return { error: null }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null))
    }
    return { error: error ? new Error(error.message) : null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInDemo,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
