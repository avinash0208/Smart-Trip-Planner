import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ChecklistCategory, ChecklistItem } from '@/types/database.types'

const mockChecklistStorageKey = 'smartplanner_local_checklist'

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

export const checklistService = {
  async getItems(tripId: string): Promise<ChecklistItem[]> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('checklists')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: true })

        if (!error && data) return data as ChecklistItem[]
      } catch (err) {
        console.error('Failed to get checklist items from Supabase:', err)
      }
    }

    return getLocalData<ChecklistItem[]>(mockChecklistStorageKey, []).filter((i) => i.trip_id === tripId)
  },

  async addItem(
    tripId: string,
    category: ChecklistCategory,
    itemText: string
  ): Promise<{ item: ChecklistItem | null; error: Error | null }> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('checklists')
          .insert({ trip_id: tripId, category, item_text: itemText, is_completed: false })
          .select()
          .single()

        if (error) return { item: null, error: new Error(error.message) }
        return { item: data as ChecklistItem, error: null }
      } catch (err: any) {
        return { item: null, error: new Error(err.message) }
      }
    }

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      trip_id: tripId,
      category,
      item_text: itemText,
      is_completed: false,
      created_at: new Date().toISOString(),
    }
    const currentItems = getLocalData<ChecklistItem[]>(mockChecklistStorageKey, [])
    setLocalData(mockChecklistStorageKey, [...currentItems, newItem])
    return { item: newItem, error: null }
  },

  // Bulk-adds items while skipping ones that already exist (case-insensitive) — used by AI suggestions
  async addItems(
    tripId: string,
    items: { category: ChecklistCategory; item_text: string }[]
  ): Promise<{ error: Error | null }> {
    const existing = await this.getItems(tripId)
    const existingTexts = new Set(existing.map((i) => i.item_text.trim().toLowerCase()))
    const toAdd = items.filter((i) => i.item_text.trim() && !existingTexts.has(i.item_text.trim().toLowerCase()))

    for (const item of toAdd) {
      const { error } = await this.addItem(tripId, item.category, item.item_text.trim())
      if (error) return { error }
    }
    return { error: null }
  },

  async toggleItem(itemId: string, isCompleted: boolean): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !itemId.startsWith('chk-')) {
      try {
        const { error } = await supabase
          .from('checklists')
          .update({ is_completed: isCompleted })
          .eq('id', itemId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentItems = getLocalData<ChecklistItem[]>(mockChecklistStorageKey, [])
    setLocalData(
      mockChecklistStorageKey,
      currentItems.map((i) => (i.id === itemId ? { ...i, is_completed: isCompleted } : i))
    )
    return { error: null }
  },

  async deleteItem(itemId: string): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !itemId.startsWith('chk-')) {
      try {
        const { error } = await supabase.from('checklists').delete().eq('id', itemId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentItems = getLocalData<ChecklistItem[]>(mockChecklistStorageKey, [])
    setLocalData(
      mockChecklistStorageKey,
      currentItems.filter((i) => i.id !== itemId)
    )
    return { error: null }
  },
}
