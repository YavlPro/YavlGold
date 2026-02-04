const ASSISTANT_VERSION = 'v10.0.0-agro-agent';

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
  'roya', 'mildiu', 'oidio', 'botrytis', 'fusarium', 'bacteria', 'virus',
  'bitacora', 'evento', 'anotar', 'registrar', 'batata', 'progreso', 'estado'
];

const NON_AGRO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'crypto', 'cripto', 'blockchain', 'trading',
  'forex', 'acciones', 'bolsa', 'nft', 'defi', 'wallet', 'binance', 'metamask',
  'capital de', 'poema', 'cuento', 'historia', 'codigo', 'programa', 'javascript', 'react',
  'vue', 'svelte', 'python', 'java', 'sql', 'docker', 'linux', 'windows', 'mac',
  'pelicula', 'serie', 'musica', 'futbol', 'nba', 'nfl', 'politica', 'presidente'
];

const SYSTEM_PROMPT = [
  'Eres un Ingeniero Agronomo profesional y Asistente de Campo (Agro).',
  'Idioma: español. Estilo: directo, practico, con pasos accionables.',
  'Tienes acceso a herramientas para consultar el estado de cultivos y registrar eventos.',
  'USA tus herramientas cuando el usuario pregunte por el estado de un cultivo o pida registrar algo.',
  'Cuando pregunten por estado/progreso: SIEMPRE usa get_crop_status con include_last_events=true.',
  'NO inventes datos. Si falta informacion critica, responde exactamente: "NO TENGO ese dato".',
  'Formato de respuesta: Diagnostico/Estado -> Acciones/Confirmacion -> Seguimiento.',
  '**Si preguntan por deudas, cuentas por cobrar, "quién me debe" o pagos pendientes: USA `get_pending_payments`. Por defecto excluye lo ya transferido/pagado.**',
  '**Cuando el usuario diga solo “mi <cultivo>” o pregunte por estado/progreso (ej: “¿Cómo va mi batata?”), debes: (1) llamar `get_my_crops` para resolver el `crop_id` si no está explícito; (2) luego llamar `get_crop_status` con `include_last_events=true` y `events_limit=5`. En la respuesta, muestra 2–5 eventos recientes (fecha + tipo + nota). No prometas monitoreo automático ni avisos futuros; ofrece registrar eventos o recordatorios manuales.**'
].join('\n');

const TOOLS_DEF = [
  {
    name: "get_crop_status",
    description: "Obtiene el estado actual de un cultivo, su progreso y ultimos eventos registrados.",
    parameters: {
      type: "OBJECT",
      properties: {
        crop_id: { type: "STRING", description: "UUID del cultivo" },
        include_last_events: { type: "BOOLEAN", description: "Incluir ultimos eventos (default true)" },
        events_limit: { type: "NUMBER", description: "Cantidad maxima de eventos a traer (default 5)" }
      },
      required: ["crop_id"]
    }
  },
  {
    name: "get_my_crops",
    description: "Lista los cultivos del usuario para encontrar IDs por nombre.",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "log_event",
    description: "Registra un nuevo evento agricola (riego, cosecha, nota, etc) para un cultivo.",
    parameters: {
      type: "OBJECT",
      properties: {
        crop_id: { type: "STRING", description: "UUID del cultivo (obligatorio)" },
        type: { type: "STRING", description: "Tipo de evento", enum: ['riego','abono','fumigacion','cosecha','venta','observacion','nota','otro','status_change','amend'] },
        qty: { type: "NUMBER", description: "Cantidad (opcional)" },
        unit: { type: "STRING", description: "Unidad de medida (requerida si hay qty)", enum: ['kg','l','saco','medio_saco','cesta'] },
        note: { type: "STRING", description: "Nota o descripcion adicional" },
        occurred_at: { type: "STRING", description: "Fecha ISO (opcional, default now)" }
      },
      required: ["crop_id", "type"]
    }
  },
  {
    name: "get_pending_payments",
    description: "Consulta deudas o cobros pendientes activos (no transferidos), filtrados por fecha o cultivo.",
    parameters: {
      type: "OBJECT",
      properties: {
        range: { type: "STRING", enum: ["today","7d","30d","month","all"], description: "Rango de fechas (default 30d)" },
        crop_id: { type: "STRING", description: "Filtrar por cultivo (opcional)" },
        group_by: { type: "STRING", enum: ["client","none"], description: "Agrupar por cliente (default client)" },
        include_transferred: { type: "BOOLEAN", description: "Incluir items ya transferidos a ingresos/perdidas (default false)" }
      },
      required: []
    }
  },
  {
    name: "get_finance_summary",
    description: "Obtiene resumen financiero (gastos, ingresos, balance) filtrado por fechas.",
    parameters: {
      type: "OBJECT",
      properties: {
        range: {
          type: "OBJECT",
          properties: {
             preset: { type: "STRING", description: "today, 7d, 30d, month" },
             from: { type: "STRING", description: "YYYY-MM-DD" },
             to: { type: "STRING", description: "YYYY-MM-DD" }
          },
          description: "Rango de fechas (preset O from/to)"
        },
        crop_id: { type: "STRING", description: "Filtrar por cultivo (opcional)" }
      },
      required: ["range"]
    }
  }
];

