export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  travel_preferences?: {
    dietary?: string[]
    pace?: 'relaxed' | 'moderate' | 'fast-paced'
    interests?: string[]
    budget_preference?: 'budget' | 'mid-range' | 'luxury'
  } | null
  created_at: string
  updated_at: string
}

export type TripVisibility = 'private' | 'shared' | 'public'
export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface Trip {
  id: string
  owner_id: string
  title: string
  description?: string | null
  destination_city: string
  destination_country: string
  start_date: string
  end_date: string
  budget: number
  cover_image_url?: string | null
  visibility: TripVisibility
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: MemberRole
  created_at: string
  profile?: Profile
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string
  title?: string | null
  created_at: string
  activities?: Activity[]
}

export interface Activity {
  id: string
  day_id: string
  place_name: string
  time_slot?: string | null
  notes?: string | null
  estimated_cost?: number | null
  category: 'sightseeing' | 'food' | 'lodging' | 'transit' | 'activity' | 'other'
  lat?: number | null
  lng?: number | null
  order_index: number
  created_at: string
}

export interface TripDocument {
  id: string
  trip_id: string
  user_id: string
  file_name: string
  storage_path: string
  file_type: string
  file_size: number
  created_at: string
  // Populated only in offline/demo mode, where files are kept as base64 in localStorage
  data_url?: string | null
}

export type ChecklistCategory = 'essentials' | 'documents' | 'electronics' | 'clothing' | 'toiletries' | 'other'

export interface ChecklistItem {
  id: string
  trip_id: string
  category: ChecklistCategory
  item_text: string
  is_completed: boolean
  assigned_to?: string | null
  created_at: string
}

export type ExpenseCategory = 'food' | 'transport' | 'lodging' | 'shopping' | 'activities' | 'other'

export interface ExpenseItem {
  id: string
  trip_id: string
  title: string
  amount: number
  category: ExpenseCategory
  paid_by: string
  date: string
  created_at: string
}
