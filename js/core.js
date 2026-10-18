/* =====================================================================
   TKA QUEST — core.js
   Lapisan inti: api() tahan jaringan HP, SWR + cache perangkat, router SPA,
   kotak keluar (outbox) untuk simpan saat offline, warmup server, login, UI dasar.
   ===================================================================== */
'use strict';
(function () {
  const CFG = window.TQ_CONFIG || {};
  const VER = CFG.VERSION || '1';
  const GAS_URL = CFG.GAS_URL || '';
  const LS = 'tq:v1:';

  // ------------------------------------------------------------------ util
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Teks soal: aman (di-escape) + **tebal**, _miring_, baris baru */
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?;:)]|$)/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
  const fmtN = (n) => Number(n || 0).toLocaleString('id-ID');
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmtTgl = (v) => { if (!v) return '–'; const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v); return isNaN(d) ? '–' : d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtJam = (v) => { const d = new Date(v); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'); };
  const relTime = (v) => {
    const t = new Date(v).getTime(); if (!t) return '–';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu';
    const h = Math.round(m / 60); if (h < 24) return h + ' jam lalu';
    const d = Math.round(h / 24); return d === 1 ? 'kemarin' : d + ' hari lalu';
  };
  const todayKey = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
  const debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms || 2000 }) : setTimeout(fn, ms || 800));

  // ------------------------------------------------------------------ state & storage
  const AppState = { token: '', role: '', uid: '', boot: null, page: '' };
  const Store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) {
      const s = JSON.stringify(v);
      try { localStorage.setItem(LS + k, s); }
      catch (e) {
        Object.keys(localStorage).filter((x) => x.indexOf(LS + 'u:') === 0 && x.indexOf(LS + userKey('')) !== 0).forEach((x) => localStorage.removeItem(x));
        try { localStorage.setItem(LS + k, s); } catch (e2) { /* tanpa cache */ }
      }
    },
    del(k) { try { localStorage.removeItem(LS + k); } catch (e) {} }
  };
  const userKey = (k) => 'u:' + (AppState.uid || 'anon') + ':' + k;
  const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };

  // ------------------------------------------------------------------ pengukur performa (Perf.table() di console)
  const Perf = {
    rows: [],
    add(action, total, server, cached) { this.rows.push({ action, total, server: server == null ? null : server, net: server == null ? null : total - server, cached: !!cached, at: new Date().toLocaleTimeString() }); if (this.rows.length > 200) this.rows.shift(); },
    table() { console.table(this.rows.slice(-30)); },
    summary() {
      const g = {};
      this.rows.forEach((r) => { (g[r.action] = g[r.action] || []).push(r.total); });
      console.table(Object.keys(g).map((a) => ({ aksi: a, kali: g[a].length, rata_ms: Math.round(g[a].reduce((x, y) => x + y, 0) / g[a].length) })));
    }
  };

  // ------------------------------------------------------------------ API (timeout, retry, reqId, dedupe)
  const READ = /^(ping|loginMurid|loginGuru|muridBoot|liga|misiMulai|guruBoot|dashboard|muridDetail|soalList|arsipList|laporanData|adminData|performa|batch|importScan)$/;
  const inflight = {};
  let writeEpoch = 0;
  async function apiOnce(action, data, timeout, reqId) {
    if (!GAS_URL || GAS_URL.indexOf('GANTI_') > -1) return { success: false, message: 'URL server belum diisi di js/config.js.', code: 'CONFIG' };
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: AppState.token || '', reqId: reqId || '', data: data || {} })
      });
      const text = await res.text();
      try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
      catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas tidak wajar (HTTP ' + res.status + '). Coba lagi.' }; }
    } catch (err) {
      return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi internet terputus.' };
    } finally { clearTimeout(timer); }
  }
  function waitOnline(ms) {
    return new Promise((r) => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); });
  }
  async function apiRun(action, data, opt, isRead) {
    const reqId = isRead ? '' : (opt.reqId || uuid());
    const tries = opt.tries || (isRead ? 3 : 2);
    let res;
    for (let i = 0; i < tries; i++) {
      if (i) { await new Promise((r) => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
      res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : (opt.timeout || 90000), reqId);
      if (res.success || !res.retryable && !res.network) break;
      if (res.code === 'BUSY') res.retryable = true;
    }
    if (!res.success && res.code === 'AUTH' && AppState.token && action !== 'logout') onSessionExpired();
    return res;
  }
  /** Panggilan API: baca identik yang sedang berjalan ditumpangi; tulis menaikkan epoch agar baca berikutnya segar */
  function api(action, data, opt) {
    opt = opt || {};
    const isRead = READ.test(action);
    if (!isRead) { writeEpoch++; return apiRun(action, data, opt, false); }
    const k = writeEpoch + '|' + action + '|' + AppState.token.slice(-12) + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = apiRun(action, data, opt, true);
    inflight[k] = p;
    p.then(() => delete inflight[k], () => delete inflight[k]);
    return p;
  }
  /** Penggabung otomatis: beberapa apiQ() dalam tik yang sama → 1 eksekusi 'batch' */
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise((res) => {
        if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
        this.q.push({ action, data: data || {}, res });
      });
    },
    async flush() {
      const q = this.q; this.q = null;
      if (q.length === 1) { q[0].res(await api(q[0].action, q[0].data)); return; }
      const calls = q.map((x, i) => ({ key: x.action + '#' + i, action: x.action, data: x.data }));
      const r = await api('batch', { calls });
      q.forEach((x, i) => x.res(r.success ? r.data[x.action + '#' + i] : r));
    }
  };
  const apiQ = (action, data) => Batcher.add(action, data);

  /** Stale-while-revalidate: tampilkan cache seketika, ambil server hanya bila basi; render ulang hanya bila data berubah */
  async function swr(key, action, data, render, opt) {
    opt = opt || {};
    const fresh = opt.fresh === undefined ? 60000 : opt.fresh;
    const c = Store.get(userKey(key), null);
    if (c) render(c.data, true);
    if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
    const res = await (opt.q ? apiQ(action, data) : api(action, data));
    if (res.success) {
      const h = hashStr(JSON.stringify(res.data));
      Store.set(userKey(key), { t: Date.now(), h, data: res.data });
      if (!c || c.h !== h) render(res.data, false);
    } else if (!c && opt.onError) opt.onError(res);
    return res;
  }
  const cacheSet = (key, data) => Store.set(userKey(key), { t: Date.now(), h: hashStr(JSON.stringify(data)), data });
  const cacheGet = (key) => (Store.get(userKey(key), null) || {}).data;
  const cacheStale = (key) => { const c = Store.get(userKey(key), null); if (c) { c.t = 0; Store.set(userKey(key), c); } };

  // ------------------------------------------------------------------ outbox: tulis penting yang tahan offline
  const Outbox = {
    busy: false,
    list() { return Store.get(userKey('outbox'), []); },
    save(l) { Store.set(userKey('outbox'), l); },
    add(action, data, meta) {
      const item = { id: uuid(), action, data, meta: meta || {}, t: Date.now() };
      const l = this.list(); l.push(item); this.save(l);
      setTimeout(() => this.flush(), 0);
      return item.id;
    },
    async flush() {
      if (this.busy || !AppState.token) return;
      this.busy = true;
      try {
        for (const item of this.list()) {
          const res = await api(item.action, item.data, { reqId: item.id });
          if (res.success || (!res.network && !res.retryable)) {
            this.save(this.list().filter((x) => x.id !== item.id));
            window.dispatchEvent(new CustomEvent('outbox:done', { detail: { item, res } }));
          } else { window.dispatchEvent(new CustomEvent('outbox:wait', { detail: { item, res } })); break; }
        }
      } finally { this.busy = false; }
    }
  };
  addEventListener('online', () => { toast('Kembali online.', 'success', 1800); Outbox.flush(); });
  addEventListener('offline', () => toast('Kamu sedang offline. Jawaban tetap tersimpan di perangkat.', 'warn', 3500));

  // ------------------------------------------------------------------ warmup server
  function warm(scope) {
    if (!GAS_URL || GAS_URL.indexOf('GANTI_') > -1) return;
    const k = 'warm_' + scope;
    try { if (Date.now() - Number(sessionStorage.getItem(k) || 0) < 240000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
    fetch(GAS_URL + '?w=' + scope + '&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  }
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 120000) {
      warm(AppState.role === 'murid' ? 'pub' : 'guru');
      const def = Pages[AppState.page];
      if (def && def.refresh) def.refresh();
      Outbox.flush();
    }
  });

  // ------------------------------------------------------------------ UI: toast, modal, konfirmasi, overlay
  function toast(msg, type, ms) {
    const root = $('#toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon({ success: 'check-circle', error: 'alert-circle', warn: 'alert-triangle' }[type] || 'info', 'ic-sm') + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms || 3200);
  }
  let modalStack = [];
  function modal(o) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap ' + (o.cls || '');
    wrap.innerHTML = '<div class="modal-backdrop"></div><div class="modal ' + (o.size ? 'modal-' + o.size : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '">' +
      (o.title ? '<div class="modal-head"><h3>' + esc(o.title) + '</h3><button class="icon-btn modal-x" aria-label="Tutup">' + icon('x') + '</button></div>' : '') +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      (o.actions && o.actions.length ? '<div class="modal-foot">' + o.actions.map((a, i) => '<button class="' + (a.cls || 'btn btn-ghost') + '" data-i="' + i + '">' + (a.icon ? icon(a.icon, 'ic-sm') : '') + esc(a.label) + '</button>').join('') + '</div>' : '') + '</div>';
    root.appendChild(wrap);
    document.body.classList.add('modal-open');
    const prevFocus = document.activeElement;
    const api2 = {
      el: wrap,
      close() {
        if (!wrap.isConnected) return;
        wrap.classList.remove('show');
        modalStack = modalStack.filter((x) => x !== api2);
        setTimeout(() => { wrap.remove(); if (!modalStack.length) document.body.classList.remove('modal-open'); if (prevFocus && prevFocus.focus) prevFocus.focus(); }, 180);
        if (o.onClose) o.onClose();
      }
    };
    modalStack.push(api2);
    const closeable = o.closeable !== false;
    if (closeable) { $('.modal-backdrop', wrap).onclick = api2.close; const x = $('.modal-x', wrap); if (x) x.onclick = api2.close; } else { const x = $('.modal-x', wrap); if (x) x.remove(); }
    $$('.modal-foot button', wrap).forEach((b) => {
      b.onclick = async () => {
        const a = o.actions[+b.dataset.i];
        if (a.onClick) { const r = await a.onClick(api2, b); if (r === false) return; }
        if (a.close !== false) api2.close();
      };
    });
    requestAnimationFrame(() => { wrap.classList.add('show'); const f = $('[autofocus], .modal-body input, .modal-foot .btn-primary, .modal-foot button', wrap); if (f) f.focus(); });
    if (o.onOpen) o.onOpen(wrap, api2);
    return api2;
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });
  function confirmDlg(title, msg, ok, danger) {
    return new Promise((res) => {
      let done = false;
      modal({ title, size: 'sm', body: '<p class="confirm-msg">' + esc(msg) + '</p>',
        onClose: () => { if (!done) res(false); },
        actions: [{ label: 'Batal', cls: 'btn btn-ghost' }, { label: ok || 'Ya, lanjutkan', cls: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onClick: () => { done = true; res(true); } }] });
    });
  }
  function busy(on, text) {
    let el = $('#busy-overlay');
    if (on) {
      if (!el) { el = document.createElement('div'); el.id = 'busy-overlay'; document.body.appendChild(el); }
      el.innerHTML = '<div class="busy-card"><div class="spinner"></div><div>' + esc(text || 'Memuat…') + '</div></div>';
      el.classList.add('show');
    } else if (el) el.classList.remove('show');
  }
  const errorBox = (msg, retryFn) => {
    const id = 'r' + Math.random().toString(36).slice(2, 7);
    setTimeout(() => { const b = document.getElementById(id); if (b) b.onclick = retryFn; }, 0);
    return '<div class="error-box">' + icon('cloud-off') + '<p>' + esc(msg || 'Gagal memuat data.') + '</p><button class="btn btn-primary" id="' + id + '">' + icon('refresh', 'ic-sm') + 'Coba lagi</button></div>';
  };

  // ------------------------------------------------------------------ pemuat aset lazy (bundel guru tidak dimuat di HP murid)
  const loaded = {};
  function loadAsset(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise((res, rej) => {
      const css = /\.css(\?|$)/.test(url);
      const el = document.createElement(css ? 'link' : 'script');
      if (css) { el.rel = 'stylesheet'; el.href = url; } else { el.src = url; el.defer = true; }
      el.onload = res; el.onerror = () => { delete loaded[url]; rej(new Error('Gagal memuat ' + url)); };
      document.head.appendChild(el);
    });
    return loaded[url];
  }
  const ensureGuru = () => Promise.all([loadAsset('css/guru.css?v=' + VER), loadAsset('js/guru.js?v=' + VER)]);

  // ------------------------------------------------------------------ router SPA (#/halaman/param)
  const Pages = {};
  const Shells = {};
  function registerPage(name, def) { Pages[name] = Object.assign({ role: 'murid' }, def); }
  function go(name, param) {
    const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
    if (location.hash === h) route(); else location.hash = h;
  }
  function roleGroup() { return AppState.role === 'murid' ? 'murid' : 'guru'; }
  async function route() {
    const app = $('#app');
    if (!AppState.token) { AppState.page = ''; renderLogin(); return; }
    const grp = roleGroup();
    if (grp === 'guru' && !Shells.guru) {
      app.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
      try { await ensureGuru(); } catch (e) { app.innerHTML = errorBox('Gagal memuat panel guru. Periksa koneksi.', () => route()); return; }
    }
    const shell = Shells[grp];
    if (!shell.mounted || !app.querySelector('.shell-' + grp)) { app.innerHTML = ''; shell.mount(app); shell.mounted = true; $$('.page', app).forEach((p) => p.remove()); }
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let name = parts[0], param = parts[1] ? decodeURIComponent(parts[1]) : '';
    if (!Pages[name] || Pages[name].role !== grp || (Pages[name].admin && AppState.role !== 'admin')) { name = shell.home; param = ''; }
    const def = Pages[name];
    const host = shell.host();
    let el = host.querySelector('.page[data-page="' + name + '"]');
    if (!el) { el = document.createElement('section'); el.className = 'page page-' + name; el.dataset.page = name; el.innerHTML = def.template ? def.template() : ''; host.appendChild(el); if (def.init) def.init(el); }
    const changed = AppState.page !== name;
    if (changed && Pages[AppState.page] && Pages[AppState.page].hide) Pages[AppState.page].hide();
    $$('.page', host).forEach((p) => { p.hidden = p !== el; });
    AppState.page = name;
    shell.setActive && shell.setActive(name);
    document.title = (def.title || 'TKA QUEST') + ' — TKA QUEST';
    if (changed) window.scrollTo(0, 0);
    if (def.show) def.show(el, param);
  }
  addEventListener('hashchange', route);

  // ------------------------------------------------------------------ sesi
  function setSession(token, role, uid, boot) {
    AppState.token = token; AppState.role = role; AppState.uid = uid; AppState.boot = boot;
    Store.set('sess', { token, role, uid });
    if (boot) cacheSet('boot', boot);
  }
  function clearSession() {
    AppState.token = ''; AppState.role = ''; AppState.uid = ''; AppState.boot = null;
    Store.del('sess');
    Object.keys(Shells).forEach((k) => { Shells[k].mounted = false; });
  }
  function onSessionExpired() {
    if (!AppState.token) return;
    clearSession();
    toast('Sesi berakhir. Silakan masuk lagi.', 'warn');
    location.hash = '#/';
    route();
  }
  async function logout() {
    const ok = await confirmDlg('Keluar dari akun?', 'Kamu bisa masuk lagi kapan saja dengan username dan PIN/sandi.', 'Keluar');
    if (!ok) return;
    const pending = Outbox.list().length;
    if (pending) { busy(true, 'Mengirim data yang belum tersimpan…'); await Outbox.flush(); busy(false); }
    api('logout', {});
    clearSession();
    location.hash = '#/';
    route();
  }

  // ------------------------------------------------------------------ layar masuk
  let loginTab = 'murid';
  function renderLogin() {
    document.body.className = 'role-login';
    const pub = Store.get('pub', {});
    const app = $('#app');
    app.innerHTML =
      '<div class="login-screen">' +
      '<div class="login-art" aria-hidden="true">' + loginArt() + '</div>' +
      '<div class="login-card card-stone">' +
      '<div class="brand-row"><span class="brand-badge">' + icon('shield') + '</span><div><div class="brand-name">TKA QUEST</div><div class="brand-sub">Akademi Penjelajah Ilmu' + (pub.nama ? ' • ' + esc(pub.nama) : '') + '</div></div></div>' +
      '<div class="tabs-pill" role="tablist">' +
      '<button role="tab" class="tab ' + (loginTab === 'murid' ? 'active' : '') + '" data-tab="murid">' + icon('compass', 'ic-sm') + 'Murid</button>' +
      '<button role="tab" class="tab ' + (loginTab === 'guru' ? 'active' : '') + '" data-tab="guru">' + icon('school', 'ic-sm') + 'Guru</button></div>' +
      '<form id="login-form" autocomplete="on" novalidate></form>' +
      '<p class="login-foot">' + icon('lock', 'ic-xs') + 'Akun dibuat oleh guru. Lupa PIN? Minta guru mereset.</p>' +
      '</div></div>';
    $$('.tabs-pill .tab', app).forEach((b) => { b.onclick = () => { loginTab = b.dataset.tab; renderLogin(); }; });
    const f = $('#login-form');
    if (loginTab === 'murid') {
      const saved = Store.get('lastUser', '');
      f.innerHTML =
        '<label class="field"><span>Username</span><input id="lg-user" name="username" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="contoh: bima.6a" value="' + esc(saved) + '" required></label>' +
        '<div class="field"><span>PIN (4 angka)</span><div class="pin-dots" aria-live="polite">' + '<i></i>'.repeat(4) + '</div>' +
        '<input id="lg-pin" class="sr-only" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" aria-label="PIN"></div>' +
        '<div class="pinpad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => '<button type="button" class="pin-key ' + (k === 'ok' ? 'pin-ok' : k === 'del' ? 'pin-del' : '') + '" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Hapus' : k === 'ok' ? 'Masuk' : k) + '">' + (k === 'del' ? icon('chevron-left') : k === 'ok' ? icon('arrow-right') : k) + '</button>').join('') + '</div>' +
        '<div class="login-err" id="lg-err" role="alert"></div>' +
        '<button class="btn btn-gold btn-lg btn-block" type="submit" id="lg-btn">' + icon('swords', 'ic-sm') + 'Mulai Petualangan</button>';
      const pin = $('#lg-pin'), dots = $$('.pin-dots i', f);
      const paint = () => {
        pin.value = pin.value.replace(/\D/g, '').slice(0, 4);
        dots.forEach((d, i) => d.classList.toggle('on', i < pin.value.length));
        if (pin.value.length === 4 && $('#lg-user').value.trim()) f.requestSubmit();
      };
      $$('.pin-key', f).forEach((b) => b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'del') pin.value = pin.value.slice(0, -1);
        else if (k === 'ok') return f.requestSubmit();
        else if (pin.value.length < 4) pin.value += k;
        paint();
      });
      pin.oninput = paint;
      $('.pin-dots', f).onclick = () => pin.focus();
      addEventListener('keydown', pinKeys);
      warm('pub');
    } else {
      f.innerHTML =
        '<label class="field"><span>Username guru</span><input id="lg-user" autocapitalize="none" autocomplete="username" spellcheck="false" required></label>' +
        '<label class="field"><span>Kata sandi</span><div class="input-eye"><input id="lg-pass" type="password" autocomplete="current-password" required><button type="button" class="icon-btn" id="lg-eye" aria-label="Tampilkan sandi">' + icon('eye') + '</button></div></label>' +
        '<div class="login-err" id="lg-err" role="alert"></div>' +
        '<button class="btn btn-sky btn-lg btn-block" type="submit" id="lg-btn">' + icon('log-out', 'ic-sm') + 'Masuk Panel Guru</button>';
      $('#lg-eye').onclick = () => { const p = $('#lg-pass'); p.type = p.type === 'password' ? 'text' : 'password'; };
      warm('guru');
      idle(() => ensureGuru().catch(() => {}), 600);
    }
    f.onsubmit = doLogin;
    setTimeout(() => { const u = $('#lg-user'); if (u && !u.value) u.focus(); }, 50);
  }
  function pinKeys(e) {
    const pin = $('#lg-pin');
    if (!pin || document.activeElement === pin || document.activeElement === $('#lg-user')) return;
    if (/^\d$/.test(e.key) && pin.value.length < 4) { pin.value += e.key; pin.oninput(); }
    else if (e.key === 'Backspace') { pin.value = pin.value.slice(0, -1); pin.oninput(); }
  }
  async function doLogin(e) {
    e.preventDefault();
    const btn = $('#lg-btn'), err = $('#lg-err');
    if (btn.disabled) return;
    const user = $('#lg-user').value.trim().toLowerCase();
    err.textContent = '';
    if (loginTab === 'murid') {
      const pin = $('#lg-pin').value;
      if (!user) { err.textContent = 'Tulis username dulu, ya.'; return; }
      if (!/^\d{4}$/.test(pin)) { err.textContent = 'PIN terdiri dari 4 angka.'; return; }
      btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span>Membuka gerbang…';
      const r = await api('loginMurid', { username: user, pin });
      if (r.success) {
        removeEventListener('keydown', pinKeys);
        Store.set('lastUser', user);
        setSession(r.data.token, 'murid', r.data.boot.profil.id, r.data.boot);
        Store.set('pub', r.data.boot.sekolah);
        location.hash = '#/basecamp'; route();
        return;
      }
      $('#lg-pin').value = ''; $$('.pin-dots i').forEach((d) => d.classList.remove('on'));
      err.textContent = r.message;
      btn.disabled = false; btn.innerHTML = icon('swords', 'ic-sm') + 'Mulai Petualangan';
    } else {
      const pass = $('#lg-pass').value;
      if (!user || !pass) { err.textContent = 'Isi username dan kata sandi.'; return; }
      btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span>Memeriksa…';
      const [r] = await Promise.all([api('loginGuru', { username: user, password: pass }), ensureGuru().catch(() => {})]);
      if (r.success) {
        setSession(r.data.token, r.data.role, r.data.boot.me.id, r.data.boot);
        Store.set('pub', r.data.boot.sekolah);
        location.hash = '#/beranda'; route();
        return;
      }
      err.textContent = r.message;
      btn.disabled = false; btn.innerHTML = icon('log-out', 'ic-sm') + 'Masuk Panel Guru';
    }
  }
  function loginArt() {
    return '<svg viewBox="0 0 400 300" class="login-svg"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38BDF8"/><stop offset="1" stop-color="#BAE6FD"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#sky)"/><circle cx="320" cy="62" r="26" fill="#FDE68A"/>' +
      '<path d="M0 210 L70 120 L120 170 L180 90 L260 190 L320 130 L400 200 V300 H0Z" fill="#94A3B8" opacity=".55"/>' +
      '<path d="M0 230 Q100 180 200 220 T400 210 V300 H0Z" fill="#22C55E"/><path d="M0 260 Q120 230 230 255 T400 250 V300 H0Z" fill="#15803D"/>' +
      '<path d="M150 300 C170 260 230 250 250 205" stroke="#FDF6E2" stroke-width="10" fill="none" stroke-dasharray="14 10" stroke-linecap="round"/>' +
      [[60, 232], [96, 244], [318, 236], [352, 228]].map((p) => '<path d="M' + p[0] + ' ' + p[1] + ' l14 -34 l14 34z" fill="#166534"/><rect x="' + (p[0] + 12) + '" y="' + p[1] + '" width="4" height="8" fill="#7C4A1E"/>').join('') +
      '<g transform="translate(232 150)"><path d="M0 52 V18 L18 4 L36 18 V52Z" fill="#FDF6E2" stroke="#2E384D" stroke-width="3"/><path d="M-4 20 L18 0 L40 20" fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/><rect x="13" y="32" width="10" height="20" fill="#2E384D"/><path d="M18 -6 V-26 L32 -20 L18 -14" fill="#F59E0B" stroke="#2E384D" stroke-width="2"/></g>' +
      '<g transform="translate(120 192)">' + window.avatarSvg('A1', 6, 70).replace('<svg ', '<svg x="0" y="0" ') + '</g></svg>';
  }

  // ------------------------------------------------------------------ mulai aplikasi
  function start() {
    const s = Store.get('sess', null);
    if (s && s.token) {
      AppState.token = s.token; AppState.role = s.role; AppState.uid = s.uid;
      AppState.boot = cacheGet('boot') || null;
      warm(s.role === 'murid' ? 'pub' : 'guru');
      if (!location.hash || location.hash === '#/') location.hash = s.role === 'murid' ? '#/basecamp' : '#/beranda';
      setTimeout(() => Outbox.flush(), 1500);
    }
    route();
    const sp = document.getElementById('boot-splash');
    if (sp) { sp.classList.add('hide'); setTimeout(() => sp.remove(), 400); }
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js?v=' + VER).catch(() => {});
  }

  window.TQ = { VER, $, $$, esc, rich, fmtN, fmtTgl, fmtJam, relTime, todayKey, debounce, uuid, idle, AppState, Store, userKey, hashStr, Perf,
    api, apiQ, swr, cacheSet, cacheGet, cacheStale, Outbox, warm, toast, modal, confirmDlg, busy, errorBox, loadAsset,
    Pages, Shells, registerPage, go, route, logout, setSession, start };
  window.Perf = Perf;
  // start() dipanggil di akhir murid.js (skrip defer terakhir) agar semua halaman sudah terdaftar
})();
