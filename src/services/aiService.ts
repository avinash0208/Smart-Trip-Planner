import type { Activity, ChecklistCategory, ItineraryDay, Trip } from '@/types/database.types'

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim()

export const isAIConfigured = Boolean(
  GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini') && !GEMINI_API_KEY.includes('placeholder')
)

if (!isAIConfigured) {
  console.warn(
    '⚠️ Gemini AI is not configured. VITE_GEMINI_API_KEY is missing — AI features will use offline sample content.'
  )
}

// "latest" alias always resolves to the current recommended flash model, avoiding pinned-version deprecation
const GEMINI_MODEL = 'gemini-flash-latest'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type GeminiSchema = Record<string, unknown>

interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

async function callGemini(
  contents: GeminiContent[],
  options: { schema?: GeminiSchema; systemInstruction?: string; temperature?: number } = {}
): Promise<string> {
  if (!isAIConfigured) {
    throw new Error('AI is not configured')
  }

  const body: Record<string, unknown> = { contents }

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] }
  }

  body.generationConfig = options.schema
    ? {
        responseMimeType: 'application/json',
        responseSchema: options.schema,
        temperature: options.temperature ?? 0.8,
      }
    : { temperature: options.temperature ?? 0.7 }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`AI request failed (${response.status}): ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''

  if (!text.trim()) {
    throw new Error('AI returned an empty response')
  }
  return text
}

// ---------------------------------------------------------------------------
// One-click Itinerary Generator
// ---------------------------------------------------------------------------

export interface GeneratedActivity {
  time_slot: string
  place_name: string
  category: Activity['category']
  estimated_cost: number
  notes: string
}

export interface GeneratedDay {
  day_number: number
  title: string
  activities: GeneratedActivity[]
}

export type BudgetTier = 'budget' | 'mid-range' | 'luxury'
export type TravelPace = 'relaxed' | 'moderate' | 'fast-paced'

export interface GenerateItineraryParams {
  city: string
  country: string
  numDays: number
  budgetTier: BudgetTier
  pace: TravelPace
  interests: string[]
}

const ACTIVITY_CATEGORIES = ['sightseeing', 'food', 'lodging', 'transit', 'activity', 'other']

const ITINERARY_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day_number: { type: 'INTEGER' },
          title: { type: 'STRING' },
          activities: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                time_slot: { type: 'STRING', description: 'e.g. "09:00 AM"' },
                place_name: { type: 'STRING' },
                category: { type: 'STRING', enum: ACTIVITY_CATEGORIES },
                estimated_cost: { type: 'NUMBER', description: 'Estimated cost in INR, numeric only' },
                notes: { type: 'STRING' },
              },
              required: ['time_slot', 'place_name', 'category', 'estimated_cost', 'notes'],
            },
          },
        },
        required: ['day_number', 'title', 'activities'],
      },
    },
  },
  required: ['days'],
}

const BUDGET_COST_MULTIPLIER: Record<BudgetTier, number> = {
  budget: 0.55,
  'mid-range': 1,
  luxury: 2.4,
}

// Deterministic offline template used whenever the Gemini API key isn't configured or a call fails
function mockGenerateItinerary(params: GenerateItineraryParams): GeneratedDay[] {
  const multiplier = BUDGET_COST_MULTIPLIER[params.budgetTier]
  const activityTemplates: { slot: string; place: string; category: Activity['category']; notes: string; baseCost: number }[] = [
    { slot: '09:00 AM', place: `${params.city} Old Town Walking Tour`, category: 'sightseeing', notes: 'Explore the historic core and get your bearings.', baseCost: 0 },
    { slot: '01:00 PM', place: `Local Favorite Lunch in ${params.city}`, category: 'food', notes: 'Try a signature regional dish at a well-reviewed spot.', baseCost: 900 },
    { slot: '04:00 PM', place: `${params.city} Landmark & Viewpoint`, category: params.interests.includes('Adventure') ? 'activity' : 'sightseeing', notes: 'Great for photos and orientation before dinner.', baseCost: 300 },
    { slot: '07:30 PM', place: `Dinner at a Popular ${params.city} Restaurant`, category: 'food', notes: 'Book ahead if it is peak travel season.', baseCost: 1800 },
  ]

  return Array.from({ length: Math.max(params.numDays, 1) }).map((_, idx) => ({
    day_number: idx + 1,
    title: idx === 0 ? `Arrival & ${params.city} Highlights` : `${params.city} Day ${idx + 1} Exploration`,
    activities: activityTemplates.map((tpl) => ({
      time_slot: tpl.slot,
      place_name: tpl.place,
      category: tpl.category,
      estimated_cost: Math.round(tpl.baseCost * multiplier),
      notes: tpl.notes,
    })),
  }))
}

export async function generateItinerary(params: GenerateItineraryParams): Promise<GeneratedDay[]> {
  if (!isAIConfigured) {
    return mockGenerateItinerary(params)
  }

  try {
    const prompt = `Create a detailed ${params.numDays}-day travel itinerary for ${params.city}, ${params.country}.
