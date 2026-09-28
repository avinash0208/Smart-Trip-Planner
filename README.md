# Smart Trip Planner

An AI-assisted travel planning application for organizing trips, building day-by-day itineraries, discovering places on a map, and coordinating with fellow travelers.

## Features

- Secure sign-in with Supabase Auth, plus a no-configuration demo mode.
- Trip dashboard with trip creation, itinerary days, activities, budgets, and calendar export.
- Destination Explorer with global search, map-based venue discovery, and one-click itinerary additions.
- AI itinerary generation, trip summaries, travel-companion chat, and packing-list suggestions through Gemini, with useful offline fallbacks.
- Trip documents, packing checklists, categorized expenses, weather forecasts, and multi-currency display.
- Collaboration tools: roles, presence, realtime itinerary refreshes, public sharing, and trip cloning.

## Technology

- React 19, TypeScript, Vite, and Tailwind CSS
- React Router and TanStack Query
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Leaflet and MapLibre for maps
- Google Gemini and OpenWeatherMap integrations

## Getting started

### Requirements

- Node.js 20.19.0 or newer. Node 24 is pinned in [`.nvmrc`](.nvmrc).
- npm 10 or newer is recommended.

The current Vite/Rolldown dependency chain does not support Node 18. Use `nvm use` (or install a current Node LTS release) before installing dependencies or running the project.

### Install and run

```bash
nvm use
npm install
npm run dev
```

Open the local URL printed by Vite. To make a production build:

```bash
npm run build
```

## Configuration

Create a `.env` file in the project root if you want to enable live integrations:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_OPENWEATHER_API_KEY=your-openweather-api-key
```

Supabase enables persistent authentication, trip data, storage, collaboration, and realtime updates. Apply [`supabase/schema.sql`](supabase/schema.sql) to a Supabase project before using the live backend.

Without configuration, the app supports demo sign-in and deterministic fallback content for AI and weather features. Do not expose a privileged Supabase service-role key or other server-only secrets in a Vite environment variable.

## Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Personal travel overview and quick actions |
| `/trips` | View and create trips |
| `/trips/:id` | Itinerary, documents, checklist, budget, maps, and collaboration |
| `/explore` | Search destinations and discover nearby venues |
| `/ai-planner` | Generate and save a personalized itinerary |
| `/community` | Browse and clone publicly shared trips |
| `/settings` | Profile, preferences, theme, and currency settings |

## Project layout

```text
src/
  components/     Reusable UI, map, trip, AI, auth, and layout components
  context/        Authentication, theme, and currency providers
  pages/          Route-level screens
  services/       Supabase and external API integrations
  types/          Database and map type definitions
supabase/
  schema.sql      PostgreSQL schema, policies, and realtime setup
```

## Development commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run lint     # Run ESLint
npm run preview  # Preview the production build locally
```

For the feature roadmap and implementation notes, see [`PLAN.md`](PLAN.md).
