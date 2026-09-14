-- ==============================================================================
-- SMART TRAVEL PLANNER: Supabase PostgreSQL Database Schema & RLS Policies
-- ==============================================================================

-- 1. PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  travel_preferences JSONB DEFAULT '{"pace": "moderate", "interests": [], "dietary": []}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. TRIGGER: Auto-create Profile on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(10, 2) DEFAULT 0,
  cover_image_url TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 4. TRIP MEMBERS (For Group Collaboration)
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (trip_id, user_id)
);

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Trips RLS Policies
CREATE POLICY "Users can view trips they own or belong to, or public trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR visibility = 'public'
    OR id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert trips they own"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and editors can update trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "Only owners can delete trips"
  ON public.trips FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 5. ITINERARY DAYS
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View itinerary days of viewable trips"
  ON public.itinerary_days FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid() OR visibility = 'public'
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Manage itinerary days for trip owners/editors"
  ON public.itinerary_days FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- 6. ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID REFERENCES public.itinerary_days(id) ON DELETE CASCADE NOT NULL,
  place_name TEXT NOT NULL,
  time_slot TEXT,
  notes TEXT,
  estimated_cost NUMERIC(10, 2) DEFAULT 0,
  category TEXT DEFAULT 'sightseeing' CHECK (category IN ('sightseeing', 'food', 'lodging', 'transit', 'activity', 'other')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View activities of accessible days"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    day_id IN (
      SELECT id FROM public.itinerary_days WHERE trip_id IN (
        SELECT id FROM public.trips WHERE owner_id = auth.uid() OR visibility = 'public'
        UNION
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Manage activities for trip owners/editors"
  ON public.activities FOR ALL
  TO authenticated
  USING (
    day_id IN (
      SELECT id FROM public.itinerary_days WHERE trip_id IN (
        SELECT id FROM public.trips WHERE owner_id = auth.uid()
        UNION
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );

-- 7. DOCUMENTS VAULT & STORAGE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip collaborators can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to accessible trips"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
