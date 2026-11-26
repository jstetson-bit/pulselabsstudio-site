// Supabase Edge Function: "Report this page" from Pulse Dark (and later any app).
// Deploy: supabase functions deploy page-report --no-verify-jwt
// Secrets: built-in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; REPORT_SALT (any long random text, for the rate-limit hash);
// optional GITHUB_TICKETS_TOKEN (fine-grained, contents read/write on jstetson-bit/pls-tickets only) so every report also
// becomes a farm ticket that Watch-Tickets.ps1 hands to the seat.
// Nothing is ever sent without the person pressing the green check in the extension; this only receives what they sent.
import { checkReport, reportId } from './lib.js';

const URL_ = Deno.env.get('SUPABASE_URL')!, SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const H = { apikey: SR, Authorization: 'Bearer ' + SR };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const LIMIT_PER_HOUR = 12;

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
function b64(bytes: Uint8Array) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  const raw = await req.text();
  if (raw.length > 3_000_000) return json({ ok: false, error: 'Report too big' }, 413);
  let body: any; try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'Bad report' }, 400); }
  const r = checkReport(body);
  if (!r.ok) return json({ ok: false, error: r.error }, 400);

  // rate limit per sender, without keeping the address
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ipHash = await sha((Deno.env.get('REPORT_SALT') || 'pls') + ip);
  const since = new Date(Date.now() - 3600e3).toISOString();
  const cnt = await fetch(`${URL_}/rest/v1/page_reports?select=id&ip_hash=eq.${ipHash}&created_at=gte.${since}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const total = Number((cnt.headers.get('content-range') || '/0').split('/')[1] || 0);
  if (total >= LIMIT_PER_HOUR) return json({ ok: false, error: 'Too many reports from here this hour. Thank you, we have them.' }, 429);

  const id = reportId(new Date());
  let shotPath: string | null = null;
  if (r.shot) {
    shotPath = id + '.jpg';
    const up = await fetch(`${URL_}/storage/v1/object/reports/${shotPath}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: r.shot });
    if (!up.ok) shotPath = null;
  }
  const row = { id, product: r.product, url: r.url, host: r.host, note: r.note, version: r.version, browser: r.browser, settings: r.settings, shot_path: shotPath, ip_hash: ipHash };
  const ins = await fetch(`${URL_}/rest/v1/page_reports`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
  if (!ins.ok) return json({ ok: false, error: 'Could not save the report. Try again in a minute.' }, 500);

  // keep reports 180 days at most (cheap: runs with each report)
  const old = new Date(Date.now() - 180 * 864e5).toISOString();
  fetch(`${URL_}/rest/v1/page_reports?created_at=lt.${old}`, { method: 'DELETE', headers: H }).catch(() => {});

  // also a farm ticket, so the fix can start right away
  const gh = Deno.env.get('GITHUB_TICKETS_TOKEN');
  if (gh) {
    const put = (path: string, content: string, message: string) => fetch(`https://api.github.com/repos/jstetson-bit/pls-tickets/contents/tickets/${id}/${path}`, {
      method: 'PUT', headers: { Authorization: 'Bearer ' + gh, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ message, content }) });
    const t = { id, product: r.product, productName: 'Pulse Dark', version: r.version, platform: 'chrome', source: 'report-this-page',
      when: new Date().toISOString(), title: `${r.host}: ${(r.note.split('\n')[0] || 'page does not look right').slice(0, 100)}`,
      text: `Page: ${r.url}\n\n${r.note}\n\nSettings: ${JSON.stringify(r.settings)}\nBrowser: ${r.browser}`,
      hasLog: false, hasShot: !!r.shot, shot: r.shot ? 'screenshot.jpg' : undefined, device: r.browser, status: 'new' };
    try {
      if (r.shot) await put('screenshot.jpg', b64(r.shot), id + ' screenshot');
      await put('ticket.json', btoa(unescape(encodeURIComponent(JSON.stringify(t, null, 2)))), `${id}: Pulse Dark v${r.version} - ${t.title}`);
    } catch (_) { /* the report is saved either way */ }
  }
  return json({ ok: true, id });
});