// --- HELPERS ---

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
  return { ...headers };
}

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isOutOfScopeQuery(prompt: string) {
  const normalized = normalizeText(prompt);
  const hasAgro = AGRO_KEYWORDS.some((kw) => normalized.includes(kw));
  const hasNonAgro = NON_AGRO_KEYWORDS.some((kw) => normalized.includes(kw));
  return hasNonAgro && !hasAgro;
}

// --- DB HELPERS ---

async function supabaseRequest(method: string, path: string, body: any, authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase Config');

  const url = `${supabaseUrl}/rest/v1/${path}`;
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation' // Para devolver la fila insertada
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    // Parse error JSON if possible
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.message || text);
    } catch {
      throw new Error(`Supabase error ${response.status}: ${text}`);
    }
  }

  return await response.json();
}

async function requireUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey! }
  });
  if (!res.ok) return null;
  return await res.json();
}

// --- TOOL HANDLERS ---

async function handleGetMyCrops(_args: any, authHeader: string) {
  try {
     const result = await supabaseRequest('GET', 'agro_crops?select=id,name,variety,status', null, authHeader);
     return { ok: true, data: result };
  } catch(e: any) {
     return { ok: false, error: 'GET_CROPS_ERROR', message: e.message };
  }
}

async function handleGetFinanceSummary(args: any, authHeader: string) {
  try {
    const { range, crop_id } = args || {};
    let startStr, endStr;

    // 1. Resolve Dates
    const now = new Date();

    if (range?.preset) {
       if (range.preset === 'today') {
         startStr = now.toISOString().split('T')[0];
         endStr = startStr;
       } else if (range.preset === '7d') {
         const past = new Date(now); past.setDate(now.getDate() - 7);
         startStr = past.toISOString().split('T')[0];
         endStr = now.toISOString().split('T')[0];
       } else if (range.preset === '30d') {
         const past = new Date(now); past.setDate(now.getDate() - 30);
         startStr = past.toISOString().split('T')[0];
         endStr = now.toISOString().split('T')[0];
       } else if (range.preset === 'month') {
         const first = new Date(now.getFullYear(), now.getMonth(), 1);
         startStr = first.toISOString().split('T')[0];
         endStr = now.toISOString().split('T')[0];
       }
    } else if (range?.from) {
       startStr = range.from;
       endStr = range.to || now.toISOString().split('T')[0];
    } else {
       // Default to month if missing
       const first = new Date(now.getFullYear(), now.getMonth(), 1);
       startStr = first.toISOString().split('T')[0];
       endStr = now.toISOString().split('T')[0];
    }

    // 2. Parallel Fetch (Expenses & Income)
    const expUrl = `agro_expenses?select=amount,category&deleted_at=is.null&date=gte.${startStr}&date=lte.${endStr}` + (crop_id ? `&crop_id=eq.${crop_id}` : '');
    const incUrl = `agro_income?select=amount&deleted_at=is.null&date=gte.${startStr}&date=lte.${endStr}` + (crop_id ? `&crop_id=eq.${crop_id}` : '');

    const [expRes, incRes] = await Promise.all([
       supabaseRequest('GET', expUrl, null, authHeader),
       supabaseRequest('GET', incUrl, null, authHeader)
    ]);

    // 3. Aggregation
    const expenses = Array.isArray(expRes) ? expRes : [];
    const income = Array.isArray(incRes) ? incRes : [];

    const totalExp = expenses.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalInc = income.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    // Group Expense Categories
    const catMap: Record<string, number> = {};
    expenses.forEach((item: any) => {
       const cat = item.category || 'Otros';
       catMap[cat] = (catMap[cat] || 0) + (Number(item.amount) || 0);
    });

    const topExp = Object.entries(catMap)
       .map(([cat, amount]) => ({ category: cat, total: amount }))
       .sort((a, b) => b.total - a.total)
       .slice(0, 5);

    return {
      ok: true,
      data: {
        range_resolved: { from: startStr, to: endStr, preset: range?.preset },
        totals: {
           expenses: totalExp,
           income: totalInc,
           net: totalInc - totalExp
        },
        counts: {
           expenses: expenses.length,
           income: income.length
        },
        top_expense_categories: topExp
      }
    };

  } catch (e: any) {
    return { ok: false, error: 'FINANCE_ERROR', message: e.message };
  }
}

