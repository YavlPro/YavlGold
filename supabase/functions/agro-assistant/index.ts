const ASSISTANT_VERSION = 'v9.8.0-agro';

const ALLOWED_ORIGINS = new Set([
  'https://www.yavlgold.com',
  'https://yavlgold.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

const MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3-flash'
];

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

const OUT_OF_SCOPE_REPLY = 'Soy tu asistente de campo. Preguntame sobre cultivos, plagas, riego, clima o cosecha. Para otros temas usa el modulo correspondiente (Crypto u otros).';

const AGRO_KEYWORDS = [
  'cultivo', 'siembra', 'cosecha', 'riego', 'plaga', 'fertiliz', 'suelo', 'hongo',
  'fungic', 'insect', 'malez', 'semilla', 'germin', 'hoja', 'raiz', 'tallo',
  'mancha', 'podred', 'clima', 'humedad', 'lluvia', 'temperatura', 'viento',
  'invernadero', 'nutrient', 'ph', 'abono', 'agro', 'fitosanit', 'pulgon', 'acaro',
  'roya', 'mildiu', 'oidio', 'botrytis', 'fusarium', 'bacteria', 'virus'
];

const NON_AGRO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'cripto', 'blockchain', 'trading',
  'forex', 'acciones', 'bolsa', 'nft', 'defi', 'wallet', 'binance', 'metamask',
  'capital de', 'poema', 'cuento', 'historia', 'codigo', 'programa', 'javascript', 'react',
  'vue', 'svelte', 'python', 'java', 'sql', 'docker', 'linux', 'windows', 'mac',
  'pelicula', 'serie', 'musica', 'futbol', 'nba', 'nfl', 'politica', 'presidente'
];

const SYSTEM_PROMPT = [
  'Eres un Ingeniero Agronomo profesional. Responde solo sobre agricultura y campo (Agro).',
  'Idioma: español. Estilo: directo, practico, con pasos accionables.',
  'NO inventes datos. Si falta informacion critica, responde exactamente: "NO TENGO ese dato" y pide 1-3 datos concretos.',
  'Si mencionas agroquimicos, indica "revisar etiqueta y normativa local" y pide cultivo/etapa/sintomas antes de sugerir.',
  'Formato de respuesta:',
  '1) Diagnostico probable (confianza: baja/media/alta)',
  '2) Acciones inmediatas (1-5 bullets)',
  '3) Preguntas de seguimiento (max 3)',
  '4) Advertencias (si aplica)'
].join('\n');

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'x-agro-assistant-version': ASSISTANT_VERSION
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return {
    ...headers
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isOutOfScopeQuery(prompt: string) {
  const normalized = normalizeText(prompt);
  const hasAgro = AGRO_KEYWORDS.some((kw) => normalized.includes(kw));
  const hasNonAgro = NON_AGRO_KEYWORDS.some((kw) => normalized.includes(kw));
  return hasNonAgro && !hasAgro;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin);
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    if (!allowed || !origin) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (!allowed || !origin) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, cors);
  }

  const user = await requireUser(req.headers.get('authorization'));
  if (!user) {
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401, cors);
  }

  let body: { prompt?: string; message?: string; context?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: 'INVALID_JSON' }, 400, cors);
  }

  const prompt = typeof body.message === 'string'
    ? body.message.trim()
    : typeof body.prompt === 'string'
      ? body.prompt.trim()
      : '';
  if (!prompt) {
    return jsonResponse({ error: 'EMPTY_PROMPT' }, 400, cors);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'MISSING_GEMINI_KEY' }, 500, cors);
  }

  if (isOutOfScopeQuery(prompt)) {
    return jsonResponse({ reply: OUT_OF_SCOPE_REPLY, category: 'out_of_scope' }, 200, cors);
  }

  const contextText = body.context
    ? `Contexto usuario (JSON): ${JSON.stringify(body.context)}\n\n`
    : 'Contexto usuario: NO DISPONIBLE\n\n';
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `${contextText}Consulta del usuario: ${prompt}` }]
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
        cors
      );
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const parts = data?.candidates?.[0]?.content?.parts;
      const reply = Array.isArray(parts)
        ? parts.map((part: { text?: string }) => part?.text || '').join('').trim()
        : '';
      if (typeof reply !== 'string' || !reply.trim()) {
        return jsonResponse({ error: 'EMPTY_REPLY' }, 500, cors);
      }
      return jsonResponse({ reply: reply.trim(), model }, 200, cors);
    }

    const errorMessage = data?.error?.message || '';
    const errorStatus = data?.error?.code || response.status;
    if (shouldFallback(errorStatus, String(errorMessage)) && i < MODELS.length - 1) {
      continue;
    }

    return jsonResponse({ error: 'AI_ERROR' }, 500, cors);
  }

  return jsonResponse({ error: 'AI_ERROR' }, 500, cors);
});
