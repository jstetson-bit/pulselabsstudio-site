// Pulse Labs store core: Paddle webhook check + offline Pulse keys. Plain JS, WebCrypto only (Deno and Node 20+).
//
// PULSE KEY = "PLS1-" + base64url(payload JSON) + "." + base64url(ECDSA P-256 / SHA-256 signature, 64 bytes r||s)
//   payload: { v:1, p:"<product id>", o:"<order id>", u:"<buyer tag>", t:<issued, unix seconds> }
// Apps hold only the PUBLIC key and check the signature offline (store/keys/ has Android and Windows checkers).
// The private key lives only in the server's secrets (PLS_KEY_PRIVATE_JWK). Anyone without it cannot make a key.

const te = new TextEncoder();

export function b64u(bytes) {
  let s = ''; const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a;
}
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

// Paddle-Signature: "ts=1671552777;h1=eb4d0dc8..." ; h1 = HMAC-SHA256(secret, ts + ":" + rawBody)
export async function paddleVerify(rawBody, header, secret, maxAgeSec = 300, now = Date.now() / 1000) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(';').map((kv) => kv.split('=')));
  const ts = parts.ts, sigs = header.split(';').filter((kv) => kv.startsWith('h1=')).map((kv) => kv.slice(3));
  if (!ts || !sigs.length) return false;
  if (Math.abs(now - Number(ts)) > maxAgeSec) return false;          // replay guard
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, te.encode(ts + ':' + rawBody)));
  return sigs.some((s) => timingSafeEq(s, mac));
}
function timingSafeEq(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export async function newKeyPair() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey), publicJwk: await crypto.subtle.exportKey('jwk', kp.publicKey),
           publicRaw: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
}

export async function signPulseKey(privateJwk, payload) {
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const body = b64u(te.encode(JSON.stringify(Object.assign({ v: 1 }, payload))));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(body));
  return 'PLS1-' + body + '.' + b64u(sig);
}

// Returns the payload when the key is genuine (optionally for a given product), else null. Used by tests and the site.
export async function checkPulseKey(publicRaw, pulseKey, productId) {
  const m = /^PLS1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec((pulseKey || '').trim());
  if (!m) return null;
  const key = await crypto.subtle.importKey('raw', unb64u(publicRaw), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(m[2]), te.encode(m[1]));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(unb64u(m[1])));
  return productId && p.p !== productId ? null : p;
}

// Turn a Paddle "transaction.completed" event into our order + the keys to issue.
// customData.user_id (set by our checkout) links the purchase to the signed-in account.
export function orderFromPaddle(evt, catalogByPriceId) {
  const d = evt.data || {};
  const items = (d.items || []).map((it) => {
    const priceId = (it.price && it.price.id) || it.price_id;
    const prod = catalogByPriceId[priceId] || null;
    return { price_id: priceId, product_id: prod ? prod.id : null, quantity: it.quantity || 1,
             unit_cents: Number((it.price && it.price.unit_price && it.price.unit_price.amount) || 0) };
  });
  const totals = (d.details && d.details.totals) || {};
  return {
    provider: 'paddle', provider_txn_id: d.id, user_id: (d.custom_data && d.custom_data.user_id) || null,
    status: 'paid', currency: d.currency_code || 'USD', total_cents: Number(totals.grand_total || totals.total || 0),
    items, unknown: items.filter((i) => !i.product_id).map((i) => i.price_id),
  };
}
// a bundle unlocks every product inside it
export function productsToUnlock(order, catalogById) {
  const out = [];
  for (const it of order.items) {
    if (!it.product_id) continue;
    const prod = catalogById[it.product_id];
    for (const pid of (prod && prod.bundle && prod.bundle.length ? prod.bundle : [it.product_id])) if (!out.includes(pid)) out.push(pid);
  }
  return out;
}