Budget tier: ${params.budgetTier}. Travel pace: ${params.pace}. Traveler interests: ${
      params.interests.join(', ') || 'general sightseeing'
    }.
For each day, include 3-5 time-slotted activities across categories (sightseeing, food, lodging, transit, activity, other), each with a short helpful note and a realistic estimated cost in Indian Rupees (INR, numeric value only). Use specific, realistic place names for the destination.`

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], {
      schema: ITINERARY_SCHEMA,
      temperature: 0.9,
    })
    const parsed = JSON.parse(text) as { days: GeneratedDay[] }
    if (!parsed.days?.length) throw new Error('AI response did not include any days')
    return parsed.days.slice(0, params.numDays)
  } catch (err) {
    console.error('AI itinerary generation failed, falling back to a curated template:', err)
    return mockGenerateItinerary(params)
  }
}

// ---------------------------------------------------------------------------
// Context-aware Travel Companion Chatbot
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatTripContext {
  tripTitle: string
  destinationCity: string
  destinationCountry: string
  startDate: string
  endDate: string
}

function mockChatReply(lastMessage: string, context: ChatTripContext): string {
  const q = lastMessage.toLowerCase()
  if (q.includes('rain') || q.includes('indoor')) {
    return `For a rainy day in ${context.destinationCity}, consider museums, indoor markets, and cozy cafés near your itinerary stops. Covered attractions and local galleries are a great backup plan.`
  }
  if (q.includes('budget') || q.includes('cost') || q.includes('expense')) {
    return `A rough daily budget for ${context.destinationCity} usually splits into ~40% food, ~30% activities & tickets, ~20% local transport, and ~10% miscellaneous. Track your actual spend against your trip budget as you go.`
  }
  if (q.includes('food') || q.includes('vegetarian') || q.includes('eat')) {
    return `${context.destinationCity} has plenty of well-rated local eateries near popular sightseeing areas — look for spots with strong local reviews close to your Day 1-2 activities for the most convenient options.`
  }
  if (q.includes('pack') || q.includes('wear') || q.includes('clothes')) {
    return `Pack light, breathable layers plus one warmer layer for evenings, comfortable walking shoes, a reusable water bottle, and copies of your travel documents for your trip to ${context.destinationCity}.`
  }
  return `Great question about your trip to ${context.destinationCity}, ${context.destinationCountry} (${context.startDate} - ${context.endDate})! Once your Gemini API key is configured, I can give tailored, up-to-date suggestions — for now, here's a general tip: build in buffer time between activities so you can slow down and enjoy unplanned discoveries.`
}

export async function chatWithCompanion(
  history: ChatMessage[],
  context: ChatTripContext
): Promise<string> {
  const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content || ''

  if (!isAIConfigured) {
    return mockChatReply(lastUserMessage, context)
  }

  try {
    const systemInstruction = `You are a friendly, knowledgeable travel companion chatbot embedded in a trip planning app.
The traveler is planning "${context.tripTitle}" to ${context.destinationCity}, ${context.destinationCountry}, from ${context.startDate} to ${context.endDate}.
Give concise, practical, and specific travel advice (2-4 short paragraphs or a short bulleted list). Stay strictly focused on travel planning for this trip.`

    const contents: GeminiContent[] = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const text = await callGemini(contents, { systemInstruction, temperature: 0.8 })
    return text.trim()
  } catch (err) {
    console.error('AI chat failed, falling back to an offline reply:', err)
    return mockChatReply(lastUserMessage, context)
  }
}

// ---------------------------------------------------------------------------
// GPT Trip Summarizer — "Your trip in 2 minutes"
// ---------------------------------------------------------------------------

export interface TripSummary {
  headline: string
  highlights: string[]
  local_customs: string[]
  packing_tips: string[]
}

const SUMMARY_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING', description: 'One exciting sentence capturing the trip' },
    highlights: { type: 'ARRAY', items: { type: 'STRING' } },
    local_customs: { type: 'ARRAY', items: { type: 'STRING' } },
    packing_tips: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['headline', 'highlights', 'local_customs', 'packing_tips'],
}