async function handleGetCropStatus(args: any, authHeader: string) {
  try {
    const { crop_id } = args;
    // Defaults: include_last_events=true unless explicitly false, limit=5
    const include_last_events = args.include_last_events !== false;
    const events_limit = args.events_limit || 5;

    if (!crop_id) throw new Error('crop_id is required');

    // 1. Get Crop
    const crops = await supabaseRequest('GET', `agro_crops?id=eq.${crop_id}&select=*`, null, authHeader);
    if (!crops || crops.length === 0) {
      return { ok: false, error: 'NOT_FOUND', message: 'Cultivo no encontrado o sin acceso.' };
    }
    const crop = crops[0];

    // 2. Calculate Progress
    let progress = null;
    let total_days = null;
    let elapsed_days = null;
    let remaining_days = null;
    let pct = null;

    if (crop.start_date && crop.expected_harvest_date) {
      const start = new Date(crop.start_date);
      const end = new Date(crop.expected_harvest_date);
      const now = new Date();

      const msPerDay = 1000 * 60 * 60 * 24;
      total_days = Math.round((end.getTime() - start.getTime()) / msPerDay);
      elapsed_days = Math.round((now.getTime() - start.getTime()) / msPerDay);

      // Fix negative elapsed if started in future (unlikely but safe)
      if (elapsed_days < 0) elapsed_days = 0;

      remaining_days = total_days - elapsed_days;

      if (total_days > 0) {
        pct = Math.min(100, Math.round((elapsed_days / total_days) * 100));
      } else {
        pct = 100;
      }

      progress = {
        total_days,
        elapsed_days,
        remaining_days,
        pct
      };
    } else if (crop.progress !== undefined) {
      pct = crop.progress;
      progress = { pct, note: "Calculado manualmente" };
    }

    // 3. Get Events if requested
    let last_events = [];
    if (include_last_events) {
      const limit = events_limit || 10;
      last_events = await supabaseRequest(
        'GET',
        `agro_events?crop_id=eq.${crop_id}&order=occurred_at.desc&limit=${limit}`,
        null,
        authHeader
      );
    }

    return {
      ok: true,
      data: {
        crop: {
          id: crop.id,
          name: crop.name,
          variety: crop.variety,
          status: crop.status,
          start_date: crop.start_date,
          expected_harvest_date: crop.expected_harvest_date
        },
        progress,
        last_events
      }
    };

  } catch (err: any) {
    return { ok: false, error: 'INTERNAL_ERROR', message: err.message };
  }
}

