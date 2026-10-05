import { createClient } from 'npm:@supabase/supabase-js@2'

type Role = 'editor' | 'viewer'

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

function corsHeaders(request: Request): HeadersInit | null {
  const origin = request.headers.get('origin')
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (origin && !isLocalDevelopmentOrigin(origin) && !allowedOrigins.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: Record<string, unknown>, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return new Response('Origin is not allowed', { status: 403 })
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !supabaseUrl || !serviceRoleKey) return json({ error: 'Invitation service is not configured' }, 503, headers)

  let payload: { tripId?: unknown; email?: unknown; role?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400, headers)
  }

  const tripId = typeof payload.tripId === 'string' ? payload.tripId : ''
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const role: Role | null = payload.role === 'editor' || payload.role === 'viewer' ? payload.role : null
  if (!tripId || !email || !/^\S+@\S+\.\S+$/.test(email) || !role) {
    return json({ error: 'A trip, valid email address, and collaborator role are required' }, 400, headers)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user) return json({ error: 'You must be signed in to invite collaborators' }, 401, headers)

  const { data: trip } = await admin.from('trips').select('id').eq('id', tripId).eq('owner_id', auth.user.id).maybeSingle()
  if (!trip) return json({ error: 'Only the trip owner can invite collaborators' }, 403, headers)

  let { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('email', email).maybeSingle()
  if (profileError) return json({ error: 'Unable to look up the invited traveler' }, 500, headers)

  let invitationSent = false
  if (!profile) {
    // A user may exist in Supabase Auth without a profile if the profile trigger
    // was deployed after they signed up. Repair that profile before inviting.
    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersError || !usersPage) return json({ error: 'Unable to look up registered users' }, 500, headers)
    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === email)

    let userId: string
    if (existingUser) {
      userId = existingUser.id
    } else {
      const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
      const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl.replace(/\/$/, '')}/login`,
      })
      if (invitationError || !invitation.user) {
        return json({ error: invitationError?.message || 'Unable to send the invitation email' }, 400, headers)
      }
      userId = invitation.user.id
      invitationSent = true
    }

    const { data: createdProfile, error: createdProfileError } = await admin
      .from('profiles')
      .upsert({ id: userId, email, full_name: existingUser?.user_metadata?.full_name || email.split('@')[0] })
      .select('*')
      .single()
    if (createdProfileError || !createdProfile) return json({ error: 'Invitation was sent, but the collaborator profile could not be created' }, 500, headers)
    profile = createdProfile
  }

  const { data: member, error: memberError } = await admin
    .from('trip_members')
    .insert({ trip_id: tripId, user_id: profile.id, role })
    .select('*, profile:profiles(*)')
    .single()
  if (memberError) {
    return json({ error: memberError.code === '23505' ? 'This person is already a collaborator on this trip.' : memberError.message }, memberError.code === '23505' ? 409 : 500, headers)
  }

  return json({ member, invitationSent }, 200, headers)
})
