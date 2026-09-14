# 🗺️ Smart Travel Planner & Discovery App — Phase-Wise Master Plan

An all-in-one, AI-powered travel planning platform built with **React 18 + TypeScript + Tailwind CSS** on the frontend, and **Supabase (Auth + PostgreSQL + RLS + Storage + Realtime)** on the backend.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Details & Purpose |
|---|---|---|
| **Frontend Framework** | React 18+ (Vite) + TypeScript | Type-safe, ultra-fast modular client application |
| **Styling & UI System** | Tailwind CSS + Custom Design Tokens | Soft, warm, gentle travel UI with light/dark theme support |
| **Icons & Micro-interactions** | Lucide React | Lightweight, consistent iconography |
| **Routing** | React Router v6 | Nested layouts, public auth & protected route guards |
| **Server State & Cache** | TanStack Query (React Query) | Declarative queries, mutations, cache invalidation & optimistic updates |
| **Backend & Database** | Supabase (PostgreSQL) | Relational database with automated foreign keys and RLS policies |
| **Authentication** | Supabase Auth | Email/password, OAuth providers, and session persistence |
| **Storage (Vault)** | Supabase Storage | Secure buckets for ticket PDFs, booking vouchers, and trip media |
| **Realtime Sync** | Supabase Realtime Channels | Live collaborative itinerary updates across devices |
| **AI Integration** | Google Gemini API / OpenAI API | Itinerary generator, smart suggestions, and travel companion chatbot |
| **Maps & Geo Services** | Leaflet.js (`react-leaflet`) / Mapbox GL | Interactive destination maps, daily activity markers, route lines |
| **External APIs** | OpenWeatherMap API, GeoDB Cities API | Live weather forecasts and global city metadata |

---

## 🧭 High-Level Execution Flow

```mermaid
graph TD
    P1[Phase 1: Foundation, Warm UI Design System & Supabase Setup] --> P2[Phase 2: Core Dashboard & Manual Trip Planner]
    P2 --> P3[Phase 3: Interactive Maps & Destination Explorer]
    P3 --> P4[Phase 4: AI Travel Engine & Smart Assistant]
    P4 --> P5[Phase 5: Document Vault, Checklists & Expense Tracker]
    P5 --> P6[Phase 6: Live Group Collaboration & Social Sharing]
    P6 --> P7[Phase 7: Live Weather, Polish, PWA & Production Deployment]
```

---

## 🗄️ Supabase Relational Database Schema

```mermaid
erDiagram
    PROFILES ||--o{ TRIPS : "owns"
    PROFILES ||--o{ TRIP_MEMBERS : "joins"
    TRIPS ||--o{ TRIP_MEMBERS : "has"
    TRIPS ||--o{ ITINERARY_DAYS : "contains"
    ITINERARY_DAYS ||--o{ ACTIVITIES : "includes"
    TRIPS ||--o{ DOCUMENTS : "attaches"
    TRIPS ||--o{ CHECKLISTS : "has"
    TRIPS ||--o{ EXPENSES : "tracks"

    PROFILES {
        uuid id PK
        string email
        string full_name
        string avatar_url
        jsonb travel_preferences
        timestamp created_at
    }

    TRIPS {
        uuid id PK
        uuid owner_id FK
        string title
        string description
        string destination_city
        string destination_country
        date start_date
        date end_date
        numeric budget
        string visibility
        string cover_image_url
        timestamp created_at
    }

    TRIP_MEMBERS {
        uuid id PK
        uuid trip_id FK
        uuid user_id FK
        string role
        timestamp invited_at
    }

    ITINERARY_DAYS {
        uuid id PK
        uuid trip_id FK
        integer day_number
        date date
        string title
    }

    ACTIVITIES {
        uuid id PK
        uuid day_id FK
        string place_name
        string time_slot
        text notes
        numeric estimated_cost
        string category
        float lat
        float lng
        integer order_index
    }

    DOCUMENTS {
        uuid id PK
        uuid trip_id FK
        uuid user_id FK
        string file_name
        string storage_path
        string file_type
        bigint file_size
    }
```

---

## 📌 Phase-by-Phase Roadmap

### ✅ Phase 1: Foundation, UI System & Supabase Setup *(Completed)*
- Project scaffolding with Vite, React 18, and TypeScript.
- Tailwind CSS setup with custom design tokens for light & dark themes.
- Supabase client configuration, AuthContext, protected routing, and user session management.
- PostgreSQL schema setup with Row-Level Security (RLS) in `supabase/schema.sql`.

### ✅ Phase 2: Core Dashboard & Manual Trip Planner *(Completed)*
- User dashboard with dynamic travel statistics (total trips, countries targeted, travel days, cumulative budget).
- Interactive trip creation modal with duration calculations, presets, and budget goals.
- Multi-day itinerary planner with dynamic day tabs, schedule timelines, and full CRUD operations for activities.
- TanStack Query hooks and `tripService` for Supabase database sync.

### 📌 Phase 3: Interactive Maps & Destination Explorer *(Next)*
- Interactive Leaflet / Mapbox map synchronized with the itinerary.
- Map markers for daily activities (Sightseeing, Dining, Lodging, Transit).
- Route visualizer connecting daily destinations.
- Global destination discovery page (`/explore`) with filters and "Add to Trip" actions.

### 📌 Phase 4: AI Travel Engine & Smart Recommendations
- AI-Powered Itinerary Generator: One-click creation based on duration, interests, pace, and budget tier.
- Context-Aware Travel Companion Chatbot: Suggests offbeat spots, local dining, and rainy-day alternatives.
- GPT Trip Summarizer: "Your trip in 2 minutes".

### 📌 Phase 5: Document Vault, Checklists & Expense Tracker
- Booking & Ticket Vault: Upload and preview flight/hotel PDFs via Supabase Storage.
- Smart Packing Checklists: Categorized packing lists with AI climate/activity suggestions.
- Expense Tracker & Currency Converter: Live budget meter and conversion rates.

### 📌 Phase 6: Group Collaboration & Social Sharing
- Real-time multi-user co-planning using Supabase Realtime channels.
- Invites and permission roles (`Owner`, `Editor`, `Viewer`).
- Public community feed (`/community`) with trip cloning.
- Export itinerary as printable PDF or downloadable `.ics` calendar file.

### 📌 Phase 7: Live Weather, Polish, PWA & Deployment
- OpenWeatherMap integration for 7-day weather forecasts.
- Offline PWA caching for travel on the go without cellular data.
- Production build optimization and deployment to Vercel / Netlify.