function mockSummarizeTrip(trip: Trip): TripSummary {
  return {
    headline: `Get ready for an unforgettable journey through ${trip.destination_city}, ${trip.destination_country}!`,
    highlights: [
      `Discover the must-see landmarks of ${trip.destination_city}`,
      'Sample the local cuisine at well-reviewed neighborhood spots',
      'Balance sightseeing with relaxed downtime between activities',
      'Capture photos at the destination\'s most iconic viewpoints',
    ],
    local_customs: [
      'Greet locals politely and learn a few basic phrases in the local language',
      'Check tipping norms before dining out',
      'Dress modestly when visiting religious or cultural sites',
    ],
    packing_tips: [
      'Comfortable walking shoes for full days of exploring',
      'A universal power adapter',
      'A reusable water bottle',
      'Light layers for changing weather',
      'Copies of your travel documents and booking confirmations',
    ],
  }
}

export async function summarizeTrip(
  trip: Trip,
  days: (ItineraryDay & { activities: Activity[] })[]
): Promise<TripSummary> {
  if (!isAIConfigured) {
    return mockSummarizeTrip(trip)
  }

  try {
    const activityList = days
      .flatMap((d) => (d.activities || []).map((a) => `Day ${d.day_number}: ${a.place_name} (${a.category})`))
      .join('\n')

    const prompt = `Summarize this upcoming trip in an exciting "your trip in 2 minutes" style.
Trip: "${trip.title}" to ${trip.destination_city}, ${trip.destination_country}, from ${trip.start_date} to ${trip.end_date}.
Planned activities:
${activityList || 'No activities planned yet — give general destination guidance instead.'}

Provide a one-sentence headline, 4-6 trip highlights, 3-5 local customs/etiquette tips, and 5-7 packing suggestions tailored to the destination and planned activities.`

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], {
      schema: SUMMARY_SCHEMA,
      temperature: 0.8,
    })
    return JSON.parse(text) as TripSummary
  } catch (err) {
    console.error('AI trip summary failed, falling back to an offline summary:', err)
    return mockSummarizeTrip(trip)
  }
}

// ---------------------------------------------------------------------------
// Smart Packing Checklist Suggestions
// ---------------------------------------------------------------------------

export interface SuggestedChecklistItem {
  category: ChecklistCategory
  item_text: string
}

export interface SuggestChecklistParams {
  trip: Trip
  activityCategories: string[]
}

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  'essentials',
  'documents',
  'electronics',
  'clothing',
  'toiletries',
  'other',
]

const CHECKLIST_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: CHECKLIST_CATEGORIES },
          item_text: { type: 'STRING' },
        },
        required: ['category', 'item_text'],
      },
    },
  },
  required: ['items'],
}

function mockSuggestChecklistItems(trip: Trip): SuggestedChecklistItem[] {
  return [
    { category: 'documents', item_text: 'Passport / government ID' },
    { category: 'documents', item_text: 'Printed & digital copies of bookings' },
    { category: 'documents', item_text: 'Travel insurance documents' },
    { category: 'electronics', item_text: 'Phone charger & power bank' },
    { category: 'electronics', item_text: 'Universal power adapter' },
    { category: 'clothing', item_text: `Comfortable walking shoes for ${trip.destination_city}` },
    { category: 'clothing', item_text: 'Weather-appropriate layers' },
    { category: 'toiletries', item_text: 'Travel-size toiletries kit' },
    { category: 'toiletries', item_text: 'Sunscreen & basic medication' },
    { category: 'essentials', item_text: 'Reusable water bottle' },
    { category: 'essentials', item_text: 'Daypack for sightseeing' },
  ]
}

export async function suggestChecklistItems(params: SuggestChecklistParams): Promise<SuggestedChecklistItem[]> {
  if (!isAIConfigured) {
    return mockSuggestChecklistItems(params.trip)
  }

  try {
    const prompt = `Suggest a smart pre-trip packing checklist for this trip.
Trip: "${params.trip.title}" to ${params.trip.destination_city}, ${params.trip.destination_country}, from ${params.trip.start_date} to ${params.trip.end_date}.
Planned activity types: ${params.activityCategories.join(', ') || 'general sightseeing'}.
Suggest 10-14 concrete checklist items across the categories essentials, documents, electronics, clothing, toiletries, and other, tailored to the destination's likely climate and the planned activities.`

    const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], {
      schema: CHECKLIST_SCHEMA,
      temperature: 0.7,
    })
    const parsed = JSON.parse(text) as { items: SuggestedChecklistItem[] }
    if (!parsed.items?.length) throw new Error('AI response did not include any checklist items')
    return parsed.items
  } catch (err) {
    console.error('AI checklist suggestion failed, falling back to a curated list:', err)
    return mockSuggestChecklistItems(params.trip)
  }
}