async function handleLogEvent(args: any, authHeader: string) {
  try {
    const { crop_id, type, qty, unit, note, occurred_at } = args;

    // a) Validate Params
    if (!crop_id || !type) return { ok: false, error: 'MISSING_PARAMS', message: 'crop_id y type son requeridos' };

    const VALID_TYPES = ['riego','abono','fumigacion','cosecha','venta','observacion','nota','otro','status_change','amend'];
    if (!VALID_TYPES.includes(type)) {
      return { ok: false, error: 'INVALID_TYPE', message: `Tipo invalido. Permitidos: ${VALID_TYPES.join(', ')}` };
    }

    // b) Validate Qty/Unit
    if (qty !== undefined && qty !== null) {
      if (!unit) return { ok: false, error: 'MISSING_UNIT', message: 'Si indicas qty, debes indicar unit.' };
      const VALID_UNITS = ['kg','l','saco','medio_saco','cesta'];
      if (!VALID_UNITS.includes(unit)) {
        return { ok: false, error: 'INVALID_UNIT', message: `Unidad invalida. Permitidas: ${VALID_UNITS.join(', ')}` };
      }
    }

    // c) Occurred At
    let finalOccurrence = new Date().toISOString();
    if (occurred_at) {
      // Validate date
      const d = new Date(occurred_at);
      if (isNaN(d.getTime())) return { ok: false, error: 'INVALID_DATE', message: 'occurred_at debe ser fecha ISO valida' };
      finalOccurrence = d.toISOString();
    }

    // d) Insert (User ID is handled by RLS via authHeader, but we must pass it in body if tables expects it OR rely on default?
    // Wait, the INSERT policy expects auth.uid() = user_id.
    // If we send user_id in body, it must match.
    // We can extract user_id from authHeader check (auth/v1/user) OR just send it.
    // Ideally we fetch user first.
    const userObj = await requireUser(authHeader);
    if (!userObj || !userObj.id) return { ok: false, error: 'UNAUTHORIZED', message: 'No user found' };

    const payload = {
      user_id: userObj.id,
      crop_id,
      type,
      qty: qty || null,
      unit: unit || null,
      note: note || null,
      occurred_at: finalOccurrence
    };

    const result = await supabaseRequest('POST', 'agro_events', payload, authHeader);

    return {
      ok: true,
      data: result && result.length > 0 ? result[0] : result,
      message: 'Evento registrado correctamente'
    };

  } catch (err: any) {
    return { ok: false, error: 'INSERT_ERROR', message: err.message };
  }
}

