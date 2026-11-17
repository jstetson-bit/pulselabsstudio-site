/* EOD data layer. Two interchangeable backends with the same API:
 *  - Supabase (live site): accounts, maps, votes, versions, forums, reports
 *  - Local test mode: the same features stored in this browser only
 * Every function returns a Promise. Errors reject with Error(message). */
(function () {
  'use strict';
  const C = window.EOD_CONFIG || {};
  const live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const listeners = new Set();
  const emit = u => listeners.forEach(f => { try { f(u); } catch (e) { } });

  // map preview: a small list of line segments for thumbnails
  function preview(map) {
    const out = []; if (!map || !map.l) return out;
    const step = Math.max(1, Math.ceil(map.l.length / 1500));
    for (let i = 0; i < map.l.length; i += step) { const L = map.l[i], a = map.v[L.v1], b = map.v[L.v2]; if (a && b) out.push([a.x, a.y, b.x, b.y, L.s2 >= 0 ? 1 : 0]); }
    return out;
  }
  const clean = s => String(s == null ? '' : s).trim();
  function checkText(s, min, max, what) { s = clean(s); if (s.length < min) throw new Error(what + ' is too short'); if (s.length > max) throw new Error(what + ' is too long (max ' + max + ')'); return s; }

  /* ================= LOCAL TEST MODE ================= */
  const LKEY = 'eod.db';
  const ldb = () => { let d; try { d = JSON.parse(localStorage.getItem(LKEY)); } catch (e) { } if (!d) d = { users: [], session: null, maps: [], threads: [], posts: [], reports: [], cats: null }; if (!d.cats) d.cats = DEFAULT_CATS.map((c, i) => Object.assign({ id: i + 1 }, c)); return d; };
  const lsave = d => { try { localStorage.setItem(LKEY, JSON.stringify(d)); } catch (e) { throw new Error('This device is out of storage space'); } };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));
  async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const DEFAULT_CATS = [
    { slug: 'announcements', name: 'Announcements', description: 'News and updates about EOD.', sort: 1, admin_only: true },
    { slug: 'show-off', name: 'Show Off Your Maps', description: 'Post your maps, get feedback.', sort: 2 },
    { slug: 'mapping-help', name: 'Mapping Help', description: 'Questions about building maps.', sort: 3 },
    { slug: 'bugs', name: 'Bugs & Feedback', description: 'Something broken? Tell us.', sort: 4 },
    { slug: 'general', name: 'General', description: 'Anything Doom.', sort: 5 }
  ];
  const lUser = d => d.users.find(u => u.id === d.session) || null;
  const pub = u => u && { id: u.id, username: u.username, role: u.role, bio: u.bio || '', created_at: u.created_at, bindings: u.bindings || null };
  const lname = (d, id) => { const u = d.users.find(x => x.id === id); return u ? u.username : 'deleted'; };
  function lMapOut(d, m, withData) {
    const me = d.session; const votes = m.votes || {};
    const o = { id: m.id, owner: m.owner, author: lname(d, m.owner), title: m.title, description: m.description, published: m.published, allow_remix: m.allow_remix !== false, allow_download: m.allow_download !== false, plays: m.plays || 0, score: Object.values(votes).reduce((a, b) => a + b, 0), my_vote: me ? (votes[me] || 0) : 0, remix_of: m.remix_of || null, created_at: m.created_at, updated_at: m.updated_at, preview: m.preview };
    if (m.remix_of) { const src = d.maps.find(x => x.id === m.remix_of); o.remix_title = src ? src.title : null; o.remix_author = src ? lname(d, src.owner) : null; }
    if (withData) o.data = m.data;
    return o;
  }
  const rateCheck = (list, me, n, ms) => { const now = Date.now(); if (list.filter(x => x.owner === me && now - Date.parse(x.created_at) < ms).length >= n) throw new Error('Slow down — try again in a minute'); };
  const L = {
    mode: 'local',
    async user() { return pub(lUser(ldb())); },
    async signUp(email, password, username) {
      const d = ldb(); email = clean(email).toLowerCase(); username = checkText(username, 3, 24, 'Username');
      if (!/^[A-Za-z0-9_\-]+$/.test(username)) throw new Error('Username: letters, numbers, - and _ only');
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a real email address');
      if (String(password).length < 8) throw new Error('Password needs at least 8 characters');
      if (d.users.some(u => u.email === email)) throw new Error('That email already has an account');
      if (d.users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error('That username is taken');
      const u = { id: uid(), email, username, pw: await sha(email + ':' + password), role: d.users.length ? 'member' : 'admin', created_at: new Date().toISOString() };
      d.users.push(u); d.session = u.id; lsave(d); emit(pub(u)); return pub(u);
    },
    async signIn(email, password) {
      const d = ldb(); email = clean(email).toLowerCase(); const u = d.users.find(x => x.email === email);
      if (!u || u.pw !== await sha(email + ':' + password)) throw new Error('Wrong email or password');
      d.session = u.id; lsave(d); emit(pub(u)); return pub(u);
    },
    async signOut() { const d = ldb(); d.session = null; lsave(d); emit(null); },
    async resetPassword() { throw new Error('Password reset needs the live site (Supabase). In local test mode, just make a new account.'); },
    async updateProfile(p) { const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in first'); if (p.username != null) { const n = checkText(p.username, 3, 24, 'Username'); if (d.users.some(x => x !== u && x.username.toLowerCase() === n.toLowerCase())) throw new Error('That username is taken'); u.username = n; } if (p.bio != null) u.bio = checkText(p.bio, 0, 500, 'Bio'); if (p.bindings !== undefined) u.bindings = p.bindings; lsave(d); emit(pub(u)); return pub(u); },
    async getProfile(id) { const d = ldb(); return pub(d.users.find(u => u.id === id)); },
    async listMaps({ sort = 'new', q = '', owner = null, limit = 24, offset = 0 } = {}) {
      const d = ldb(); let list = d.maps.filter(m => owner ? m.owner === owner && (m.published || m.owner === d.session) : m.published);
      if (q) { const qq = q.toLowerCase(); list = list.filter(m => (m.title + ' ' + m.description + ' ' + lname(d, m.owner)).toLowerCase().includes(qq)); }
      const out = list.map(m => lMapOut(d, m));
      out.sort(sort === 'top' ? (a, b) => b.score - a.score || b.plays - a.plays : sort === 'plays' ? (a, b) => b.plays - a.plays : (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
      return out.slice(offset, offset + limit);
    },
    async getMap(id) { const d = ldb(); const m = d.maps.find(x => x.id === id); const u = lUser(d); if (!m || (!m.published && m.owner !== d.session && !(u && u.role === 'admin'))) throw new Error('Map not found'); return lMapOut(d, m, true); },
    async saveMap({ id, title, description, data, published, remix_of, allow_remix = true, allow_download = true }) {
      const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in first');
      title = checkText(title, 2, 80, 'Title'); description = checkText(description, 0, 2000, 'Description');
      const now = new Date().toISOString();
      if (id) { const m = d.maps.find(x => x.id === id); if (!m) throw new Error('Map not found'); if (m.owner !== u.id && u.role !== 'admin') throw new Error('That map belongs to someone else. Use Remix.'); m.versions = m.versions || []; m.versions.unshift({ id: uid(), created_at: m.updated_at, data: m.data }); m.versions = m.versions.slice(0, 20); Object.assign(m, { title, description, data, published: !!published, allow_remix: !!allow_remix, allow_download: !!allow_download, updated_at: now, preview: preview(data) }); lsave(d); return lMapOut(d, m); }
      rateCheck(d.maps, u.id, 5, 60000);
      const m = { id: uid(), owner: u.id, title, description, data, published: !!published, allow_remix: !!allow_remix, allow_download: !!allow_download, remix_of: remix_of || null, plays: 0, votes: {}, created_at: now, updated_at: now, preview: preview(data), versions: [] };
      d.maps.push(m); lsave(d); return lMapOut(d, m);
    },
    async deleteMap(id) { const d = ldb(); const u = lUser(d); const m = d.maps.find(x => x.id === id); if (!m) return; if (!u || (m.owner !== u.id && u.role !== 'admin')) throw new Error('Not allowed'); d.maps = d.maps.filter(x => x !== m); lsave(d); },
    async versions(id) { const d = ldb(); const m = d.maps.find(x => x.id === id); if (!m || m.owner !== d.session) return []; return (m.versions || []).map(v => ({ id: v.id, created_at: v.created_at })); },
    async restoreVersion(mapId, vid) { const d = ldb(); const m = d.maps.find(x => x.id === mapId); if (!m || m.owner !== d.session) throw new Error('Not allowed'); const v = (m.versions || []).find(x => x.id === vid); if (!v) throw new Error('Version not found'); m.versions.unshift({ id: uid(), created_at: m.updated_at, data: m.data }); m.data = v.data; m.preview = preview(v.data); m.updated_at = new Date().toISOString(); lsave(d); },
    async vote(id, value) { const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in to vote'); const m = d.maps.find(x => x.id === id); if (!m) throw new Error('Map not found'); m.votes = m.votes || {}; if (!value) delete m.votes[u.id]; else m.votes[u.id] = value > 0 ? 1 : -1; lsave(d); return lMapOut(d, m); },
    async addPlay(id) { const d = ldb(); const m = d.maps.find(x => x.id === id); if (m) { m.plays = (m.plays || 0) + 1; lsave(d); } },
    async categories() { const d = ldb(); return d.cats.slice().sort((a, b) => a.sort - b.sort).map(c => Object.assign({}, c, { threads: d.threads.filter(t => t.category === c.id).length })); },
    async threads(catId, { limit = 50, offset = 0 } = {}) { const d = ldb(); return d.threads.filter(t => t.category === catId).sort((a, b) => (b.pinned - a.pinned) || Date.parse(b.last_post_at) - Date.parse(a.last_post_at)).slice(offset, offset + limit).map(t => Object.assign({}, t, { author: lname(d, t.owner), replies: d.posts.filter(p => p.thread === t.id).length - 1 })); },
    async thread(id) { const d = ldb(); const t = d.threads.find(x => x.id === id); if (!t) throw new Error('Thread not found'); return Object.assign({}, t, { author: lname(d, t.owner), category_name: (d.cats.find(c => c.id === t.category) || {}).name }); },
    async posts(threadId) { const d = ldb(); return d.posts.filter(p => p.thread === threadId).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).map(p => Object.assign({}, p, { author: lname(d, p.owner) })); },
    async newThread(catId, title, body) {
      const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in to post'); const cat = d.cats.find(c => c.id === catId); if (cat && cat.admin_only && u.role !== 'admin') throw new Error('Only admins post here');
      title = checkText(title, 3, 120, 'Title'); body = checkText(body, 2, 10000, 'Post'); rateCheck(d.posts, u.id, 5, 60000);
      const now = new Date().toISOString(), t = { id: uid(), category: catId, owner: u.id, title, created_at: now, last_post_at: now, pinned: false, locked: false };
      d.threads.push(t); d.posts.push({ id: uid(), thread: t.id, owner: u.id, body, created_at: now }); lsave(d); return t;
    },
    async reply(threadId, body) {
      const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in to reply'); const t = d.threads.find(x => x.id === threadId); if (!t) throw new Error('Thread not found'); if (t.locked && u.role !== 'admin') throw new Error('This thread is locked');
      body = checkText(body, 2, 10000, 'Reply'); rateCheck(d.posts, u.id, 5, 60000);
      const now = new Date().toISOString(); d.posts.push({ id: uid(), thread: threadId, owner: u.id, body, created_at: now }); t.last_post_at = now; lsave(d);
    },
    async editPost(id, body) { const d = ldb(); const u = lUser(d); const p = d.posts.find(x => x.id === id); if (!p || !u || (p.owner !== u.id && u.role !== 'admin')) throw new Error('Not allowed'); p.body = checkText(body, 2, 10000, 'Post'); p.edited_at = new Date().toISOString(); lsave(d); },
    async deletePost(id) { const d = ldb(); const u = lUser(d); const p = d.posts.find(x => x.id === id); if (!p || !u || (p.owner !== u.id && u.role !== 'admin')) throw new Error('Not allowed'); d.posts = d.posts.filter(x => x !== p); if (!d.posts.some(x => x.thread === p.thread)) d.threads = d.threads.filter(t => t.id !== p.thread); lsave(d); },
    async modThread(id, patch) { const d = ldb(); const u = lUser(d); if (!u || u.role !== 'admin') throw new Error('Admins only'); const t = d.threads.find(x => x.id === id); if (!t) return; ['pinned', 'locked'].forEach(k => { if (k in patch) t[k] = !!patch[k]; }); if (patch.delete) { d.threads = d.threads.filter(x => x !== t); d.posts = d.posts.filter(p => p.thread !== id); } lsave(d); },
    async report(kind, target, reason) { const d = ldb(); const u = lUser(d); if (!u) throw new Error('Sign in to report'); d.reports.push({ id: uid(), kind, target, reporter: u.id, reason: checkText(reason, 3, 500, 'Reason'), created_at: new Date().toISOString() }); lsave(d); },
    async reports() { const d = ldb(); const u = lUser(d); if (!u || u.role !== 'admin') throw new Error('Admins only'); return d.reports.slice().reverse().map(r => Object.assign({}, r, { reporter_name: lname(d, r.reporter) })); },
    async resolveReport(id) { const d = ldb(); d.reports = d.reports.filter(r => r.id !== id); lsave(d); }
  };

  /* ================= SUPABASE (live) ================= */
  let sb = null, cur = null;
  const ok = r => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };
  async function me() { if (cur !== null) return cur; const s = ok(await sb.auth.getSession()); if (!s.session) return cur = null; const p = ok(await sb.from('profiles').select('*').eq('id', s.session.user.id).maybeSingle()); return cur = p; }
  const MAPCOLS = 'id,owner,title,description,published,allow_remix,allow_download,plays,score,remix_of,created_at,updated_at,preview,author:profiles!maps_owner_fkey(username),src:maps!maps_remix_of_fkey(title,author:profiles!maps_owner_fkey(username))';
  async function mapOut(rows) {
    const u = await me(); let votes = {};
    if (u && rows.length) { const v = ok(await sb.from('votes').select('map_id,value').eq('user_id', u.id).in('map_id', rows.map(r => r.id))); v.forEach(x => votes[x.map_id] = x.value); }
    return rows.map(r => Object.assign({}, r, { author: r.author ? r.author.username : 'deleted', remix_title: r.src ? r.src.title : null, remix_author: r.src && r.src.author ? r.src.author.username : null, my_vote: votes[r.id] || 0 }));
  }
  const S = {
    mode: 'live',
    async user() { return me(); },
    async signUp(email, password, username) {
      username = checkText(username, 3, 24, 'Username'); if (!/^[A-Za-z0-9_\-]+$/.test(username)) throw new Error('Username: letters, numbers, - and _ only');
      const taken = ok(await sb.from('profiles').select('id').ilike('username', username).maybeSingle()); if (taken) throw new Error('That username is taken');
      const r = ok(await sb.auth.signUp({ email: clean(email), password, options: { data: { username }, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'account.html' } }));
      cur = null; if (!r.session) return { pending: true };
      return me();
    },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email: clean(email), password })); cur = null; return me(); },
    async signOut() { await sb.auth.signOut(); cur = null; },
    async resetPassword(email) { ok(await sb.auth.resetPasswordForEmail(clean(email), { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'account.html' })); },
    async updateProfile(p) { const u = await me(); if (!u) throw new Error('Sign in first'); const patch = {}; if (p.username != null) patch.username = checkText(p.username, 3, 24, 'Username'); if (p.bio != null) patch.bio = checkText(p.bio, 0, 500, 'Bio'); if (p.bindings !== undefined) patch.bindings = p.bindings; ok(await sb.from('profiles').update(patch).eq('id', u.id)); cur = null; const n = await me(); emit(n); return n; },
    async getProfile(id) { return ok(await sb.from('profiles').select('id,username,role,bio,created_at').eq('id', id).maybeSingle()); },
    async listMaps({ sort = 'new', q = '', owner = null, limit = 24, offset = 0 } = {}) {
      let qy = sb.from('maps').select(MAPCOLS);
      if (owner) qy = qy.eq('owner', owner); else qy = qy.eq('published', true);
      if (q) qy = qy.or('title.ilike.%' + q.replace(/[%,()]/g, ' ') + '%,description.ilike.%' + q.replace(/[%,()]/g, ' ') + '%');
      qy = sort === 'top' ? qy.order('score', { ascending: false }) : sort === 'plays' ? qy.order('plays', { ascending: false }) : qy.order('updated_at', { ascending: false });
      return mapOut(ok(await qy.range(offset, offset + limit - 1)));
    },
    async getMap(id) { const r = ok(await sb.from('maps').select(MAPCOLS + ',data').eq('id', id).maybeSingle()); if (!r) throw new Error('Map not found'); return (await mapOut([r]))[0]; },
    async saveMap({ id, title, description, data, published, remix_of, allow_remix = true, allow_download = true }) {
      const u = await me(); if (!u) throw new Error('Sign in first');
      const row = { title: checkText(title, 2, 80, 'Title'), description: checkText(description, 0, 2000, 'Description'), data, published: !!published, allow_remix: !!allow_remix, allow_download: !!allow_download, preview: preview(data) };
      if (id) return ok(await sb.from('maps').update(row).eq('id', id).select('id').single());
      return ok(await sb.from('maps').insert(Object.assign(row, { owner: u.id, remix_of: remix_of || null })).select('id').single());
    },
    async deleteMap(id) { ok(await sb.from('maps').delete().eq('id', id)); },
    async versions(id) { return ok(await sb.from('map_versions').select('id,created_at').eq('map_id', id).order('created_at', { ascending: false }).limit(20)); },
    async restoreVersion(mapId, vid) { const v = ok(await sb.from('map_versions').select('data').eq('id', vid).single()); ok(await sb.from('maps').update({ data: v.data, preview: preview(v.data) }).eq('id', mapId)); },
    async vote(id, value) { const u = await me(); if (!u) throw new Error('Sign in to vote'); if (!value) ok(await sb.from('votes').delete().eq('map_id', id).eq('user_id', u.id)); else ok(await sb.from('votes').upsert({ map_id: id, user_id: u.id, value: value > 0 ? 1 : -1 })); return this.getMapMeta(id); },
    async getMapMeta(id) { const r = ok(await sb.from('maps').select(MAPCOLS).eq('id', id).single()); return (await mapOut([r]))[0]; },
    async addPlay(id) { try { await sb.rpc('add_play', { map: id }); } catch (e) { } },
    async categories() { return ok(await sb.from('forum_categories').select('*,threads:threads(count)').order('sort')).map(c => Object.assign({}, c, { threads: c.threads && c.threads[0] ? c.threads[0].count : 0 })); },
    async threads(catId, { limit = 50, offset = 0 } = {}) { return ok(await sb.from('threads').select('*,author:profiles(username),posts(count)').eq('category', catId).order('pinned', { ascending: false }).order('last_post_at', { ascending: false }).range(offset, offset + limit - 1)).map(t => Object.assign({}, t, { author: t.author ? t.author.username : 'deleted', replies: (t.posts && t.posts[0] ? t.posts[0].count : 1) - 1 })); },
    async thread(id) { const t = ok(await sb.from('threads').select('*,author:profiles(username),cat:forum_categories(name)').eq('id', id).maybeSingle()); if (!t) throw new Error('Thread not found'); return Object.assign({}, t, { author: t.author ? t.author.username : 'deleted', category_name: t.cat ? t.cat.name : '' }); },
    async posts(threadId) { return ok(await sb.from('posts').select('*,author:profiles(username)').eq('thread', threadId).order('created_at')).map(p => Object.assign({}, p, { author: p.author ? p.author.username : 'deleted' })); },
    async newThread(catId, title, body) { const u = await me(); if (!u) throw new Error('Sign in to post'); const t = ok(await sb.from('threads').insert({ category: catId, owner: u.id, title: checkText(title, 3, 120, 'Title') }).select().single()); ok(await sb.from('posts').insert({ thread: t.id, owner: u.id, body: checkText(body, 2, 10000, 'Post') })); return t; },
    async reply(threadId, body) { const u = await me(); if (!u) throw new Error('Sign in to reply'); ok(await sb.from('posts').insert({ thread: threadId, owner: u.id, body: checkText(body, 2, 10000, 'Reply') })); },
    async editPost(id, body) { ok(await sb.from('posts').update({ body: checkText(body, 2, 10000, 'Post'), edited_at: new Date().toISOString() }).eq('id', id)); },
    async deletePost(id) { ok(await sb.from('posts').delete().eq('id', id)); },
    async modThread(id, patch) { if (patch.delete) { ok(await sb.from('threads').delete().eq('id', id)); return; } const p = {}; ['pinned', 'locked'].forEach(k => { if (k in patch) p[k] = !!patch[k]; }); ok(await sb.from('threads').update(p).eq('id', id)); },
    async report(kind, target, reason) { const u = await me(); if (!u) throw new Error('Sign in to report'); ok(await sb.from('reports').insert({ kind, target, reporter: u.id, reason: checkText(reason, 3, 500, 'Reason') })); },
    async reports() { return ok(await sb.from('reports').select('*,reporter_p:profiles(username)').order('created_at', { ascending: false })).map(r => Object.assign({}, r, { reporter_name: r.reporter_p ? r.reporter_p.username : '?' })); },
    async resolveReport(id) { ok(await sb.from('reports').delete().eq('id', id)); }
  };

  let api = L;
  if (live) {
    try {
      sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
      sb.auth.onAuthStateChange(() => { cur = null; me().then(emit, () => emit(null)); });
      api = S;
    } catch (e) { console.error('Supabase failed, using local mode', e); }
  }
  api.onAuth = f => { listeners.add(f); return () => listeners.delete(f); };
  api.preview = preview;
  window.EODB = api;
})();
