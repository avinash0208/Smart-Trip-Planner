type GeminiContent = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

type GeminiOptions = {
  schema?: Record<string, unknown>
  systemInstruction?: string
  temperature?: number
}

const GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
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
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (origin && !isLocalDevelopmentOrigin(origin) && !configuredOrigins.includes(origin)) {
    return null
  }

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: Record<string, unknown>, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

function isGeminiContent(value: unknown): value is GeminiContent {
  if (!value || typeof value !== 'object') return false
  const content = value as { role?: unknown; parts?: unknown }
  return (
    (content.role === 'user' || content.role === 'model') &&
    Array.isArray(content.parts) &&
    content.parts.length > 0 &&
    content.parts.every(
      (part) =>
        Boolean(part) &&
        typeof part === 'object' &&
        typeof (part as { text?: unknown }).text === 'string' &&
        (part as { text: string }).text.length <= 16_000
    )
  )
}

function isOptions(value: unknown): value is GeminiOptions {
  if (!value || typeof value !== 'object') return false
  const options = value as GeminiOptions
  return (
    (options.systemInstruction === undefined || typeof options.systemInstruction === 'string') &&
    (options.temperature === undefined || (typeof options.temperature === 'number' && options.temperature >= 0 && options.temperature <= 2)) &&
    (options.schema === undefined || (typeof options.schema === 'object' && options.schema !== null))
  )
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return new Response('Origin is not allowed', { status: 403 })
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured')
    return json({ error: 'AI service is not configured' }, 503, headers)
  }

  let payload: { contents?: unknown; options?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400, headers)
  }

  if (!Array.isArray(payload.contents) || payload.contents.length === 0 || payload.contents.length > 30 || !payload.contents.every(isGeminiContent)) {
    return json({ error: 'Invalid conversation content' }, 400, headers)
  }
  if (!isOptions(payload.options ?? {})) return json({ error: 'Invalid generation options' }, 400, headers)

  const options = (payload.options ?? {}) as GeminiOptions
  if (JSON.stringify(options).length > 30_000) return json({ error: 'Generation options are too large' }, 400, headers)

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
  }
  if (options.schema) {
    generationConfig.responseMimeType = 'application/json'
    generationConfig.responseSchema = options.schema
  }

  const body: Record<string, unknown> = {
    contents: payload.contents,
    generationConfig,
  }
  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] }
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error(`Gemini request failed (${response.status}): ${detail.slice(0, 1000)}`)
      return json({ error: 'AI provider request failed', status: response.status }, 502, headers)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || ''
    if (!text.trim()) return json({ error: 'AI provider returned an empty response' }, 502, headers)

    return json({ text }, 200, headers)
  } catch (error) {
    console.error('Gemini request could not be completed:', error)
    return json({ error: 'AI provider is temporarily unavailable' }, 502, headers)
  }
})