async function handleGetPendingPayments(args: any, authHeader: string) {
  try {
    const { range = '30d', crop_id, group_by = 'client', include_transferred = false } = args;

    // 1. Calculate Date Range
    const now = new Date();
    let startStr = '';

    if (range !== 'all') {
        if (range === 'today') {
            startStr = now.toISOString().split('T')[0];
        } else if (range === '7d') {
            const past = new Date(now); past.setDate(now.getDate() - 7);
            startStr = past.toISOString().split('T')[0];
        } else if (range === 'month') { // Current month
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = first.toISOString().split('T')[0];
        } else { // Default 30d
            const past = new Date(now); past.setDate(now.getDate() - 30);
            startStr = past.toISOString().split('T')[0];
        }
    }

    // 2. Build Query
    let query = `agro_pending?select=id,monto,fecha,cliente,concepto,crop_id,transfer_state,created_at&deleted_at=is.null`;

    // Active filter (exclude transferred unless requested)
    if (!include_transferred) {
        // PostgREST "is distinct from" syntax or just "not.eq"
        // Since we want to include NULL and 'active' and 'reverted', but exclude 'transferred'.
        // "transfer_state=neq.transferred" should work, keeping NULLs?
        // PostgREST neq keeps nulls? No, strictly SQL usually drops nulls on comparison unless IS DISTINCT FROM.
        // If transfer_state can be null, neq.transferred might exclude nulls.
        // Safer: is.distinct_from would be ideal but filter syntax is limited.
        // Alternative: or=(transfer_state.is.null,transfer_state.neq.transferred)
        // Let's try explicit OR logic or ensure column has default. schema says default 'active'.
        // So assuming mostly 'active' or 'transferred' or 'reverted'.
        // However, older rows might be NULL.
        // Let's use logic: NOT transferred.
        // PostgREST: not.eq.transferred (if nulls are issue, we check)
        // Let's rely on filter: `transfer_state=neq.transferred`
        // NOTE: Postgres comparison `!=` returns null for nulls.
        // Safe bet: `or=(transfer_state.is.null,transfer_state.neq.transferred)`
        query += `&or=(transfer_state.is.null,transfer_state.neq.transferred)`;
    }

    if (startStr) {
        query += `&fecha=gte.${startStr}`;
    }
    if (crop_id) {
        query += `&crop_id=eq.${crop_id}`;
    }

    // Order by date desc
    query += `&order=fecha.desc`;

    // 3. Execute
    const data = await supabaseRequest('GET', query, null, authHeader);
    const rows = Array.isArray(data) ? data : [];

    // 4. Transform & Aggregate
    const totalAmount = rows.reduce((sum: number, item: any) => sum + (Number(item.monto) || 0), 0);

    const ONE_DAY = 1000 * 60 * 60 * 24;
    const enriched = rows.map((item: any) => {
        const d = new Date(item.fecha);
        const diff = Math.round((now.getTime() - d.getTime()) / ONE_DAY);
        return {
            ...item,
            days_outstanding: diff
        };
    });

    // Grouping
    let grouped = null;
    if (group_by === 'client') {
        const map: Record<string, { client: string, total: number, count: number }> = {};
        enriched.forEach((item: any) => {
            const client = item.cliente || 'Sin Cliente';
            if (!map[client]) map[client] = { client, total: 0, count: 0 };
            map[client].total += Number(item.monto) || 0;
            map[client].count += 1;
        });
        grouped = Object.values(map).sort((a, b) => b.total - a.total);
    }

    return {
        ok: true,
        data: {
            summary: {
                total_pending: totalAmount,
                count: rows.length,
                range_start: startStr || 'all-time'
            },
            by_client: grouped, // Optional
            latest_items: enriched.slice(0, 10) // Top 10 most recent
        }
    };

  } catch (err: any) {
    return { ok: false, error: 'GET_PENDING_ERROR', message: err.message };
  }
}

