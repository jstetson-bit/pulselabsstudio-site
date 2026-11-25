// Checks a page report before anything is stored. Plain JS so Node tests can run it.
const MAX_NOTE = 2000, MAX_SHOT = 2_000_000;
export function reportId(d) {
  const p = (n) => String(n).padStart(2, '0');
  return 'R-' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '-' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + '-' + Math.random().toString(36).slice(2, 6);
}
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max); }
export function checkReport(b) {
  if (!b || typeof b !== 'object') return { ok: false, error: 'Bad report' };
  let u;
  try { u = new URL(String(b.url || '')); } catch { return { ok: false, error: 'Bad page address' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, error: 'Only web pages can be reported' };
  // never keep what's after # or passwords in the address; keep the query (it often decides the page)
  u.hash = ''; u.username = ''; u.password = '';
  let settings = {};
  if (b.settings && typeof b.settings === 'object') {
    const s = JSON.stringify(b.settings);
    if (s.length < 4000) settings = JSON.parse(s);
  }
  let shot = null;
  if (b.shot) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.shot));
    if (!m) return { ok: false, error: 'Bad screenshot' };
    const bin = atob(m[1]);
    if (bin.length > MAX_SHOT) return { ok: false, error: 'Screenshot too big' };
    shot = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) shot[i] = bin.charCodeAt(i);
    if (shot[0] !== 0xff || shot[1] !== 0xd8) return { ok: false, error: 'Bad screenshot' };
  }
  const product = /^[a-z0-9-]{2,40}$/.test(b.product || '') ? b.product : 'pulse-dark';
  return { ok: true, url: clean(u.href, 2000), host: u.hostname, note: clean(b.note, MAX_NOTE), version: clean(b.version, 20),
           browser: clean(b.browser, 200), settings, shot, product };
}
