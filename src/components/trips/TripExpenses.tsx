import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  Loader2,
  Plane,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles as ActivityIcon,
  Trash2,
  Utensils,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useCurrency } from '@/context/CurrencyContext'
import { expenseService } from '@/services/expenseService'
import type { ExpenseCategory, Trip } from '@/types/database.types'

interface TripExpensesProps {
  tripId: string
  trip: Trip
  defaultPaidBy: string
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ReactNode; className: string }> = {
  food: { label: 'Food & Dining', icon: <Utensils className="h-3.5 w-3.5" />, className: 'bg-amber-600 text-white' },
  transport: { label: 'Transport', icon: <Plane className="h-3.5 w-3.5" />, className: 'bg-sky-600 text-white' },
  lodging: { label: 'Lodging', icon: <Wallet className="h-3.5 w-3.5" />, className: 'bg-indigo-600 text-white' },
  shopping: { label: 'Shopping', icon: <ShoppingBag className="h-3.5 w-3.5" />, className: 'bg-pink-600 text-white' },
  activities: { label: 'Activities', icon: <ActivityIcon className="h-3.5 w-3.5" />, className: 'bg-violet-600 text-white' },
  other: { label: 'Other', icon: <Receipt className="h-3.5 w-3.5" />, className: 'bg-slate-600 text-white' },
}

const CATEGORY_ORDER: ExpenseCategory[] = ['food', 'transport', 'lodging', 'shopping', 'activities', 'other']

const today = () => new Date().toISOString().split('T')[0]

export const TripExpenses: React.FC<TripExpensesProps> = ({ tripId, trip, defaultPaidBy }) => {
  const queryClient = useQueryClient()
  const { format: formatPrice } = useCurrency()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [date, setDate] = useState(today())
  const [error, setError] = useState<string | null>(null)

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => expenseService.getExpenses(tripId),
    enabled: Boolean(tripId),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      expenseService.addExpense(tripId, {
        title: title.trim(),
        amount: Number(amount) || 0,
        category,
        paid_by: defaultPaidBy,
        date,
      }),
    onSuccess: ({ error: addError }) => {
      if (addError) {
        setError(addError.message)
        return
      }
      setTitle('')
      setAmount('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', tripId] }),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError('Please enter a title and a valid amount')
      return
    }
    addMutation.mutate()
  }

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const budgetPct = trip.budget > 0 ? Math.round((totalSpent / trip.budget) * 100) : 0

  const categoryTotals = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount || 0), 0),
  })).filter((c) => c.total > 0)

  return (
    <div className="space-y-4">
      <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-foreground flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Budget Meter
          </span>
          <span className={budgetPct > 100 ? 'text-red-500' : 'text-teal-600 dark:text-teal-400'}>
            {formatPrice(totalSpent)} / {formatPrice(trip.budget)}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetPct > 100 ? 'bg-red-500' : budgetPct > 85 ? 'bg-amber-400' : 'bg-teal-500'
            }`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        {categoryTotals.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {categoryTotals.map(({ category: cat, total }) => (
              <span
                key={cat}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${CATEGORY_META[cat].className}`}
              >
                {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}: {formatPrice(total)}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-foreground">Log an Expense</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Input
            placeholder="e.g. Taxi from airport"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl sm:col-span-2"
          />
          <Input
            type="number"
            min="0"
            step="10"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="flex h-10 rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
          <Button type="submit" disabled={addMutation.isPending} className="gap-1.5 rounded-xl">
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Expense
          </Button>
        </form>
        {error && (
          <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-10 text-center space-y-2 border-dashed rounded-2xl bg-card/50">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">No expenses logged yet for this trip.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <Card key={expense.id} className="rounded-2xl border-border/80 shadow-xs">
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${CATEGORY_META[expense.category].className}`}>
                    {CATEGORY_META[expense.category].icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{expense.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {expense.date} • Paid by {expense.paid_by}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-foreground">{formatPrice(expense.amount)}</span>
                  <button
                    onClick={() => deleteMutation.mutate(expense.id)}
                    className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
