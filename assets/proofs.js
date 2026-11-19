/* Pulse Labs product page: Overview · What it does · Proofs · Demo.
   Every product page loads its own proofs.json (same folder) and calls PLSProofs.render().
   proofs.json = {
     name, systems:[...], tagline, overview,
     capabilities: [ { id, title, text, proofs: [ { file, kind: "image"|"video", caption, version, captured } ] } ],
     demo: { file, caption, version, captured } | null,
     note: "optional line under the proofs"
   }
   A capability with no proofs shows "Proof coming" so the gaps are visible, never hidden. */
(function () {
  var css = '' +
    '.pf-sec{margin-top:28px}.pf-sec>h2{border-bottom:2px solid #e63329;padding-bottom:6px}' +
    '.pf-toc{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}' +
    '.pf-toc a{border:1.5px solid #e63329;border-radius:999px;padding:4px 12px;text-decoration:none;color:inherit;font-size:14px}' +
    '.pf-cap{display:grid;grid-template-columns:1fr;gap:6px;padding:14px 0;border-bottom:1px solid var(--line,#333)}' +
    '.pf-cap h3{margin:0;font-size:18px}.pf-cap p{margin:0}' +
    '.pf-pics{display:flex;gap:10px;overflow-x:auto;padding:6px 0}' +
    '.pf-pic{flex:0 0 auto;width:200px}.pf-pic img,.pf-pic video{width:200px;border-radius:10px;border:1px solid var(--line,#333);background:#000;cursor:zoom-in}' +
    '.pf-pic .cap{font-size:13px;margin-top:4px}.pf-pic .stamp{font-size:11px;opacity:.7}' +
    '.pf-none{font-size:13px;border:1px dashed #e6332999;border-radius:8px;padding:8px 10px;display:inline-block}' +
    '.pf-count{font-size:14px;opacity:.85}' +
    '.pf-demo video{width:100%;max-width:420px;border-radius:12px;border:1px solid var(--line,#333);background:#000}' +
    '#pfZoom{position:fixed;inset:0;background:#000d;display:none;align-items:center;justify-content:center;z-index:50}' +
    '#pfZoom img,#pfZoom video{max-width:94vw;max-height:88vh;border-radius:10px}' +
    '#pfZoom .x{position:absolute;top:12px;right:16px;font-size:28px;color:#fff;background:none;border:0;cursor:pointer}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stamp(p) { return (p.version ? 'v' + esc(p.version) : '') + (p.captured ? ' · captured ' + esc(p.captured) : ''); }
  function media(p) {
    return p.kind === 'video'
      ? '<video src="' + esc(p.file) + '" muted loop playsinline preload="metadata" onmouseover="this.play()" onmouseout="this.pause()"></video>'
      : '<img src="' + esc(p.file) + '" alt="' + esc(p.caption) + '" loading="lazy">';
  }
  function render(data) {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var root = document.getElementById('pf');
    var caps = data.capabilities || [];
    var proven = caps.filter(function (c) { return (c.proofs || []).length; }).length;
    var h = '';
    h += '<section class="pf-sec" id="overview"><h2>Overview</h2><p>' + esc(data.overview) + '</p>' +
      '<div class="pf-toc"><a href="#does">What it does</a><a href="#proofs">Proofs</a><a href="#demo">Demo</a></div></section>';
    h += '<section class="pf-sec" id="does"><h2>What it does</h2><ul>' + caps.map(function (c) {
      return '<li><a href="#cap-' + esc(c.id) + '"><b>' + esc(c.title) + '</b></a> — ' + esc(c.text) + '</li>'; }).join('') + '</ul></section>';
    h += '<section class="pf-sec" id="proofs"><h2>Proofs</h2><p class="pf-count">Real screens from the app on our test bench, never mock-ups. ' +
      proven + ' of ' + caps.length + ' capabilities shown so far.' + (data.note ? ' ' + esc(data.note) : '') + '</p>' +
      caps.map(function (c) {
        var ps = c.proofs || [];
        return '<div class="pf-cap" id="cap-' + esc(c.id) + '"><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>' +
          (ps.length ? '<div class="pf-pics">' + ps.map(function (p) {
            return '<div class="pf-pic">' + media(p) + '<div class="cap">' + esc(p.caption) + '</div><div class="stamp">' + stamp(p) + '</div></div>'; }).join('') + '</div>'
            : '<span class="pf-none">Proof coming: the next bench run captures this.</span>') + '</div>';
      }).join('') + '</section>';
    var d = data.demo;
    h += '<section class="pf-sec pf-demo" id="demo"><h2>Demo</h2>' + (d
      ? '<video src="' + esc(d.file) + '" controls muted loop playsinline preload="metadata"></video><p>' + esc(d.caption) + '<br><span class="pf-count">' + stamp(d) + '</span></p>'
      : '<span class="pf-none">Demo recording coming.</span>') + '</section>';
    root.innerHTML = h;
    var z = document.createElement('div'); z.id = 'pfZoom'; z.innerHTML = '<button class="x" aria-label="Close">✕</button><div class="in"></div>'; document.body.appendChild(z);
    root.addEventListener('click', function (e) {
      var m = e.target.closest('.pf-pic img, .pf-pic video'); if (!m) return;
      z.querySelector('.in').innerHTML = m.tagName === 'VIDEO' ? '<video src="' + m.getAttribute('src') + '" controls autoplay muted loop playsinline></video>' : '<img src="' + m.getAttribute('src') + '">';
      z.style.display = 'flex';
    });
    z.addEventListener('click', function (e) { if (e.target === z || e.target.classList.contains('x')) { z.style.display = 'none'; z.querySelector('.in').innerHTML = ''; } });
  }
  window.PLSProofs = { render: function () {
    fetch('proofs.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(render).catch(function () {
      document.getElementById('pf').innerHTML = '<p class="soon">Proofs could not load right now.</p>'; });
  } };
})();
