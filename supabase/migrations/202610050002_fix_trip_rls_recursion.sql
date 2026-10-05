-- Keep trips and trip_members policies from recursively evaluating each other.
CREATE OR REPLACE FUNCTION public.is_trip_member(target_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members WHERE trip_id = target_trip_id AND user_id = auth.uid()
  );
$$;

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

GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID), public.is_trip_owner(UUID), public.is_trip_public(UUID), public.is_trip_editor(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members can view collaborators of accessible trips" ON public.trip_members;
CREATE POLICY "Members can view collaborators of accessible trips"
  ON public.trip_members FOR SELECT TO authenticated
  USING (
    public.is_trip_owner(trip_id)
    OR public.is_trip_public(trip_id)
    OR public.is_trip_member(trip_id)
  );

DROP POLICY IF EXISTS "Users can view trips they own or belong to, or public trips" ON public.trips;
CREATE POLICY "Users can view trips they own or belong to, or public trips"
  ON public.trips FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR public.is_trip_member(id)
  );

DROP POLICY IF EXISTS "Owners and editors can update trips" ON public.trips;
CREATE POLICY "Owners and editors can update trips"
  ON public.trips FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_trip_editor(id));
