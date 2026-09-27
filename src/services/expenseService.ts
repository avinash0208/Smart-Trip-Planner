import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ExpenseCategory, ExpenseItem } from '@/types/database.types'

const mockExpensesStorageKey = 'smartplanner_local_expenses'

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

export interface NewExpenseInput {
  title: string
  amount: number
  category: ExpenseCategory
  paid_by: string
  date: string
}

export const expenseService = {
  async getExpenses(tripId: string): Promise<ExpenseItem[]> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('trip_id', tripId)
          .order('date', { ascending: false })

        if (!error && data) return data as ExpenseItem[]
      } catch (err) {
        console.error('Failed to get expenses from Supabase:', err)
      }
    }

    return getLocalData<ExpenseItem[]>(mockExpensesStorageKey, []).filter((e) => e.trip_id === tripId)
  },

  async addExpense(
    tripId: string,
    input: NewExpenseInput
  ): Promise<{ expense: ExpenseItem | null; error: Error | null }> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .insert({ trip_id: tripId, ...input })
          .select()
          .single()

        if (error) return { expense: null, error: new Error(error.message) }
        return { expense: data as ExpenseItem, error: null }
      } catch (err: any) {
        return { expense: null, error: new Error(err.message) }
      }
    }

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      trip_id: tripId,
      ...input,
      created_at: new Date().toISOString(),
    }
    const currentExpenses = getLocalData<ExpenseItem[]>(mockExpensesStorageKey, [])
    setLocalData(mockExpensesStorageKey, [newExpense, ...currentExpenses])
    return { expense: newExpense, error: null }
  },

  async deleteExpense(expenseId: string): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && !expenseId.startsWith('exp-')) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentExpenses = getLocalData<ExpenseItem[]>(mockExpensesStorageKey, [])
    setLocalData(
      mockExpensesStorageKey,
      currentExpenses.filter((e) => e.id !== expenseId)
    )
    return { error: null }
  },
}