// --- MAIN SERVE ---

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin);
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (!allowed || !origin) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, cors);
  }

  const authHeader = req.headers.get('authorization') || '';
  const user = await requireUser(authHeader);
  if (!user) {
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401, cors);
  }

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'INVALID_JSON' }, 400, cors); }

  const prompt = (body.message || body.prompt || '').trim();
  if (!prompt) return jsonResponse({ error: 'EMPTY_PROMPT' }, 400, cors);

  if (isOutOfScopeQuery(prompt)) {
    return jsonResponse({ reply: OUT_OF_SCOPE_REPLY, category: 'out_of_scope' }, 200, cors);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'MISSING_GEMINI_KEY' }, 500, cors);

  const contextText = body.context ? `Contexto usuario (JSON): ${JSON.stringify(body.context)}\n\n` : '';
  const fullPrompt = `${contextText}Consulta del usuario: ${prompt}`;

  // Initial Content Payload
  const contents = [
    { role: 'user', parts: [{ text: fullPrompt }] }
  ];

  // Try Models Loop
  for (const model of MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload: any = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...contents], // Copy initial contents
        tools: [{ function_declarations: TOOLS_DEF }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      };

      // Multi-turn Loop (Max Steps)
      const MAX_TOOL_STEPS = 3;
      let step = 0;
      let keepGoing = true;
      const executedCommands = new Set<string>(); // Anti-loop

      while (keepGoing && step < MAX_TOOL_STEPS) {

        let response = await fetch(endpoint, {
           method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload)
        });

        if (response.status === 429) {
           throw new Error('RATE_LIMIT'); // Trigger next model
        }

        let data = await response.json();
        const candidate = data?.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        // 1. If Text Response (Final Answer)
        if (!part || !part.functionCall) {
          const reply = part?.text || '';
          if (reply) return jsonResponse({ reply, model }, 200, cors);
          // If no text and no function call, logic error or safety filter
          return jsonResponse({ error: 'AI_NO_RESPONSE' }, 500, cors);
        }

        // 2. If Tool Call
        const fn = part.functionCall;
        const toolName = fn.name;
        const toolArgs = fn.args || {};

        // Anti-Loop Check
        const cmdHash = `${toolName}:${JSON.stringify(toolArgs)}`;
        if (executedCommands.has(cmdHash)) {
           // Break loop, force generic response
           keepGoing = false;
           // Append a system message or just return what we have?
           // Better to return a message saying we are stuck
           // Or just continue to next iteration which will likely be text?
           // Actually, we must inject the result to the model so it knows it failed?
           // Let's just break and return a fallback message or let the model verify history.
           // Simplest: Break loop, next iteration will not happen, but we need to return something.
           // We will act as if the tool returned an error.

           // Inject error
           payload.contents.push({
             role: 'model',
             parts: [{ functionCall: fn }]
           });
           payload.contents.push({
             role: 'function',
             parts: [{ functionResponse: { name: toolName, response: { result: { ok: false, error: 'LOOP_DETECTED', message: 'Ya intentaste esta accion. Pide mas datos.' } } } }]
           });
           step++;
           continue;
        }
        executedCommands.add(cmdHash);

        // --- SECURE LOGGING START ---
        const startTs = performance.now();
        const userIdShort = user.id ? user.id.split('-').pop() : 'anon';
        const cropIdShort = toolArgs.crop_id ? toolArgs.crop_id.split('-').pop() : 'N/A';
        console.log(`[Tool:Start] ${toolName} User:${userIdShort} Crop:${cropIdShort} Step:${step + 1}`);
        // --- SECURE LOGGING END ---

        // Execute Tool
        let toolResult: any = { ok: false, error: 'UNKNOWN_TOOL', message: 'Tool not found' };

        if (toolName === 'get_crop_status') {
          toolResult = await handleGetCropStatus(toolArgs, authHeader);
        } else if (toolName === 'log_event') {
          toolResult = await handleLogEvent(toolArgs, authHeader);
        } else if (toolName === 'get_finance_summary') {
          toolResult = await handleGetFinanceSummary(toolArgs, authHeader);
        } else if (toolName === 'get_my_crops') {
          toolResult = await handleGetMyCrops(toolArgs, authHeader);
        } else if (toolName === 'get_pending_payments') {
          toolResult = await handleGetPendingPayments(toolArgs, authHeader);
        }

        // --- SECURE LOGGING RESULT ---
        const duration = Math.round(performance.now() - startTs);
        const logStatus = toolResult.ok ? 'OK' : 'ERROR';
        const isDebug = Deno.env.get('DEBUG') === 'true';

        let logMsg = `[Tool:End] ${toolName} Status:${logStatus} Time:${duration}ms`;
        if (!toolResult.ok) logMsg += ` Err:${toolResult.error}`;
        console.log(logMsg);
        // --- SECURE LOGGING RESULT END ---

        // Add to history
        payload.contents.push({
          role: 'model',
          parts: [{ functionCall: fn }]
        });

        payload.contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: toolName,
              response: { result: toolResult }
            }
          }]
        });

        step++;
        // Loop continues to feed result back to Gemini
      } // end while

      // If max steps reached without final answer
      return jsonResponse({ reply: 'Lo siento, la consulta es muy compleja y alcance el limite de pasos. Se mas especifico.', model }, 200, cors);

    } catch (e: any) {
      if (e.message === 'RATE_LIMIT') continue;
      if (model === MODELS[MODELS.length - 1]) throw e;
      continue;
    }
  }

  return jsonResponse({ error: 'AI_ERROR' }, 500, cors);
});
