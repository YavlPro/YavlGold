# Post-Merge Health / Status Verification — 2026-04-23

Estado: PASS local y PASS en deploy publico.

> Nota de fecha: archivo solicitado con etiqueta `2026-04-23`; ejecucion real posterior al merge de PRs el 2026-04-24 temprano.

## Local handler

Comando:

```bash
node -e "const h=require('./api/health.js'); async function run(m){let out={method:m,headers:{},statusCode:null,body:null,ended:false}; const res={setHeader:(k,v)=>out.headers[k]=v,status:(c)=>{out.statusCode=c;return res;},json:(b)=>{out.body=b;return out;},end:()=>{out.ended=true;return out;}}; h({method:m},res); return out;} Promise.all(['GET','HEAD','POST'].map(run)).then(r=>console.log(JSON.stringify(r.map(x=>({method:x.method,statusCode:x.statusCode,hasBody:!!x.body,ended:x.ended,bodyKeys:x.body?Object.keys(x.body):[]})),null,2)));"
```

Resultado:

| Metodo | Resultado |
| --- | --- |
| GET | PASS: 200 con body JSON |
| HEAD | PASS: 200 sin body |
| POST | PASS: 405 |

Body keys observadas en GET:

```text
ok, service, version, timestamp
```

No se devuelve `environment`, commit SHA, env vars, stack trace, usuario, tablas, buckets ni datos de sesion.

## Codigo

`api/health.js` responde:

- `GET` y `HEAD`;
- `405 METHOD_NOT_ALLOWED` para otros metodos;
- `Cache-Control: no-store, max-age=0`;
- `X-Content-Type-Options: nosniff`;
- JSON minimo con `ok`, `service`, `version`, `timestamp`.

## `/status` local

Comando:

```bash
rg -n "auth-guard|session-guard|AuthClient|createClient|supabase-js|SUPABASE|VITE_SUPABASE|login|register" apps/gold/status.html
```

Resultado:

- PASS: solo aparecen enlaces a `/#register`.
- No inicializa Supabase client.
- No carga `auth-guard`, `session-guard`, `AuthClient` ni `supabase-js`.
- Es pagina publica estatica con `trust-pages.css`.

## Deploy publico

Comandos:

```bash
curl -iL https://yavlgold.com/health
curl -IL https://yavlgold.com/health
curl -iL -X POST https://yavlgold.com/health
curl -iL https://yavlgold.com/status
```

Resultados:

| Ruta | Resultado |
| --- | --- |
| `GET /health` | PASS: `https://yavlgold.com` redirige 307 a `https://www.yavlgold.com/health`; destino responde 200 JSON minimo |
| `HEAD /health` | PASS: 307 -> 200 sin body |
| `POST /health` | PASS: 307 -> 405 con `Allow: GET, HEAD` |
| `GET /status` | PASS: 307 -> 200 `text/html; charset=utf-8` |

El redirect canonico a `www.yavlgold.com` no rompe el contrato final.
