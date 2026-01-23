const ALLOWED_ORIGINS = new Set([
  'https://yavlgold.com'
]);

const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3-flash'
];

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (origin.startsWith('http://localhost')) return true;
  return false;
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

async function requireUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

function shouldFallback(errorStatus: number, errorMessage: string): boolean {
  if (errorStatus === 404) return true;
  if (/model/i.test(errorMessage) && /not found|not available|invalid/i.test(errorMessage)) return true;
  if (/model/i.test(errorMessage) && /not supported/i.test(errorMessage)) return true;
  return false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  if (req.method === 'OPTIONS') {
    if (!allowed || !origin) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response('ok', { status: 200, headers: corsHeaders(origin) });
  }

  if (!allowed || !origin) {
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, corsHeaders(origin));
  }

  const user = await requireUser(req.headers.get('authorization'));
  if (!user) {
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401, corsHeaders(origin));
  }

  let body: { prompt?: string; context?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: 'INVALID_JSON' }, 400, corsHeaders(origin));
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return jsonResponse({ error: 'EMPTY_PROMPT' }, 400, corsHeaders(origin));
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'MISSING_GEMINI_KEY' }, 500, corsHeaders(origin));
  }

  const contextText = body.context ? `Contexto: ${JSON.stringify(body.context)}\n\n` : '';
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${contextText}${prompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512
    }
  };

  for (let i = 0; i < MODELS.length; i += 1) {
    const model = MODELS[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });

    if (response.status === 429) {
      return jsonResponse(
        { error: 'RATE_LIMIT', retry_after_sec: 60 },
        429,
        corsHeaders(origin)
      );
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof reply !== 'string' || !reply.trim()) {
        return jsonResponse({ error: 'EMPTY_REPLY' }, 500, corsHeaders(origin));
      }
      return jsonResponse({ reply: reply.trim(), model }, 200, corsHeaders(origin));
    }

    const errorMessage = data?.error?.message || '';
    const errorStatus = data?.error?.code || response.status;
    if (shouldFallback(errorStatus, String(errorMessage)) && i < MODELS.length - 1) {
      continue;
    }

    return jsonResponse({ error: 'AI_ERROR' }, 500, corsHeaders(origin));
  }

  return jsonResponse({ error: 'AI_ERROR' }, 500, corsHeaders(origin));
});
