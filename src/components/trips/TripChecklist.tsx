import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Backpack,
  CheckCircle2,
  Circle,
  Loader2,
  Plane,
  Plus,
  Shirt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { checklistService } from '@/services/checklistService'
import { suggestChecklistItems } from '@/services/aiService'
import type { ChecklistCategory, Trip } from '@/types/database.types'

interface TripChecklistProps {
  tripId: string
  trip: Trip
  activityCategories: string[]
}

const CATEGORY_META: Record<ChecklistCategory, { label: string; icon: React.ReactNode }> = {
  essentials: { label: 'Essentials', icon: <Backpack className="h-3.5 w-3.5" /> },
  documents: { label: 'Documents', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  electronics: { label: 'Electronics', icon: <Zap className="h-3.5 w-3.5" /> },
  clothing: { label: 'Clothing', icon: <Shirt className="h-3.5 w-3.5" /> },
  toiletries: { label: 'Toiletries', icon: <Sparkles className="h-3.5 w-3.5" /> },
  other: { label: 'Other', icon: <Plane className="h-3.5 w-3.5" /> },
}

const CATEGORY_ORDER: ChecklistCategory[] = ['essentials', 'documents', 'electronics', 'clothing', 'toiletries', 'other']

export const TripChecklist: React.FC<TripChecklistProps> = ({ tripId, trip, activityCategories }) => {
  const queryClient = useQueryClient()
  const [newItemText, setNewItemText] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<ChecklistCategory>('essentials')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist', tripId],
    queryFn: () => checklistService.getItems(tripId),
    enabled: Boolean(tripId),
  })

  const addMutation = useMutation({
    mutationFn: () => checklistService.addItem(tripId, newItemCategory, newItemText.trim()),
    onSuccess: () => {
      setNewItemText('')
      queryClient.invalidateQueries({ queryKey: ['checklist', tripId] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      checklistService.toggleItem(id, isCompleted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', tripId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checklistService.deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', tripId] }),
  })

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const suggestions = await suggestChecklistItems({ trip, activityCategories })
      return checklistService.addItems(tripId, suggestions)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', tripId] }),
  })

  const completedCount = items.filter((i) => i.is_completed).length
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim()) return
    addMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 rounded-2xl border-border/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground">Smart Packing Checklist</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount}/{items.length} items packed
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
            className="gap-1.5 shrink-0"
          >
            {suggestMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Suggest Packing List
          </Button>
        </div>

        {items.length > 0 && (
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as ChecklistCategory)}
            className="flex h-10 rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer sm:w-44"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Add a packing item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="rounded-xl flex-1"
          />
          <Button type="submit" size="sm" disabled={addMutation.isPending || !newItemText.trim()} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center space-y-2 border-dashed rounded-2xl bg-card/50">
          <Backpack className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">
            No checklist items yet. Add your own or let AI suggest a packing list.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((cat) => items.some((i) => i.category === cat)).map((cat) => (
            <Card key={cat} className="p-4 rounded-2xl border-border/80 shadow-xs space-y-2">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
              </h4>
              <div className="space-y-1">
                {items
                  .filter((i) => i.category === cat)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/50 group"
                    >
                      <button
                        onClick={() => toggleMutation.mutate({ id: item.id, isCompleted: !item.is_completed })}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        {item.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {item.item_text}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
