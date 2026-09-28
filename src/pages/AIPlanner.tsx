import React, { useState } from 'react'
import { FileText, MessageCircle, Sparkles, Wand2 } from 'lucide-react'
import { ItineraryGenerator } from '@/components/ai/ItineraryGenerator'
import { TravelCompanionChat } from '@/components/ai/TravelCompanionChat'
import { TripSummarizer } from '@/components/ai/TripSummarizer'
import { isAIConfigured } from '@/services/aiService'

type PlannerTab = 'generate' | 'chat' | 'summary'

const TABS: { value: PlannerTab; label: string; icon: React.ReactNode }[] = [
  { value: 'generate', label: 'Generate Itinerary', icon: <Wand2 className="h-4 w-4" /> },
  { value: 'chat', label: 'Travel Companion', icon: <MessageCircle className="h-4 w-4" /> },
  { value: 'summary', label: 'Trip Summarizer', icon: <FileText className="h-4 w-4" /> },
]

export const AIPlanner: React.FC = () => {
  const [tab, setTab] = useState<PlannerTab>('generate')

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="rounded-3xl overflow-hidden bg-linear-to-br from-teal-600 via-teal-500 to-emerald-500 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 text-teal-100 text-xs font-bold uppercase tracking-wide">
          <Sparkles className="h-4 w-4" /> AI Travel Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">AI Planner</h1>
        <p className="text-xs sm:text-sm text-teal-50/90 mt-2 max-w-2xl leading-relaxed">
          One-click itinerary generation, a context-aware travel companion chatbot, and instant trip summaries —
          powered by Gemini.
        </p>
        {!isAIConfigured && (
          <p className="text-[11px] text-teal-50/80 mt-3 bg-black/15 border border-white/20 rounded-xl px-3 py-2 inline-block">
            Running in offline demo mode — configure Supabase to enable live AI responses.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/80">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              tab === t.value
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                : 'bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'generate' && <ItineraryGenerator />}
      {tab === 'chat' && <TravelCompanionChat />}
      {tab === 'summary' && <TripSummarizer />}
    </div>
  )
}
