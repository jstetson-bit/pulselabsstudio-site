// Supabase Edge Function: Paddle -> our orders + Pulse keys. Deploy: supabase functions deploy paddle-webhook --no-verify-jwt
// Secrets (supabase secrets set ...): PADDLE_WEBHOOK_SECRET, PLS_KEY_PRIVATE_JWK (JSON), and the built-in SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Paddle notification destination: https://<project>.supabase.co/functions/v1/paddle-webhook
import { paddleVerify, orderFromPaddle, productsToUnlock, signPulseKey } from './lib.js';

const URL_ = Deno.env.get('SUPABASE_URL')!, SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const H = { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
const db = (path: string, init: RequestInit = {}) => fetch(URL_ + '/rest/v1/' + path, { ...init, headers: { ...H, ...(init.headers || {}) } });

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await paddleVerify(raw, req.headers.get('Paddle-Signature') || '', Deno.env.get('PADDLE_WEBHOOK_SECRET') || '')))
    return new Response('bad signature', { status: 401 });
  const evt = JSON.parse(raw);
  if (evt.event_type === 'adjustment.updated' && evt.data?.action === 'refund' && evt.data?.status === 'approved') {
    // refund: mark the order refunded and revoke its keys (apps keep working offline until they re-check; that's fine)
    const o = await (await db(`orders?provider_txn_id=eq.${encodeURIComponent(evt.data.transaction_id)}&select=id`)).json();
    if (o[0]) {
      await db(`orders?id=eq.${o[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'refunded' }) });
      await db(`licenses?order_id=eq.${o[0].id}`, { method: 'PATCH', body: JSON.stringify({ revoked: true }) });
    }
    return new Response('ok');
  }
  if (evt.event_type !== 'transaction.completed') return new Response('ignored');

  const prods = await (await db('products?select=id,paddle_price,bundle')).json();
  const byPrice: Record<string, any> = {}, byId: Record<string, any> = {};
  for (const p of prods) { byId[p.id] = p; if (p.paddle_price) byPrice[p.paddle_price] = p; }
  const order = orderFromPaddle(evt, byPrice);

  // the same payment is only ever recorded once (Paddle retries webhooks)
  const ins = await db('orders', { method: 'POST', headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: order.user_id, provider: order.provider, provider_txn_id: order.provider_txn_id,
                           status: order.status, currency: order.currency, total_cents: order.total_cents }) });
  const rows = await ins.json();
  if (!Array.isArray(rows) || !rows.length) return new Response('already recorded');
  const orderId = rows[0].id;
  await db('order_items', { method: 'POST', body: JSON.stringify(order.items.map((i: any) => ({ order_id: orderId, product_id: i.product_id, price_id: i.price_id, quantity: i.quantity, unit_cents: i.unit_cents }))) });

  const jwk = JSON.parse(Deno.env.get('PLS_KEY_PRIVATE_JWK')!);
  const tag = (order.user_id || 'guest').replace(/-/g, '').slice(0, 10);
  const keys = [];
  for (const pid of productsToUnlock(order, byId))
    keys.push({ user_id: order.user_id, product_id: pid, order_id: orderId,
                pulse_key: await signPulseKey(jwk, { p: pid, o: String(orderId).slice(0, 8), u: tag, t: Math.floor(Date.now() / 1000) }) });
  if (keys.length) await db('licenses', { method: 'POST', body: JSON.stringify(keys) });
  if (order.unknown.length) console.warn('price ids not in the catalog:', order.unknown);
  return new Response('ok');
});
