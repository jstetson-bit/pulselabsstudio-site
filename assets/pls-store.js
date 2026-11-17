// pls-store.js — the whole store client, no libraries (house rule: as light as possible).
// Talks to Supabase (accounts, verification email, cart, orders, keys) and opens Paddle's checkout (payments, PayPal,
// tax, saved payment details all live with Paddle; card numbers never touch our pages or our database).
(function () {
  'use strict';
  var C = window.PLS_STORE || {};
  var S = window.PLS = {};
  S.ready = !!(C.supabaseUrl && C.supabaseAnonKey);
  var LS = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
             set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
             del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };

  // ---------- small helpers ----------
  S.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  S.money = function (cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); };
  S.toast = function (t, bad) { var d = document.createElement('div'); d.className = 'toast'; if (bad) d.style.background = 'var(--red)'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2800); };
  var SYS = { android: 'Android', windows: 'Windows PC', chrome: 'Chrome / Edge' };
  S.sys = function (list) { return (list || []).map(function (s) { return '<span class="badge">' + (SYS[s] || S.esc(s)) + '</span>'; }).join(''); };

  // ---------- Supabase plumbing ----------
  function call(path, opts) {
    opts = opts || {};
    var h = { apikey: C.supabaseAnonKey, 'Content-Type': 'application/json' };
    var s = S.session();
    if (opts.auth !== false && s) h.Authorization = 'Bearer ' + s.access_token;
    if (opts.prefer) h.Prefer = opts.prefer;
    return fetch(C.supabaseUrl + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
          if (!r.ok) { var m = (j && (j.msg || j.error_description || j.message || j.error)) || ('error ' + r.status); var err = new Error(m); err.status = r.status; throw err; }
          return j;
        });
      });
  }
  S.session = function () { return LS.get('pls.session'); };
  function keep(s) { if (s && s.access_token) { s.expires_at = s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600); LS.set('pls.session', s); } return s; }
  S.user = function () { var s = S.session(); return s && s.user; };
  S.verified = function () { var u = S.user(); return !!(u && (u.email_confirmed_at || u.confirmed_at)); };
  S.back = function () { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'account.html'; };

  // keep the sign-in fresh (Supabase sessions last an hour; the refresh token renews them)
  S.refresh = function () {
    var s = S.session(); if (!s || !S.ready) return Promise.resolve(null);
    if (s.expires_at - 60 > Date.now() / 1000) return Promise.resolve(s);
    return call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: s.refresh_token } })
      .then(keep).catch(function () { LS.del('pls.session'); return null; });
  };
  S.signUp = function (email, password, name) {
    return call('/auth/v1/signup?redirect_to=' + encodeURIComponent(S.back()), { method: 'POST', auth: false, body: { email: email, password: password, data: { display_name: name } } });
  };
  S.signIn = function (email, password) {
    return call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email, password: password } })
      .then(keep).then(function (s) { return S.mergeCart().then(function () { return s; }); });
  };
  S.resend = function (email) { return call('/auth/v1/resend', { method: 'POST', auth: false, body: { type: 'signup', email: email } }); };
  S.forgot = function (email) { return call('/auth/v1/recover?redirect_to=' + encodeURIComponent(S.back()), { method: 'POST', auth: false, body: { email: email } }); };
  S.newPassword = function (pw) { return call('/auth/v1/user', { method: 'PUT', body: { password: pw } }); };
  S.signOut = function () { var p = S.session() ? call('/auth/v1/logout', { method: 'POST' }).catch(function () {}) : Promise.resolve(); LS.del('pls.session'); return p; };
  // the verification / reset email brings people back with the session in the address (#access_token=...&type=signup)
  S.fromEmailLink = function () {
    if (location.hash.indexOf('access_token=') < 0) return Promise.resolve(null);
    var q = {}; location.hash.slice(1).split('&').forEach(function (kv) { var i = kv.indexOf('='); q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
    history.replaceState(null, '', location.pathname);
    var s = { access_token: q.access_token, refresh_token: q.refresh_token, expires_in: +q.expires_in || 3600 };
    LS.set('pls.session', s);
    return call('/auth/v1/user').then(function (u) { s.user = u; keep(s); return S.mergeCart().then(function () { return q.type || 'signup'; }); });
  };

  // ---------- catalog, cart, orders, keys ----------
  S.catalog = function () { return S.ready ? call('/rest/v1/products?select=*&order=sort.asc', { auth: false }) : Promise.resolve([]); };
  // the cart lives in this browser until you sign in, then in your account (so it follows you between phone and PC)
  S.localCart = function () { return LS.get('pls.cart') || {}; };
  function setLocal(c) { LS.set('pls.cart', c); badge(); }
  S.cart = function () {
    if (!S.user() || !S.verified()) return Promise.resolve(S.localCart());
    return call('/rest/v1/cart_items?select=product_id,quantity').then(function (rows) { var c = {}; (rows || []).forEach(function (r) { c[r.product_id] = r.quantity; }); setLocal(c); return c; });
  };
  S.add = function (pid) {
    var c = S.localCart(); c[pid] = Math.min(10, (c[pid] || 0) + 1); setLocal(c);
    if (S.user() && S.verified()) return call('/rest/v1/cart_items', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: S.user().id, product_id: pid, quantity: c[pid] } }).catch(function () {});
    return Promise.resolve();
  };
  S.remove = function (pid) {
    var c = S.localCart(); delete c[pid]; setLocal(c);
    if (S.user() && S.verified()) return call('/rest/v1/cart_items?product_id=eq.' + encodeURIComponent(pid), { method: 'DELETE' }).catch(function () {});
    return Promise.resolve();
  };
  S.mergeCart = function () {
    var c = S.localCart(), ids = Object.keys(c);
    if (!ids.length || !S.verified()) return Promise.resolve();
    return call('/rest/v1/cart_items', { method: 'POST', prefer: 'resolution=merge-duplicates', body: ids.map(function (id) { return { user_id: S.user().id, product_id: id, quantity: c[id] }; }) }).catch(function () {});
  };
  S.clearCart = function () { setLocal({}); return S.user() ? call('/rest/v1/cart_items?user_id=eq.' + S.user().id, { method: 'DELETE' }).catch(function () {}) : Promise.resolve(); };
  S.orders = function () { return call('/rest/v1/orders?select=*,order_items(*)&order=created_at.desc'); };
  S.keys = function () { return call('/rest/v1/licenses?select=*&order=issued_at.desc'); };
  S.profile = function () { return call('/rest/v1/profiles?select=*').then(function (r) { return (r || [])[0] || {}; }); };
  S.saveName = function (n) { return call('/rest/v1/profiles?id=eq.' + S.user().id, { method: 'PATCH', body: { display_name: n } }); };

  // ---------- checkout (Paddle) ----------
  // Paddle's script loads only when someone actually checks out, so browsing stays light.
  function paddle() {
    if (window.Paddle && window.Paddle.Checkout) return Promise.resolve(window.Paddle);
    return new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.onload = function () { try { if (C.paddleEnv === 'sandbox') window.Paddle.Environment.set('sandbox'); window.Paddle.Initialize({ token: C.paddleClientToken, eventCallback: function (e) { if (e && e.name === 'checkout.completed') S.onPaid && S.onPaid(e); } }); ok(window.Paddle); } catch (e) { bad(e); } };
      s.onerror = function () { bad(new Error('the payment window could not load')); };
      document.head.appendChild(s);
    });
  }
  S.checkout = function (lines) {
    if (!C.paddleClientToken) return Promise.reject(new Error('payments are not switched on yet'));
    if (!S.user()) return Promise.reject(new Error('signin'));
    if (!S.verified()) return Promise.reject(new Error('verify'));
    return paddle().then(function (P) {
      P.Checkout.open({
        items: lines.map(function (l) { return { priceId: l.priceId, quantity: l.quantity }; }),
        customer: { email: S.user().email },
        customData: { user_id: S.user().id },
        settings: { displayMode: 'overlay', theme: 'dark', successUrl: S.back() + '#paid' }
      });
    });
  };

  // ---------- header: cart count, account name, ghost manual, invert ----------
  function badge() {
    var n = 0, c = S.localCart(); for (var k in c) n += c[k];
    var b = document.getElementById('cartN'); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
  }
  S.header = function () {
    badge();
    var a = document.getElementById('acctLink'); var u = S.user();
    if (a) a.textContent = u ? 'Account' : 'Sign in';
    var man = document.getElementById('manual');
    var ib = document.getElementById('infoBtn'), ok = document.getElementById('manualOk'), inv = document.getElementById('invBtn');
    if (ib && man) ib.onclick = function () { man.classList.add('open'); };
    if (ok && man) ok.onclick = function () { man.classList.remove('open'); };
    function setInv(on) { document.documentElement.classList.toggle('inv', on); LS.set('pls.invert', on ? '1' : '0'); }
    setInv(LS.get('pls.invert') === '1');
    if (inv) inv.onclick = function () { setInv(!document.documentElement.classList.contains('inv')); };
  };
})();
