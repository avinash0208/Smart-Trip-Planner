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

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
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

-- Trip Members RLS Policies
CREATE OR REPLACE FUNCTION public.is_trip_member(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE trip_id = target_trip_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_trip_owner(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = target_trip_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_public(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = target_trip_id AND visibility = 'public'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_editor(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE trip_id = target_trip_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_trip_owner(UUID), public.is_trip_public(UUID), public.is_trip_editor(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can view collaborators of accessible trips" ON public.trip_members;
CREATE POLICY "Members can view collaborators of accessible trips"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (
    public.is_trip_owner(trip_members.trip_id)
    OR public.is_trip_public(trip_members.trip_id)
    OR public.is_trip_member(trip_members.trip_id)
  );

DROP POLICY IF EXISTS "Trip owners can invite collaborators" ON public.trip_members;
CREATE POLICY "Trip owners can invite collaborators"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Trip owners can change collaborator roles" ON public.trip_members;
CREATE POLICY "Trip owners can change collaborator roles"
  ON public.trip_members FOR UPDATE
  TO authenticated
  USING (trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can remove collaborators and members can leave" ON public.trip_members;
CREATE POLICY "Owners can remove collaborators and members can leave"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

-- Trips RLS Policies
DROP POLICY IF EXISTS "Users can view trips they own or belong to, or public trips" ON public.trips;
CREATE POLICY "Users can view trips they own or belong to, or public trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR public.is_trip_member(id)
  );

DROP POLICY IF EXISTS "Users can insert trips they own" ON public.trips;
CREATE POLICY "Users can insert trips they own"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners and editors can update trips" ON public.trips;
CREATE POLICY "Owners and editors can update trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_trip_editor(id)
  );

DROP POLICY IF EXISTS "Only owners can delete trips" ON public.trips;
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

DROP POLICY IF EXISTS "View itinerary days of viewable trips" ON public.itinerary_days;
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

DROP POLICY IF EXISTS "Manage itinerary days for trip owners/editors" ON public.itinerary_days;
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

DROP POLICY IF EXISTS "View activities of accessible days" ON public.activities;
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

DROP POLICY IF EXISTS "Manage activities for trip owners/editors" ON public.activities;
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

DROP POLICY IF EXISTS "Trip collaborators can view documents" ON public.documents;
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

DROP POLICY IF EXISTS "Users can upload documents to accessible trips" ON public.documents;
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

DROP POLICY IF EXISTS "Uploaders and trip owners can delete documents" ON public.documents;
CREATE POLICY "Uploaders and trip owners can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

-- Private storage bucket backing the documents table above
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-documents', 'trip-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under `{auth.uid()}/{trip_id}/{filename}` so the first path segment gates access
DROP POLICY IF EXISTS "Users can upload to their own document folder" ON storage.objects;
CREATE POLICY "Users can upload to their own document folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trip-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view files in their own document folder" ON storage.objects;
CREATE POLICY "Users can view files in their own document folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'trip-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete files in their own document folder" ON storage.objects;
CREATE POLICY "Users can delete files in their own document folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trip-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. SMART PACKING & PRE-TRIP CHECKLISTS
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  category TEXT DEFAULT 'essentials' CHECK (category IN ('essentials', 'documents', 'electronics', 'clothing', 'toiletries', 'other')),
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View checklist items of accessible trips" ON public.checklists;
CREATE POLICY "View checklist items of accessible trips"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid() OR visibility = 'public'
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Manage checklist items for trip owners/editors" ON public.checklists;
CREATE POLICY "Manage checklist items for trip owners/editors"
  ON public.checklists FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- 9. EXPENSE TRACKER
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'other' CHECK (category IN ('food', 'transport', 'lodging', 'shopping', 'activities', 'other')),
  paid_by TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View expenses of accessible trips" ON public.expenses;
CREATE POLICY "View expenses of accessible trips"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid() OR visibility = 'public'
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Manage expenses for trip owners/editors" ON public.expenses;
CREATE POLICY "Manage expenses for trip owners/editors"
  ON public.expenses FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
      UNION
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- 10. REALTIME COLLABORATION
-- Streams live INSERT/UPDATE/DELETE events for these tables to subscribed clients (idempotent — safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'itinerary_days'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_days;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trip_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
  END IF;
END $$;
