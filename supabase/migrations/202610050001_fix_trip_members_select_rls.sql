-- Avoid recursive RLS evaluation when collaborators load the trip_members table.
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

DROP POLICY IF EXISTS "Members can view collaborators of accessible trips" ON public.trip_members;
CREATE POLICY "Members can view collaborators of accessible trips"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips
      WHERE public.trips.id = trip_members.trip_id
        AND (public.trips.owner_id = auth.uid() OR public.trips.visibility = 'public')
    )
    OR public.is_trip_member(trip_members.trip_id)
  );
