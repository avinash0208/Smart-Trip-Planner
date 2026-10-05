import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Loader2, MessageCircle, Send, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { tripService } from '@/services/tripService'
import { chatWithCompanion, type ChatMessage, type ChatTripContext } from '@/services/aiService'

const QUICK_PROMPTS = [
  'Find top vegetarian spots nearby',
  'Suggest rainy-day indoor activities',
  'Estimate a daily budget breakdown',
  'What should I pack for this trip?',
  'Suggest an offbeat hidden gem',
]

/** Renders the small, safe Markdown subset requested from the travel companion. */
const renderMessageContent = (content: string) =>
  content.split('\n').map((line, lineIndex, lines) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)

    return (
      <React.Fragment key={`${line}-${lineIndex}`}>
        {parts.map((part, partIndex) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={partIndex} className="font-bold text-inherit">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <React.Fragment key={partIndex}>{part}</React.Fragment>
          )
        )}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    )
  })

export const TravelCompanionChat: React.FC = () => {
  const { user } = useAuth()
  const { data: trips = [] } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => tripService.getTrips(user?.id),
  })

  const [selectedTripId, setSelectedTripId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedTrip = trips.find((t) => t.id === selectedTripId)

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id)
    }
  }, [trips, selectedTripId])

  useEffect(() => {
    if (selectedTrip) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm your travel companion for "${selectedTrip.title}" in ${selectedTrip.destination_city}. Ask me anything about your trip — food, budget, packing, or hidden gems!`,
        },
      ])
    } else {
      setMessages([])
    }
    // Only reset the conversation when the selected trip changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  const buildContext = (): ChatTripContext => ({
    tripTitle: selectedTrip?.title || 'Untitled Trip',
    destinationCity: selectedTrip?.destination_city || 'your destination',
    destinationCountry: selectedTrip?.destination_country || '',
    startDate: selectedTrip?.start_date || '',
    endDate: selectedTrip?.end_date || '',
  })

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newHistory)
    setInput('')
    setIsSending(true)

    try {
      const reply = await chatWithCompanion(newHistory, buildContext())
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl border-border/80 shadow-xs">
        <label className="font-bold text-foreground text-xs mb-1.5 block">Chatting about</label>
        <select
          className="flex h-10 w-full rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          value={selectedTripId}
          onChange={(e) => setSelectedTripId(e.target.value)}
        >
          {trips.length === 0 && <option value="">No trips yet — create one first</option>}
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title} ({trip.destination_city})
            </option>
          ))}
        </select>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden flex flex-col">
        <div ref={scrollRef} className="h-96 overflow-y-auto p-4 space-y-3 bg-secondary/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-50" />
              <p className="text-xs">Select a trip above to start chatting with your travel companion.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-7 w-7 rounded-xl shrink-0 flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-secondary text-teal-600 dark:text-teal-400'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-sm'
                      : 'bg-card border border-border/70 text-foreground rounded-tl-sm'
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-xl shrink-0 flex items-center justify-center bg-secondary text-teal-600 dark:text-teal-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="bg-card border border-border/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/70 space-y-2.5 bg-card">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={!selectedTrip || isSending}
                onClick={() => sendMessage(prompt)}
                className="px-2.5 py-1 rounded-full border border-border text-[10px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder={selectedTrip ? 'Ask your travel companion anything...' : 'Select a trip first'}
              value={input}
              disabled={!selectedTrip || isSending}
              onChange={(e) => setInput(e.target.value)}
              className="rounded-xl"
            />
            <Button type="submit" size="icon" disabled={!selectedTrip || isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
