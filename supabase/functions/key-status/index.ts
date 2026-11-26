// Supabase Edge Function: is this Pulse key still good? (weekly check from the apps; answers only valid/revoked)
// Deploy: supabase functions deploy key-status --no-verify-jwt
// The key itself is checked offline by the apps; this only tells them about refunds or keys switched off.
const URL_ = Deno.env.get('SUPABASE_URL')!, SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  let key = '';
  try { key = String((await req.json()).key || '').trim(); } catch { /* empty */ }
  if (!/^PLS1-[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{40,}$/.test(key) || key.length > 1000) return new Response(JSON.stringify({ known: false }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  const r = await fetch(`${URL_}/rest/v1/licenses?select=revoked,product_id&pulse_key=eq.${encodeURIComponent(key)}`, { headers: { apikey: SR, Authorization: 'Bearer ' + SR } });
  const rows = r.ok ? await r.json() : [];
  const out = rows.length ? { known: true, revoked: !!rows[0].revoked, product: rows[0].product_id } : { known: false };
  return new Response(JSON.stringify(out), { headers: { ...CORS, 'Content-Type': 'application/json' } });
});
