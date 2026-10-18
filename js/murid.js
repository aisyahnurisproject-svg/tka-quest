/* =====================================================================
   TKA QUEST — murid.js
   Basecamp, Peta Dunia, Misi (penilaian instan di perangkat), Hasil, Ransel, Liga.
   Semua layar dirender dari data bootstrap yang di-cache di perangkat → pindah menu tanpa menunggu server.
   ===================================================================== */
'use strict';
(function () {
  const { $, $$, esc, rich, fmtN, fmtTgl, AppState, Store, userKey, api, swr, cacheSet, Outbox, toast, modal, confirmDlg, busy, errorBox, registerPage, go, idle } = TQ;

  const B = () => AppState.boot;
  const P = () => (AppState.boot ? AppState.boot.profil : null);
  const mapelIcon = (m) => (m === 'Numerasi' ? 'calculator' : 'book-open');
  const pct = (a, b) => (b ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0);

  function setBoot(b, silent) {
    AppState.boot = b;
    cacheSet('boot', b);
    renderHeader();
    if (!silent) window.dispatchEvent(new Event('boot:update'));
  }
  function patchProfil(p) {
    if (!AppState.boot) return;
    AppState.boot.profil = Object.assign({}, AppState.boot.profil, p);
    setBoot(AppState.boot);
  }
  let bootLoading = null;
  function refreshBoot(force) {
    if (bootLoading) return bootLoading;
    bootLoading = swr('boot', 'muridBoot', {}, (d, fromCache) => { if (!fromCache) setBoot(d); }, { fresh: force ? 0 : 60000, force: !!force })
      .then((r) => { bootLoading = null; if (!r.success && !AppState.boot) window.dispatchEvent(new CustomEvent('boot:error', { detail: r })); return r; });
    return bootLoading;
  }

  // ================================================================ SHELL
  const NAV = [['basecamp', 'home', 'Basecamp'], ['peta', 'map', 'Peta Dunia'], ['misi', 'swords', 'Misi'], ['ransel', 'backpack', 'Ransel'], ['liga', 'trophy', 'Liga']];
  TQ.Shells.murid = {
    home: 'basecamp',
    mount(app) {
      document.body.className = 'role-murid';
      app.innerHTML =
        '<div class="shell-murid">' +
        '<header class="m-top"><div class="m-top-in">' +
        '<a class="brand-row brand-sm" href="#/basecamp" aria-label="TKA QUEST — Basecamp"><span class="brand-badge">' + icon('shield') + '</span><span><span class="brand-name">TKA QUEST</span><span class="brand-sub" id="m-kelas"></span></span></a>' +
        '<nav class="m-nav" aria-label="Menu utama">' + NAV.map((n) => '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + n[2] + '</a>').join('') + '</nav>' +
        '<div class="m-stats"><div class="lv-pill" id="m-lv"></div><div class="streak-pill" id="m-streak"></div>' +
        '<button class="m-user" id="m-user" aria-label="Menu akun"></button></div></div></header>' +
        '<main class="m-main" id="m-pages"></main>' +
        '<nav class="m-bottom" aria-label="Menu bawah">' + NAV.map((n) => '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + icon(n[1]) + '<span>' + n[2].replace(' Dunia', '') + '</span></a>').join('') + '</nav>' +
        '</div>';
      $('#m-user').onclick = userMenu;
      renderHeader();
      refreshBoot();
      idle(() => Outbox.flush(), 1500);
    },
    host: () => $('#m-pages'),
    setActive(name) {
      $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (name === 'hasil' && a.dataset.nav === 'misi')));
      document.body.classList.toggle('in-mission', name === 'misi' && !!Play.st);
    }
  };

  function renderHeader() {
    const p = P(), b = B();
    if (!p || !$('#m-lv')) return;
    $('#m-kelas').textContent = 'Kelas ' + (b.kelas.nama || '') + ' • ' + (b.sekolah.nama || '');
    const prog = pct(p.xp - p.lvStart, p.lvNext - p.lvStart);
    $('#m-lv').innerHTML = '<span>Lv ' + p.level + '</span><span class="mini-bar"><i style="width:' + prog + '%"></i></span><span class="lv-xp">' + fmtN(p.xp - p.lvStart) + '/' + fmtN(p.lvNext - p.lvStart) + '</span>';
    $('#m-streak').innerHTML = icon('flame', 'ic-sm') + '<b>' + p.streak + '</b><span class="hide-sm"> hari</span>';
    $('#m-streak').title = 'Streak check-in: ' + p.streak + ' hari';
    $('#m-user').innerHTML = avatarSvg(p.avatar, p.level, 38) + '<span class="hide-sm"><b>' + esc(p.nama.split(' ')[0]) + '</b><small>Murid</small></span>';
  }

  function userMenu() {
    const p = P();
    modal({
      title: 'Akun Penjelajah', size: 'sm',
      body: '<div class="acct">' + avatarSvg(p.avatar, p.level, 72) + '<div><b>' + esc(p.nama) + '</b><div class="muted">@' + esc(p.username) + ' • Kelas ' + esc(B().kelas.nama) + '</div><div class="muted">' + esc(p.gelar) + ' • Level ' + p.level + '</div></div></div>' +
        (Outbox.list().length ? '<p class="note-warn">' + icon('cloud-off', 'ic-sm') + Outbox.list().length + ' data menunggu dikirim ke server.</p>' : ''),
      actions: [{ label: 'Segarkan data', icon: 'refresh', cls: 'btn btn-ghost', onClick: () => { refreshBoot(true).then((r) => toast(r.success ? 'Data terbaru dimuat.' : r.message, r.success ? 'success' : 'error')); } },
        { label: 'Keluar', icon: 'log-out', cls: 'btn btn-danger', onClick: () => { setTimeout(TQ.logout, 200); } }]
    });
  }

  addEventListener('boot:update', () => { const def = TQ.Pages[AppState.page]; if (def && def.role === 'murid' && def.render) def.render(); });
  addEventListener('boot:error', (e) => {
    const host = $('#m-pages .page:not([hidden])');
    if (host && !AppState.boot) host.innerHTML = errorBox(e.detail.message, () => { host.innerHTML = skeleton(); refreshBoot(true); });
  });
  const skeleton = () => '<div class="skel-grid"><div class="skel skel-lg"></div><div class="skel"></div><div class="skel"></div></div>';

  // ================================================================ PREFETCH MISI (tombol Berangkat terasa instan)
  const Pre = {
    get() { const x = Store.get(userKey('misiPre'), null); if (!x) return null; if (Date.now() - x.at > 2 * 3600e3 || x.day !== TQ.todayKey() || x.misiHari !== (P() || {}).misiHari) return null; return x; },
    loading: null,
    fetch(wilayah) {
      const p = P(); if (!p || p.misiHari >= B().aturan.maksMisi || Play.saved()) return Promise.resolve(null);
      const cur = this.get();
      if (cur && (!wilayah || cur.data.wilayah.id === wilayah)) return Promise.resolve(cur);
      if (this.loading && this.loading.w === (wilayah || '')) return this.loading.p;
      const pr = api('misiMulai', { wilayah: wilayah || '' }).then((r) => {
        this.loading = null;
        if (!r.success) return { error: r };
        const x = { at: Date.now(), day: TQ.todayKey(), misiHari: (P() || {}).misiHari, data: r.data };
        Store.set(userKey('misiPre'), x);
        window.dispatchEvent(new Event('misi:pre'));
        return x;
      });
      this.loading = { w: wilayah || '', p: pr };
      return pr;
    },
    clear() { Store.del(userKey('misiPre')); }
  };

  // ================================================================ SHA-256 (WebCrypto; cadangan JS bila bukan HTTPS)
  const enc = new TextEncoder();
  function sha256js(bytes) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    const w = new Uint32Array(64), r = (x, y) => (x >>> y) | (x << (32 - y));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    H.forEach((x, i) => odv.setUint32(i * 4, x));
    return out;
  }
  async function sha256(str) {
    const bytes = enc.encode(str);
    if (window.crypto && crypto.subtle) { try { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); } catch (e) { /* lanjut cadangan */ } }
    return sha256js(bytes);
  }
  const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
  async function findKey(nonce, q) {
    for (const L of Object.keys(q.opsi)) if (hex(await sha256(nonce + '|' + q.id + '|' + L)).slice(0, 20) === q.k) return L;
    return '';
  }
  async function decryptP(nonce, q, L) {
    if (!q.p || !L) return '';
    try {
      const data = Uint8Array.from(atob(q.p), (c) => c.charCodeAt(0)), out = new Uint8Array(data.length);
      let block;
      for (let i = 0; i < data.length; i++) {
        if (i % 32 === 0) block = await sha256(nonce + '|' + q.id + '|' + L + '|p|' + (i / 32));
        out[i] = data[i] ^ block[i % 32];
      }
      return new TextDecoder().decode(out);
    } catch (e) { return ''; }
  }

  // ================================================================ MESIN MISI
  const Play = {
    st: null,
    saved() { return Store.get(userKey('misiAktif'), null); },
    save() { if (this.st) Store.set(userKey('misiAktif'), this.st); },
    clear() { this.st = null; Store.del(userKey('misiAktif')); },
    async begin(pre) {
      const misi = pre.data;
      Pre.clear();
      const keys = {};
      await Promise.all(misi.soal.map(async (q) => { keys[q.id] = await findKey(misi.nonce, q); }));
      this.st = { misi, keys, idx: 0, jawab: {}, pilih: '', mulai: Date.now(), qMulai: Date.now(), combo: 0, comboMax: 0, hint: 1, hilang: {} };
      this.save();
      go('misi');
    },
    resume() { const s = this.saved(); if (!s) return false; this.st = s; this.st.qMulai = Date.now(); return true; }
  };

  async function startMisi(wilayah) {
    const p = P();
    if (!p) return;
    if (Play.saved()) { Play.resume(); go('misi'); return; }
    if (p.misiHari >= B().aturan.maksMisi) { toast('Misi hari ini sudah tuntas. Besok lanjut lagi, ya!', 'info'); return; }
    let pre = Pre.get();
    if (!pre || (wilayah && pre.data.wilayah.id !== wilayah)) {
      busy(true, 'Menyiapkan peta misi…');
      pre = await Pre.fetch(wilayah);
      busy(false);
    }
    if (!pre || pre.error) { toast((pre && pre.error.message) || 'Misi belum bisa dimulai. Periksa koneksi.', 'error', 4500); return; }
    await Play.begin(pre);
  }

  // ================================================================ BASECAMP
  let cdTimer = null;
  registerPage('basecamp', {
    role: 'murid', title: 'Basecamp',
    template: () => '<div class="bc-grid"><div class="bc-main"></div><aside class="bc-side"></aside></div>',
    show(el) { this.el = el; this.render(); refreshBoot(); idle(() => Pre.fetch().then(() => this.renderHero()), 900); },
    hide() { clearInterval(cdTimer); },
    refresh() { refreshBoot(true); },
    render() {
      const el = this.el; if (!el || el.hidden) return;
      const b = B();
      if (!b) { $('.bc-main', el).innerHTML = skeleton(); $('.bc-side', el).innerHTML = ''; return; }
      const p = b.profil, a = b.aturan;
      const prog = pct(p.xp - p.lvStart, p.lvNext - p.lvStart);
      $('.bc-main', el).innerHTML =
        '<section class="card-stone welcome">' +
        '<div class="av-frame">' + avatarSvg(p.avatar, p.level, 92) + '<span class="lv-badge">Lv.' + p.level + '</span></div>' +
        '<div class="welcome-txt"><h1>Selamat datang, Penjelajah ' + esc(p.nama.split(' ')[0]) + '!</h1><span class="chip chip-gold">' + esc(p.gelar) + '</span>' +
        '<p>' + esc(sapaan(p)) + '</p></div>' +
        '<div class="checkin-box ' + (p.sudahCheckin ? 'done' : '') + '"><div class="ck-num">' + icon('flame') + p.streak + ' hari</div>' +
        (p.sudahCheckin ? '<div class="ck-ok">' + icon('check', 'ic-sm') + 'Sudah check-in</div>' : '<button class="btn btn-gold btn-sm" id="bc-ck">' + icon('gift', 'ic-sm') + 'Klaim +' + a.xpCheckin + ' XP</button>') + '</div>' +
        '<div class="xp-row"><div class="xp-label"><span>' + icon('star', 'ic-xs') + 'Progres level: <b>' + fmtN(p.xp - p.lvStart) + ' / ' + fmtN(p.lvNext - p.lvStart) + ' XP</b></span><span class="xp-next">' + fmtN(p.lvNext - p.xp) + ' XP lagi menuju Level ' + (p.level + 1) + '</span></div>' +
        '<div class="xp-track"><i style="width:' + prog + '%"></i></div></div></section>' +
        '<section class="hero-misi" id="bc-hero"></section>' +
        '<section class="card-stone wil-aktif" id="bc-wil"></section>' +
        '<section class="card-stone target-len"><div class="sec-head"><h2>' + icon('award') + 'Target Lencana</h2><a href="#/ransel" class="link">Buka Ransel ' + icon('chevron-right', 'ic-xs') + '</a></div><div class="len-row">' + targetLencana(p, b).join('') + '</div></section>';
      $('.bc-side', el).innerHTML = ligaMini(b) + energiKomunal(b) + '<section class="card-dark countdown" id="bc-cd"></section>';
      const ck = $('#bc-ck', el); if (ck) ck.onclick = doCheckin;
      this.renderHero(); this.renderWil();
      const cd = () => { const box = $('#bc-cd', el); if (box) box.innerHTML = countdownHtml(b.sekolah.tka); };
      cd(); clearInterval(cdTimer); cdTimer = setInterval(cd, 30000);
    },
    renderHero() {
      const el = this.el, box = el && $('#bc-hero', el); if (!box || !B()) return;
      const p = P(), a = B().aturan, saved = Play.saved(), pre = Pre.get();
      if (saved) {
        const n = Object.keys(saved.jawab).length;
        box.innerHTML = '<div class="hero-in"><div class="hero-ic">' + icon('hourglass') + '</div><div class="hero-txt"><span class="chip chip-gold">Misi belum selesai</span><h2>Lanjutkan ' + esc(saved.misi.wilayah.nama) + '</h2><p>Kamu sudah menjawab ' + n + ' dari ' + saved.misi.soal.length + ' soal. Ayo tuntaskan!</p></div>' +
          '<button class="btn btn-gold btn-xl" id="bc-go">' + icon('swords') + 'Lanjutkan Misi</button></div>';
      } else if (p.misiHari >= a.maksMisi) {
        box.className = 'hero-misi hero-done';
        box.innerHTML = '<div class="hero-in"><div class="hero-ic">' + icon('check-circle') + '</div><div class="hero-txt"><span class="chip chip-gold">Misi hari ini tuntas</span><h2>Hebat! ' + p.misiHari + ' misi selesai hari ini</h2><p>Otak juga butuh istirahat. Datang lagi besok untuk menjaga streak api tetap menyala.</p></div>' +
          '<a class="btn btn-ghost btn-xl" href="#/liga">' + icon('trophy') + 'Lihat Liga</a></div>';
        return;
      } else {
        const w = pre ? pre.data.wilayah : null, n = a.soalPerMisi;
        box.className = 'hero-misi';
        box.innerHTML = '<div class="hero-in"><div class="hero-ic">' + icon('swords') + '</div><div class="hero-txt">' +
          '<div class="hero-chips"><span class="chip chip-gold">Misi harian ' + (p.misiHari + 1) + '/' + a.maksMisi + '</span><span class="chip chip-clear">' + icon('clock', 'ic-xs') + '±' + Math.round(n * 1.2) + ' menit</span></div>' +
          '<h2>' + (w ? 'Ekspedisi ' + esc(w.nama) : 'Ekspedisi ' + n + ' Tantangan') + '</h2>' +
          '<p>' + (w ? Math.ceil(n / 2) + ' soal ' + w.mapel + ' di ' + esc(w.nama) + ' + ' + Math.floor(n / 2) + ' soal pendamping. Pembahasan langsung muncul setiap soal.' : 'Soal Literasi + Numerasi dengan pembahasan langsung.') + '</p></div>' +
          '<div class="hero-cta"><button class="btn btn-gold btn-xl" id="bc-go">Berangkat Sekarang ' + icon('arrow-right') + '</button><span class="hero-reward">' + icon('award', 'ic-xs') + 'Hadiah: hingga +' + (n * a.xpBenar + a.xpSelesai + a.xpSempurna) + ' XP</span></div></div>';
      }
      $('#bc-go', box).onclick = () => startMisi();
    },
    renderWil() {
      const el = this.el, box = el && $('#bc-wil', el); if (!box) return;
      const b = B(), p = b.profil;
      const pilih = (mapel) => b.wilayah.filter((w) => w.mapel === mapel && p.xp >= w.syarat).sort((x, y) => x.urutan - y.urutan).filter((w) => ((p.progres[w.id] || {}).b || 0) < 10)[0] || b.wilayah.filter((w) => w.mapel === mapel)[0];
      const lit = pilih('Literasi'), num = pilih('Numerasi');
      const bar = (w) => { const pr = p.progres[w.id] || { b: 0 }; return '<div class="wil-bar"><div class="wil-bar-top"><span>' + icon(mapelIcon(w.mapel), 'ic-xs') + w.mapel + ': ' + esc(w.nama) + '</span><b>Babak ' + (pr.b || 0) + '/10</b></div><div class="bar bar-' + (w.mapel === 'Numerasi' ? 'num' : 'lit') + '"><i style="width:' + (pr.b || 0) * 10 + '%"></i></div></div>'; };
      box.innerHTML = '<div class="sec-head"><h2>' + icon('compass') + 'Wilayah Aktif</h2><a class="btn btn-ghost btn-sm" href="#/peta">' + icon('map', 'ic-sm') + 'Buka Peta</a></div>' +
        '<div class="wil-scene">' + miniScene(lit, num) + '</div><div class="wil-bars">' + bar(num) + bar(lit) + '</div>';
    }
  });

  function sapaan(p) {
    if (!p.misiTotal) return 'Petualanganmu dimulai hari ini. Cukup 10–15 menit sehari, pelan-pelan jadi juara!';
    if (!p.sudahCheckin) return 'Gerbang Basecamp sudah terbuka. Check-in dulu, lalu berangkat misi!';
    if (p.streak >= 7) return 'Api semangatmu menyala ' + p.streak + ' hari berturut-turut. Luar biasa!';
    return 'Setiap soal yang kamu coba tetap menambah XP. Kesalahan adalah bagian dari petualangan.';
  }

  async function doCheckin() {
    const p = P(), a = B().aturan;
    if (p.sudahCheckin) return;
    const yest = new Date(Date.now() + 7 * 3600e3 - 864e5).toISOString().slice(0, 10);
    patchProfil({ sudahCheckin: true, streak: p.terakhirCheckin === yest ? p.streak + 1 : 1, xp: p.xp + a.xpCheckin, xpMinggu: p.xpMinggu + a.xpCheckin, terakhirCheckin: TQ.todayKey() });
    toast('Check-in berhasil! +' + a.xpCheckin + ' XP', 'success');
    Outbox.add('checkin', {});
  }

  function targetLencana(p, b) {
    const val = { misi: p.misiTotal, streak: p.streakMax, benar_lit: p.benarLit, benar_num: p.benarNum, sempurna: p.misiSempurna, level: p.level, xp: p.xp,
      wilayah: Object.keys(p.progres).filter((k) => (p.progres[k] || {}).b >= 10).length };
    const list = b.lencana.filter((l) => p.lencana.indexOf(l.id) === -1).map((l) => {
      const s = String(l.syarat).split(':'), now = val[s[0]] || 0, need = Number(s[1]) || 1;
      return { l, now: Math.min(now, need), need, r: now / need };
    }).sort((x, y) => y.r - x.r).slice(0, 3);
    if (!list.length) return ['<p class="muted">Semua lencana sudah kamu kumpulkan. Legenda sejati!</p>'];
    return list.map((x) => '<div class="len-mini"><span class="len-ic" style="--c:' + esc(x.l.warna || '#F59E0B') + '">' + icon(x.l.ikon || 'award') + '</span><div><b>' + esc(x.l.nama) + '</b><small>' + fmtN(x.now) + '/' + fmtN(x.need) + ' • ' + esc(x.l.deskripsi) + '</small><div class="bar bar-gold"><i style="width:' + pct(x.now, x.need) + '%"></i></div></div></div>');
  }

  function ligaMini(b) {
    const L = b.liga, me = L.list.find((x) => x.id === b.profil.id);
    const top = L.list.slice(0, 3);
    if (me && me.rank > 3) top.push(me);
    return '<section class="card-stone liga-mini"><div class="sec-head"><h2>' + icon('trophy') + 'Liga Kelas ' + esc(b.kelas.nama) + '</h2><span class="chip chip-green">Minggu ini</span></div>' +
      '<p class="quote">' + icon('heart', 'ic-xs') + 'Peringkat ini menghargai kerajinan, bukan nilai ujian.</p>' +
      top.map((x) => '<div class="lg-row ' + (x.id === b.profil.id ? 'me' : '') + '"><span class="rank r' + x.rank + '">' + x.rank + '</span>' + avatarSvg(x.avatar, x.level, 34) +
        '<div class="lg-name"><b>' + esc(x.nama) + (x.id === b.profil.id ? ' <span class="chip chip-sky">Kamu</span>' : '') + '</b><small>' + icon('flame', 'ic-xs') + x.streak + ' hari</small></div><span class="lg-xp">' + fmtN(x.xpMinggu) + ' XP</span></div>').join('') +
      (me && me.rank > 1 ? '<p class="muted small">' + (me.rank <= 3 ? 'Pertahankan posisimu!' : 'Kurang ' + fmtN(L.list[me.rank - 2].xpMinggu - me.xpMinggu + 1) + ' XP untuk naik ke #' + (me.rank - 1) + '.') + '</p>' : '') +
      '<a class="btn btn-ghost btn-block btn-sm" href="#/liga">Lihat seluruh peringkat ' + icon('chevron-right', 'ic-xs') + '</a></section>';
  }
  function energiKomunal(b) {
    const L = b.liga, k = b.kelas;
    return '<section class="card-parch energi"><h2>' + icon('users') + 'Energi Komunal Kelas ' + esc(k.nama) + '</h2>' +
      '<div class="xp-label"><span>XP bersama minggu ini</span><b>' + pct(L.total, L.target) + '%</b></div>' +
      '<div class="xp-track xp-green"><i style="width:' + pct(L.total, L.target) + '%"></i></div>' +
      '<p class="small muted">' + fmtN(L.total) + ' / ' + fmtN(L.target) + ' XP • ' + L.hariIni + ' dari ' + L.jumlah + ' teman sudah check-in hari ini</p>' +
      (k.pesan ? '<div class="bubble"><b>' + icon('message', 'ic-xs') + esc(k.guru || 'Wali kelas') + ':</b> “' + esc(k.pesan) + '”</div>' : '') + '</section>';
  }
  function countdownHtml(tgl) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl || '')) return '';
    const target = new Date(tgl + 'T07:00:00+07:00').getTime(), ms = target - Date.now();
    if (ms <= 0) return '<h2>' + icon('flag') + 'Hari TKA telah tiba</h2><p>Semoga sukses, Penjelajah!</p>';
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 3600e3), m = Math.floor(ms % 3600e3 / 60000);
    return '<div class="sec-head"><h2>' + icon('calendar') + 'Menuju TKA</h2><span class="chip chip-flame">' + fmtTgl(tgl) + '</span></div>' +
      '<div class="cd-grid"><div><b class="gold">' + d + '</b><span>Hari</span></div><div><b>' + h + '</b><span>Jam</span></div><div><b>' + m + '</b><span>Menit</span></div></div>' +
      '<p>Satu misi tiap hari = ' + fmtN(d * 10) + '+ latihan soal sebelum hari H.</p>';
  }
  function miniScene(lit, num) {
    return '<svg viewBox="0 0 600 170" preserveAspectRatio="xMidYMid slice" class="scene-svg" aria-hidden="true"><defs><linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#E0F2FE"/></linearGradient></defs>' +
      '<rect width="600" height="170" fill="url(#ms-sky)"/><path d="M0 120 L80 60 L140 100 L220 40 L300 110 L380 70 L460 115 L540 55 L600 90 V170 H0Z" fill="#94A3B8" opacity=".45"/>' +
      '<path d="M0 135 Q150 95 300 130 T600 120 V170 H0Z" fill="#4ADE80"/><path d="M0 150 Q160 125 320 148 T600 145 V170 H0Z" fill="#16A34A"/>' +
      '<path d="M90 160 C160 120 260 150 330 118 S470 100 520 130" stroke="#FDF6E2" stroke-width="6" stroke-dasharray="10 8" fill="none"/>' +
      '<g transform="translate(150 92)">' + bossSvg(num.warna, 1, 52).replace('<svg ', '<svg x="0" y="0" ') + '</g>' +
      '<g transform="translate(398 82)">' + bossSvg(lit.warna, 0, 52).replace('<svg ', '<svg x="0" y="0" ') + '</g>' +
      '<text x="176" y="84" class="sc-lbl" text-anchor="middle">' + esc(num.nama) + '</text><text x="424" y="74" class="sc-lbl" text-anchor="middle">' + esc(lit.nama) + '</text></svg>';
  }

  // ================================================================ PETA DUNIA
  const POS_D = { W1: [16, 62], W2: [36, 40], W3: [52, 72], W4: [64, 36], W5: [80, 62], W6: [86, 20] };
  const POS_M = { W1: [27, 88], W2: [70, 74], W3: [30, 58], W4: [70, 42], W5: [30, 26], W6: [68, 11] };
  let POS = POS_D;
  const mqMap = window.matchMedia('(max-width: 639px)');
  const pickPos = () => { POS = mqMap.matches ? POS_M : POS_D; };
  mqMap.addEventListener && mqMap.addEventListener('change', () => { pickPos(); if (AppState.page === 'peta') TQ.Pages.peta.render(); });
  let petaSel = '', petaFilter = 'semua';
  registerPage('peta', {
    role: 'murid', title: 'Peta Dunia',
    template: () => '<div class="peta-head card-parch"></div><div class="peta-filter"></div><div class="peta-grid"><div class="peta-map card-stone"></div><aside class="peta-detail"></aside></div>',
    show(el) { this.el = el; this.render(); },
    render() {
      const el = this.el, b = B(); if (!el || !b) return;
      pickPos();
      const p = b.profil, W = b.wilayah;
      const terbuka = W.filter((w) => p.xp >= w.syarat), bintang = W.reduce((s, w) => s + ((p.progres[w.id] || {}).s || 0), 0);
      const next = W.filter((w) => p.xp < w.syarat).sort((x, y) => x.syarat - y.syarat)[0];
      if (!petaSel) petaSel = (W.filter((w) => p.xp >= w.syarat && ((p.progres[w.id] || {}).b || 0) < 10)[0] || W[0]).id;
      $('.peta-head', el).innerHTML = '<div class="ph-title"><span class="ph-ic">' + icon('map') + '</span><div><h1>Peta Dunia: 6 Kerajaan Ilmu</h1><p>Pilih wilayah untuk ditaklukkan atau diulang. Wilayah baru terbuka saat XP-mu cukup.</p></div></div>' +
        '<div class="ph-stats"><div class="stat-chip">' + icon('compass') + '<div><small>Wilayah terbuka</small><b>' + terbuka.length + ' / ' + W.length + '</b></div></div>' +
        '<div class="stat-chip">' + icon('star') + '<div><small>Bintang</small><b>' + bintang + ' / ' + W.length * 30 + '</b></div></div>' +
        (next ? '<div class="stat-chip">' + icon('key') + '<div><small>Kunci ' + esc(next.nama) + '</small><b>' + fmtN(p.xp) + ' / ' + fmtN(next.syarat) + ' XP</b></div></div>' : '') + '</div>';
      const f = [['semua', 'Semua Wilayah (' + W.length + ')'], ['Literasi', 'Literasi (' + W.filter((w) => w.mapel === 'Literasi').length + ')'], ['Numerasi', 'Numerasi (' + W.filter((w) => w.mapel === 'Numerasi').length + ')']];
      $('.peta-filter', el).innerHTML = '<div class="seg">' + f.map((x) => '<button class="' + (petaFilter === x[0] ? 'active' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        '<div class="legend"><span><i class="dot g"></i>Terbuka</span><span><i class="dot o"></i>Sedang aktif</span><span><i class="dot s"></i>Terkunci</span></div>';
      $$('.peta-filter button', el).forEach((btn) => btn.onclick = () => { petaFilter = btn.dataset.f; this.render(); });
      $('.peta-map', el).innerHTML = mapSvg(W) + '<div class="map-nodes">' + W.map((w, i) => {
        const pr = p.progres[w.id] || { b: 0, s: 0 }, lock = p.xp < w.syarat, done = pr.b >= 10, pos = POS[w.id] || [10 + i * 15, 50];
        const dim = petaFilter !== 'semua' && w.mapel !== petaFilter;
        return '<button class="node ' + (lock ? 'lock' : done ? 'done' : 'open') + (w.id === petaSel ? ' sel' : '') + (dim ? ' dim' : '') + '" style="left:' + pos[0] + '%;top:' + pos[1] + '%;--c:' + esc(w.warna || '#0284C7') + '" data-w="' + w.id + '" aria-label="' + esc(w.nama) + (lock ? ' (terkunci)' : '') + '">' +
          '<span class="node-ic">' + icon(lock ? 'lock' : mapelIcon(w.mapel)) + '</span>' +
          '<span class="node-lbl"><b>' + esc(w.nama) + '</b><small>' + (lock ? 'Butuh ' + fmtN(w.syarat) + ' XP' : w.mapel + ' • ' + pr.b + '/10') + '</small></span>' + (done ? '<span class="node-crown">' + icon('trophy', 'ic-xs') + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      $$('.node', el).forEach((n) => n.onclick = () => { petaSel = n.dataset.w; this.render(); const w = W.find((x) => x.id === petaSel); if (p.xp >= w.syarat) Pre.fetch(w.id); });
      this.renderDetail();
    },
    renderDetail() {
      const el = this.el, b = B(), p = b.profil, w = b.wilayah.find((x) => x.id === petaSel); if (!w) return;
      const pr = p.progres[w.id] || { b: 0, s: 0 }, lock = p.xp < w.syarat, idx = b.wilayah.indexOf(w);
      const limit = p.misiHari >= b.aturan.maksMisi;
      $('.peta-detail', el).innerHTML = '<div class="card-parch det">' +
        '<div class="det-head"><span class="det-ic" style="--c:' + esc(w.warna) + '">' + icon(mapelIcon(w.mapel)) + '</span><div><small class="eyebrow">' + w.mapel + ' • Wilayah ' + (idx + 1) + '</small><h2>' + esc(w.nama) + '</h2></div>' +
        (lock ? '<span class="chip chip-stone">Terkunci</span>' : pr.b >= 10 ? '<span class="chip chip-green">Tuntas</span>' : '<span class="chip chip-flame">Aktif</span>') + '</div>' +
        '<p>' + esc(w.deskripsi) + '</p><div class="det-box"><small>Fokus materi TKA</small><b>' + esc(w.materi) + '</b></div>' +
        '<div class="xp-label"><span>Babak ekspedisi</span><b>' + pr.b + ' dari 10 selesai</b></div>' +
        '<div class="babak">' + Array.from({ length: 10 }, (_, i) => '<span class="' + (i < pr.b ? 'ok' : i === pr.b && !lock ? 'cur' : '') + '">' + (i < pr.b ? icon('check', 'ic-xs') : i === 9 ? icon('trophy', 'ic-xs') : i + 1) + '</span>').join('') + '</div>' +
        '<div class="boss-row">' + bossSvg(w.warna, idx, 56) + '<div><b>Bos penjaga: ' + esc(w.bos) + '</b><small>Kalahkan dengan menjawab benar. Setiap jawaban benar mengurangi tenaganya.</small></div></div>' +
        '<div class="det-reward">' + icon('star', 'ic-sm') + '<span>Bintang terkumpul: <b>' + pr.s + ' / 30</b></span></div>' +
        (lock ? '<button class="btn btn-disabled btn-block btn-lg" disabled>' + icon('lock', 'ic-sm') + 'Kumpulkan ' + fmtN(w.syarat - p.xp) + ' XP lagi</button>'
          : limit ? '<button class="btn btn-disabled btn-block btn-lg" disabled>Misi hari ini sudah tuntas</button>'
            : '<button class="btn btn-flame btn-block btn-lg" id="pt-go">' + icon('swords', 'ic-sm') + (pr.b ? 'Lanjutkan Babak ' + Math.min(10, pr.b + 1) : 'Mulai Babak 1') + '</button>') +
        '<p class="tiny muted center">' + icon('cloud', 'ic-xs') + 'Progres tersimpan otomatis di server sekolah.</p></div>';
      const go2 = $('#pt-go', el); if (go2) go2.onclick = () => startMisi(w.id);
    }
  });
  function mapSvg(W) {
    const pts = W.map((w, i) => POS[w.id] || [10 + i * 15, 50]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0] * 10 + ' ' + p[1] * 6).join(' ');
    return '<svg class="map-svg" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><defs>' +
      '<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#E9DDB8"/></pattern></defs>' +
      '<rect width="1000" height="600" fill="#FDF6E2"/><rect width="1000" height="600" fill="url(#dots)"/>' +
      '<path d="M0 0 H260 C230 60 150 110 0 120Z" fill="#BAE6FD"/><text x="24" y="40" class="map-txt">Selat Aksara</text>' +
      '<path d="M380 600 C420 520 470 470 560 450 S760 430 820 360 S930 300 1000 300 V600Z" fill="#DCFCE7"/>' +
      '<path d="M230 600 C260 520 330 500 380 440 S470 360 520 300" stroke="#7DD3FC" stroke-width="18" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M700 60 l40 -50 l40 50z M760 70 l50 -62 l50 62z M840 64 l36 -44 l36 44z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="3"/><text x="730" y="100" class="map-txt">Pegunungan Nalar</text>' +
      [[90, 300], [120, 330], [70, 350], [420, 200], [450, 225], [600, 520], [640, 540], [900, 520], [930, 480]].map((t) => '<path d="M' + t[0] + ' ' + t[1] + ' l14 -32 l14 32z" fill="#22C55E" stroke="#15803D" stroke-width="2"/>').join('') +
      '<path d="' + path + '" stroke="#2E384D" stroke-width="5" fill="none" stroke-dasharray="4 14" stroke-linecap="round" opacity=".55"/></svg>';
  }

  // ================================================================ MISI (bermain)
  let tick = null;
  registerPage('misi', {
    role: 'murid', title: 'Misi',
    template: () => '<div class="play-root"></div>',
    show(el) {
      this.el = el;
      if (!Play.st && Play.saved()) Play.resume();
      document.body.classList.toggle('in-mission', !!Play.st);
      this.render();
      if (!Play.st) idle(() => Pre.fetch().then(() => this.render()), 300);
    },
    hide() { clearInterval(tick); document.body.classList.remove('in-mission'); stopTts(); },
    render() {
      const root = $('.play-root', this.el);
      if (!Play.st) { root.innerHTML = misiLobby(); bindLobby(root); return; }
      renderSoal(root);
    }
  });

  function misiLobby() {
    const b = B(); if (!b) return skeleton();
    const p = b.profil, a = b.aturan, last = Store.get(userKey('hasilTerakhir'), null);
    const limit = p.misiHari >= a.maksMisi;
    return '<div class="lobby"><div class="card-stone lobby-card">' +
      '<div class="lobby-ic">' + icon(limit ? 'check-circle' : 'swords') + '</div><h1>' + (limit ? 'Misi hari ini tuntas!' : 'Siap berangkat, ' + esc(p.nama.split(' ')[0]) + '?') + '</h1>' +
      '<p>' + (limit ? 'Kamu sudah menyelesaikan ' + p.misiHari + ' misi hari ini. Istirahat dulu supaya besok makin tajam.' : 'Satu misi berisi ' + a.soalPerMisi + ' soal campuran Literasi dan Numerasi. Jawaban benar +' + a.xpBenar + ' XP, salah tetap +' + a.xpSalah + ' XP usaha.') + '</p>' +
      (limit ? '' : '<button class="btn btn-gold btn-xl" id="lb-go">' + icon('swords') + 'Berangkat Sekarang</button>') +
      '<div class="lobby-links"><a class="btn btn-ghost" href="#/peta">' + icon('map', 'ic-sm') + 'Pilih wilayah di peta</a>' + (last ? '<a class="btn btn-ghost" href="#/hasil">' + icon('award', 'ic-sm') + 'Hasil misi terakhir</a>' : '') + '</div></div></div>';
  }
  function bindLobby(root) { const g = $('#lb-go', root); if (g) g.onclick = () => startMisi(); }

  function renderSoal(root) {
    const st = Play.st, m = st.misi, q = m.soal[st.idx], N = m.soal.length;
    const ans = st.jawab[q.id], benarSoFar = Object.values(st.jawab).filter((x) => x.benar).length, salah = Object.values(st.jawab).filter((x) => !x.benar).length;
    const bossHp = 100 - pct(benarSoFar, N), heroHp = Math.max(20, 100 - salah * 10), p = P();
    const widx = B() ? Math.max(0, B().wilayah.findIndex((w) => w.id === m.wilayah.id)) : 0;
    root.innerHTML =
      '<div class="play-head card-stone"><div class="ph-left"><span class="ph-ic" style="--c:' + esc(m.wilayah.warna || '#16A34A') + '">' + icon(mapelIcon(m.wilayah.mapel)) + '</span>' +
      '<div><small class="eyebrow">Babak ' + m.babak + ' • ' + esc(m.wilayah.mapel) + '</small><b>' + esc(m.wilayah.nama) + '</b></div></div>' +
      '<div class="ph-stats"><div class="ph-stat st-prog"><small>Soal</small><b>' + (st.idx + 1) + ' / ' + N + '</b></div><div class="ph-stat"><small>' + icon('clock', 'ic-xs') + 'Waktu</small><b id="pl-time">00:00</b></div>' +
      '<div class="ph-stat st-combo ' + (st.combo >= 2 ? 'hot' : '') + '"><small>' + icon('flame', 'ic-xs') + 'Beruntun</small><b>' + st.combo + ' benar</b></div>' +
      '<button class="icon-btn ph-exit" id="pl-exit" aria-label="Keluar dari misi">' + icon('x') + '</button></div>' +
      '<div class="prog-dots">' + m.soal.map((x, i) => '<i class="' + (st.jawab[x.id] ? (st.jawab[x.id].benar ? 'ok' : 'no') : i === st.idx ? 'cur' : '') + '"></i>').join('') + '</div></div>' +
      '<div class="battle" aria-hidden="true"><div class="battle-sky"></div>' +
      '<div class="fighter hero">' + avatarSvg(p.avatar, p.level, 70) + '<div class="hp"><b>' + esc(p.nama.split(' ')[0]) + ' (Lv.' + p.level + ')</b><div class="hp-bar"><i style="width:' + heroHp + '%"></i></div><small>Fokus ' + heroHp + '/100</small></div></div>' +
      '<div class="vs">' + icon('swords') + '</div>' +
      '<div class="fighter boss ' + (ans && ans.benar ? 'hit' : '') + '"><div class="hp"><b>' + esc(m.wilayah.bos || 'Penjaga') + '</b><div class="hp-bar boss-bar"><i style="width:' + bossHp + '%"></i></div><small>Tenaga ' + bossHp + '%</small></div>' + bossSvg(m.wilayah.warna, widx, 76) + '</div></div>' +
      '<div class="play-grid"><article class="q-card card-parch">' +
      '<div class="q-chips"><span class="chip ' + (q.mapel === 'Numerasi' ? 'chip-num' : 'chip-lit') + '">' + icon(mapelIcon(q.mapel), 'ic-xs') + esc(q.mapel) + '</span><span class="chip chip-clear">' + esc(q.materi) + '</span><span class="chip chip-clear">' + esc(q.tingkat) + '</span>' +
      '<button class="btn btn-ghost btn-xs" id="pl-tts">' + icon('volume', 'ic-xs') + 'Baca teks</button></div>' +
      (q.stimulus ? '<div class="stimulus">' + rich(q.stimulus) + '</div>' : '') +
      (q.gambar ? '<button class="q-img" id="pl-img"><img src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(q.gambar) + '&sz=w900" alt="Gambar soal" loading="lazy"></button>' : '') +
      '<div class="q-text">' + rich(q.teks) + '</div></article>' +
      '<section class="ans-card card-stone"><div class="sec-head"><h2>' + icon('wand') + 'Pilih Jurus Jawaban</h2><small>1 jawaban benar</small></div>' +
      '<div class="opts" role="radiogroup">' + Object.keys(q.opsi).map((L) => {
        let cls = '';
        if (ans) cls = L === st.keys[q.id] ? 'correct' : L === ans.pilih ? 'wrong' : 'faded';
        else if (st.pilih === L) cls = 'selected';
        if (!ans && st.hilang[q.id] === L) cls = 'gone';
        return '<button class="opt ' + cls + '" data-l="' + L + '" role="radio" aria-checked="' + (st.pilih === L) + '"' + (ans || cls === 'gone' ? ' disabled' : '') + '><span class="opt-l">' + L + '</span><span class="opt-t">' + rich(q.opsi[L]) + '</span>' +
          (ans && L === st.keys[q.id] ? icon('check-circle', 'opt-mark') : ans && L === ans.pilih ? icon('x-circle', 'opt-mark') : '') + '</button>';
      }).join('') + '</div>' +
      '<div id="pl-fb">' + (ans ? feedbackHtml(ans, q, st) : '') + '</div>' +
      (ans ? '<button class="btn btn-sky btn-block btn-lg" id="pl-next">' + (st.idx < N - 1 ? 'Lanjut ke soal ' + (st.idx + 2) + ' ' + icon('arrow-right') : icon('flag') + 'Selesaikan Misi') + '</button>'
        : '<button class="btn btn-block btn-lg ' + (st.pilih ? 'btn-green' : 'btn-disabled') + '" id="pl-lock"' + (st.pilih ? '' : ' disabled') + '>' + icon('swords') + (st.pilih ? 'Kunci Jawaban ' + st.pilih : 'Pilih jawaban dulu') + '</button>') +
      '<div class="ans-foot"><span>' + icon('star', 'ic-xs') + 'Benar +' + B().aturan.xpBenar + ' XP • Salah +' + B().aturan.xpSalah + ' XP usaha</span></div></section></div>' +
      '<div class="play-tools card-stone"><button class="btn btn-ghost btn-sm" id="pl-hint"' + (st.hint && !ans ? '' : ' disabled') + '>' + icon('lightbulb', 'ic-sm') + 'Bantuan Kancil (' + st.hint + '×)</button>' +
      '<span class="muted small">Menyerah bukan pilihan pahlawan. Coba sampai tuntas!</span></div>';

    $$('.opt', root).forEach((o) => o.onclick = () => { st.pilih = o.dataset.l; Play.save(); renderSoal(root); });
    const lockB = $('#pl-lock', root); if (lockB) lockB.onclick = () => kunciJawaban(root);
    const nx = $('#pl-next', root); if (nx) nx.onclick = () => lanjut(root);
    $('#pl-exit', root).onclick = keluarMisi;
    $('#pl-tts', root).onclick = () => bacaTeks(q);
    const hint = $('#pl-hint', root); if (hint) hint.onclick = () => pakaiHint(root);
    const img = $('#pl-img', root); if (img) img.onclick = () => modal({ title: 'Gambar soal', size: 'lg', body: '<img class="img-full" src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(q.gambar) + '&sz=w1600" alt="Gambar soal">' });
    if (ans && ans.pembahasan === undefined) {
      decryptP(m.nonce, q, st.keys[q.id]).then((t) => { ans.pembahasan = t; Play.save(); const fb = $('#pl-fb', root); if (fb && Play.st && Play.st.misi.soal[Play.st.idx].id === q.id) fb.innerHTML = feedbackHtml(ans, q, st); });
    }
    clearInterval(tick);
    const tEl = $('#pl-time', root);
    const upd = () => { if (!tEl.isConnected) return clearInterval(tick); const s = Math.floor((Date.now() - st.mulai) / 1000); tEl.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    upd(); tick = setInterval(upd, 1000);
    if (ans) { const n2 = $('#pl-next', root); if (n2) n2.focus({ preventScroll: true }); }
  }

  function feedbackHtml(ans, q, st) {
    const a = B().aturan;
    const ok = ans.benar;
    return '<div class="fb ' + (ok ? 'fb-ok' : 'fb-no') + '" role="status"><div class="fb-head">' + icon(ok ? 'sparkles' : 'heart') +
      '<b>' + (ok ? ['Luar biasa!', 'Tepat sekali!', 'Jurus jitu!', 'Mantap, Pahlawan!'][st.idx % 4] + ' +' + a.xpBenar + ' XP' : 'Belum tepat, tetap +' + a.xpSalah + ' XP usaha') + '</b></div>' +
      (!ok ? '<p>Jawaban yang benar: <b>' + st.keys[q.id] + '. ' + rich(q.opsi[st.keys[q.id]]) + '</b></p>' : '') +
      (ans.pembahasan === undefined ? '<p class="muted small">Membuka catatan pembahasan…</p>' : ans.pembahasan ? '<div class="fb-note">' + icon('book-open', 'ic-xs') + '<span><b>Catatan Kancil:</b> ' + rich(ans.pembahasan) + '</span></div>' : '') + '</div>';
  }

  function kunciJawaban(root) {
    const st = Play.st, q = st.misi.soal[st.idx];
    if (!st.pilih || st.jawab[q.id]) return;
    const benar = st.pilih === st.keys[q.id];
    st.jawab[q.id] = { pilih: st.pilih, benar, detik: Math.round((Date.now() - st.qMulai) / 1000) };
    st.combo = benar ? st.combo + 1 : 0;
    st.comboMax = Math.max(st.comboMax, st.combo);
    if (navigator.vibrate) navigator.vibrate(benar ? 30 : [40, 60, 40]);
    Play.save();
    renderSoal(root);
  }
  function lanjut(root) {
    const st = Play.st;
    stopTts();
    if (st.idx < st.misi.soal.length - 1) { st.idx++; st.pilih = ''; st.qMulai = Date.now(); Play.save(); renderSoal(root); root.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); return; }
    selesaiMisi();
  }
  function pakaiHint(root) {
    const st = Play.st, q = st.misi.soal[st.idx];
    if (!st.hint || st.jawab[q.id]) return;
    const salah = Object.keys(q.opsi).filter((L) => L !== st.keys[q.id]);
    const L = salah[Math.floor(Math.random() * salah.length)];
    st.hilang[q.id] = L; st.hint--;
    if (st.pilih === L) st.pilih = '';
    Play.save();
    toast('Kancil berbisik: opsi ' + L + ' pasti bukan jawabannya.', 'info');
    renderSoal(root);
  }
  async function keluarMisi() {
    const ok = await confirmDlg('Jeda misi?', 'Jawabanmu tersimpan di perangkat ini. Kamu bisa melanjutkannya dari Basecamp dalam 3 jam.', 'Jeda dulu');
    if (!ok) return;
    stopTts(); clearInterval(tick);
    Play.st = null;
    go('basecamp');
  }

  // ---- Baca teks (Web Speech API, gratis & tanpa server)
  function bacaTeks(q) {
    if (!('speechSynthesis' in window)) { toast('Perangkat ini belum mendukung fitur baca teks.', 'warn'); return; }
    if (speechSynthesis.speaking) { stopTts(); return; }
    const plain = (s) => String(s || '').replace(/\*\*|_/g, '');
    const txt = [plain(q.stimulus), plain(q.teks)].concat(Object.keys(q.opsi).map((L) => 'Pilihan ' + L + '. ' + plain(q.opsi[L]))).filter(Boolean).join('. ');
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'id-ID'; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => /^id/i.test(x.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function stopTts() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }

  // ---- Selesai: hasil instan di perangkat, simpan ke server lewat outbox
  function selesaiMisi() {
    const st = Play.st, m = st.misi, a = B().aturan, p = P();
    clearInterval(tick);
    const per = { Literasi: { n: 0, b: 0 }, Numerasi: { n: 0, b: 0 } };
    let benar = 0;
    const review = [];
    m.soal.forEach((q) => {
      const j = st.jawab[q.id] || { pilih: '', benar: false };
      per[q.mapel].n++; if (j.benar) { per[q.mapel].b++; benar++; }
      if (!j.benar) review.push({ teks: q.teks, stimulus: q.stimulus, opsi: q.opsi, pilih: j.pilih, kunci: st.keys[q.id], pembahasan: j.pembahasan || '', materi: q.materi });
    });
    const total = m.soal.length, salah = total - benar, akurasi = pct(benar, total);
    const xpCheck = p.sudahCheckin ? 0 : a.xpCheckin;
    const xp = benar * a.xpBenar + salah * a.xpSalah + a.xpSelesai + (benar === total ? a.xpSempurna : 0);
    const hasil = { at: Date.now(), wilayah: m.wilayah, benar, total, akurasi, bintang: akurasi >= 90 ? 3 : akurasi >= 60 ? 2 : 1, xp, xpCheck, per,
      durasi: Math.round((Date.now() - st.mulai) / 1000), comboMax: st.comboMax, review, sync: 'pending', lencanaBaru: [], naikLevel: 0, levelAwal: p.level };
    const reqId = Outbox.add('misiKirim', { mtoken: m.mtoken, jawaban: m.soal.map((q) => ({ id: q.id, pilih: (st.jawab[q.id] || {}).pilih || '', detik: (st.jawab[q.id] || {}).detik || 0 })), durasi: hasil.durasi });
    hasil.reqId = reqId;
    Store.set(userKey('hasilTerakhir'), hasil);
    // pembaruan optimistis
    const yest = new Date(Date.now() + 7 * 3600e3 - 864e5).toISOString().slice(0, 10);
    const pr = Object.assign({}, p.progres); const w0 = pr[m.wilayah.id] || { b: 0, s: 0 };
    pr[m.wilayah.id] = { b: Math.min(10, w0.b + 1), s: Math.min(30, w0.s + hasil.bintang) };
    patchProfil({ xp: p.xp + xp + xpCheck, xpMinggu: p.xpMinggu + xp + xpCheck, misiHari: p.misiHari + 1, misiTotal: p.misiTotal + 1, progres: pr,
      sudahCheckin: true, streak: p.sudahCheckin ? p.streak : (p.terakhirCheckin === yest ? p.streak + 1 : 1), terakhirCheckin: TQ.todayKey() });
    Play.clear();
    Pre.clear();
    document.body.classList.remove('in-mission');
    go('hasil');
  }

  addEventListener('outbox:done', (e) => {
    const { item, res } = e.detail;
    if (item.action === 'checkin') {
      if (res.success) { patchProfil(res.data.profil); celebrate(res.data); }
      return;
    }
    if (item.action !== 'misiKirim') return;
    const h = Store.get(userKey('hasilTerakhir'), null);
    if (h && h.reqId === item.id) {
      if (res.success) { h.sync = 'ok'; h.xp = res.data.hasil.xp; h.xpCheck = res.data.hasil.xpCheckin; h.lencanaBaru = res.data.lencanaBaru; h.naikLevel = res.data.naikLevel; }
      else { h.sync = 'fail'; h.msg = res.message; }
      Store.set(userKey('hasilTerakhir'), h);
    }
    if (res.success) { patchProfil(res.data.profil); celebrate(res.data); TQ.cacheStale('liga'); }
    else if (res.code !== 'DUP') { toast(res.message, 'error', 5000); refreshBoot(true); }
    if (AppState.page === 'hasil') TQ.Pages.hasil.render();
  });
  addEventListener('outbox:wait', () => { if (AppState.page === 'hasil') TQ.Pages.hasil.render(); });

  function celebrate(d) {
    const items = [];
    if (d.naikLevel) items.push('<div class="cel-item">' + avatarSvg(P().avatar, d.naikLevel, 88) + '<h3>Naik ke Level ' + d.naikLevel + '!</h3><p>' + esc(P().gelar) + (avatarStage(d.naikLevel) > avatarStage(d.naikLevel - 1) ? ' • Avatarmu berevolusi!' : '') + '</p></div>');
    (d.lencanaBaru || []).forEach((l) => items.push('<div class="cel-item"><span class="len-ic big" style="--c:' + esc(l.warna || '#F59E0B') + '">' + icon(l.ikon || 'award') + '</span><h3>Lencana baru: ' + esc(l.nama) + '</h3><p>' + esc(l.deskripsi) + '</p></div>'));
    if (!items.length) return;
    modal({ title: 'Hadiah petualangan!', cls: 'celebrate', body: '<div class="confetti" aria-hidden="true">' + Array.from({ length: 18 }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div>' + items.join(''), actions: [{ label: 'Mantap!', cls: 'btn btn-gold' }] });
  }

  // ================================================================ HASIL MISI
  registerPage('hasil', {
    role: 'murid', title: 'Hasil Misi',
    template: () => '<div class="hasil-root"></div>',
    show(el) { this.el = el; this.render(); },
    render() {
      const root = this.el && $('.hasil-root', this.el); if (!root) return;
      const h = Store.get(userKey('hasilTerakhir'), null), p = P();
      if (!h || !p) { root.innerHTML = '<div class="lobby"><div class="card-stone lobby-card"><h1>Belum ada hasil misi</h1><a class="btn btn-gold" href="#/misi">Mulai misi</a></div></div>'; return; }
      const prog = pct(p.xp - p.lvStart, p.lvNext - p.lvStart);
      const sync = h.sync === 'ok' ? '<span class="sync ok">' + icon('check-circle', 'ic-xs') + 'Tersimpan di server</span>'
        : h.sync === 'fail' ? '<span class="sync fail">' + icon('alert-circle', 'ic-xs') + esc(h.msg || 'Gagal disimpan') + '</span>'
          : '<span class="sync wait">' + (navigator.onLine === false ? icon('cloud-off', 'ic-xs') + 'Tersimpan di perangkat — dikirim saat online' : '<span class="spinner spinner-xs"></span>Menyimpan ke server…') + '</span>';
      const mp = (k) => { const x = h.per[k]; if (!x.n) return ''; return '<div class="hs-mapel"><div class="hs-m-top"><span>' + icon(mapelIcon(k), 'ic-sm') + '<b>' + k + '</b></span><span class="chip ' + (x.b === x.n ? 'chip-green' : 'chip-gold') + '">' + x.b + ' / ' + x.n + (x.b === x.n ? ' Sempurna!' : '') + '</span></div><div class="bar bar-' + (k === 'Numerasi' ? 'num' : 'lit') + '"><i style="width:' + pct(x.b, x.n) + '%"></i></div></div>'; };
      root.innerHTML = '<div class="hasil-wrap">' +
        '<div class="hs-trophy">' + icon('trophy') + '</div><span class="chip chip-gold">Misi berhasil diselesaikan</span>' +
        '<h1>Hebat, Penjelajah ' + esc(p.nama.split(' ')[0]) + '!</h1><p class="muted">Kamu menaklukkan babak ' + esc(h.wilayah.nama) + ' hari ini.</p>' + sync +
        '<section class="card-stone hs-chest"><h2>' + icon('gift') + 'Peti Hadiah</h2><div class="hs-two"><div class="hs-box gold"><small>Total XP</small><b>+' + fmtN(h.xp + (h.xpCheck || 0)) + ' XP</b></div><div class="hs-box flame"><small>Streak</small><b>' + p.streak + ' hari</b></div></div>' +
        (h.xpCheck ? '<div class="hs-line">' + icon('zap', 'ic-xs') + 'Bonus check-in harian <span class="chip chip-green">+' + h.xpCheck + ' XP</span></div>' : '') +
        '<div class="xp-label"><b>Level ' + p.level + '</b><span>' + fmtN(p.lvNext - p.xp) + ' XP lagi ke Lv.' + (p.level + 1) + '</span></div><div class="xp-track"><i style="width:' + prog + '%"></i></div></section>' +
        '<section class="card-parch hs-eval"><div class="sec-head"><div><small class="eyebrow">Hasil evaluasi</small><h2>' + h.benar + ' dari ' + h.total + ' soal berhasil</h2></div><div class="hs-acc"><span class="chip chip-green">Akurasi ' + h.akurasi + '%</span><span class="stars">' + [1, 2, 3].map((i) => icon('star', i <= h.bintang ? 'on' : 'off')).join('') + '</span></div></div>' +
        '<div class="hs-line">' + icon('clock', 'ic-xs') + 'Durasi ekspedisi: <b>' + Math.floor(h.durasi / 60) + ' menit ' + (h.durasi % 60) + ' detik</b>' + (h.comboMax >= 3 ? ' • Rekor beruntun: ' + h.comboMax : '') + '</div>' +
        mp('Literasi') + mp('Numerasi') + '</section>' +
        (h.lencanaBaru && h.lencanaBaru.length ? '<section class="card-stone hs-len">' + h.lencanaBaru.map((l) => '<div class="len-mini"><span class="len-ic big" style="--c:' + esc(l.warna) + '">' + icon(l.ikon || 'award') + '</span><div><small class="eyebrow">Lencana baru terbuka</small><b>' + esc(l.nama) + '</b><small>' + esc(l.deskripsi) + '</small></div></div>').join('') + '</section>' : '') +
        (B().kelas.pesan ? '<section class="card-parch bubble-card"><b>' + icon('school', 'ic-sm') + esc(B().kelas.guru || 'Wali kelas') + '</b><p>“' + esc(B().kelas.pesan) + '”</p></section>' : '') +
        '<div class="hs-actions"><a class="btn btn-green btn-lg btn-block" href="#/basecamp">' + icon('home', 'ic-sm') + 'Kembali ke Basecamp</a>' +
        (h.review.length ? '<button class="btn btn-ghost btn-block" id="hs-rev">' + icon('book-open', 'ic-sm') + 'Tinjau ulang pembahasan (' + h.review.length + ' soal)</button>' : '') +
        (h.sync === 'fail' ? '<button class="btn btn-ghost btn-block" id="hs-retry">' + icon('refresh', 'ic-sm') + 'Segarkan data</button>' : '') +
        '<a class="link center" href="#/liga">' + icon('bar-chart', 'ic-xs') + 'Lihat posisi di Liga Pahlawan</a></div></div>';
      const rv = $('#hs-rev', root); if (rv) rv.onclick = () => reviewModal(h);
      const rt = $('#hs-retry', root); if (rt) rt.onclick = () => refreshBoot(true);
    }
  });
  function reviewModal(h) {
    modal({ title: 'Tinjau ulang pembahasan', size: 'lg', body: h.review.map((r, i) => '<div class="rev-item"><small class="eyebrow">Soal ' + (i + 1) + ' • ' + esc(r.materi) + '</small>' +
      (r.stimulus ? '<div class="stimulus small">' + rich(r.stimulus) + '</div>' : '') + '<p><b>' + rich(r.teks) + '</b></p>' +
      '<p class="rev-ans no">' + icon('x-circle', 'ic-xs') + 'Jawabanmu: ' + (r.pilih ? r.pilih + '. ' + rich(r.opsi[r.pilih]) : 'tidak dijawab') + '</p>' +
      '<p class="rev-ans ok">' + icon('check-circle', 'ic-xs') + 'Jawaban benar: ' + r.kunci + '. ' + rich(r.opsi[r.kunci]) + '</p>' +
      (r.pembahasan ? '<div class="fb-note">' + icon('book-open', 'ic-xs') + '<span>' + rich(r.pembahasan) + '</span></div>' : '') + '</div>').join('') });
  }

  // ================================================================ RANSEL
  registerPage('ransel', {
    role: 'murid', title: 'Ransel & Lencana',
    template: () => '<div class="ransel-root"></div>',
    show(el) { this.el = el; this.render(); },
    render() {
      const root = this.el && $('.ransel-root', this.el), b = B(); if (!root || !b) return;
      const p = b.profil, stage = avatarStage(p.level);
      const dapat = b.lencana.filter((l) => p.lencana.indexOf(l.id) > -1).length;
      root.innerHTML = '<div class="ransel-grid">' +
        '<section class="card-stone av-show"><div class="av-big">' + avatarSvg(p.avatar, p.level, 168) + '</div><h1>' + esc(p.nama) + '</h1><span class="chip chip-gold">' + esc(p.gelar) + ' • Lv.' + p.level + '</span>' +
        '<div class="evo">' + [1, 2, 3].map((s) => '<div class="evo-step ' + (s <= stage ? 'on' : '') + '">' + avatarSvg(p.avatar, s === 1 ? 1 : s === 2 ? 5 : 10, 54) + '<small>' + (s === 1 ? 'Lv 1–4' : s === 2 ? 'Lv 5–9' : 'Lv 10+') + '</small></div>').join('<span class="evo-arrow">' + icon('chevron-right') + '</span>') + '</div>' +
        '<div class="stats4"><div><b>' + fmtN(p.misiTotal) + '</b><small>Misi</small></div><div><b>' + fmtN(p.soalTotal) + '</b><small>Soal dijawab</small></div><div><b>' + fmtN(p.benarLit) + '</b><small>Benar Literasi</small></div><div><b>' + fmtN(p.benarNum) + '</b><small>Benar Numerasi</small></div><div><b>' + p.streakMax + '</b><small>Streak terpanjang</small></div><div><b>' + fmtN(p.xp) + '</b><small>Total XP</small></div></div></section>' +
        '<div class="ransel-side"><section class="card-parch"><div class="sec-head"><h2>' + icon('user') + 'Pilih Avatar</h2><small>Tampilan ikut berevolusi saat levelmu naik</small></div><div class="av-pick">' +
        Object.keys(AVATARS).map((k) => '<button class="av-opt ' + (k === p.avatar ? 'on' : '') + '" data-av="' + k + '" aria-pressed="' + (k === p.avatar) + '">' + avatarSvg(k, p.level, 72) + '<small>' + esc(AVATARS[k].nama) + '</small></button>').join('') + '</div></section>' +
        '<section class="card-stone"><div class="sec-head"><h2>' + icon('award') + 'Koleksi Lencana</h2><span class="chip chip-gold">' + dapat + ' / ' + b.lencana.length + '</span></div><div class="len-grid">' +
        b.lencana.map((l) => { const on = p.lencana.indexOf(l.id) > -1; return '<div class="len-card ' + (on ? 'on' : 'off') + '"><span class="len-ic" style="--c:' + esc(on ? l.warna : '#9CA3AF') + '">' + icon(on ? (l.ikon || 'award') : 'lock') + '</span><b>' + esc(l.nama) + '</b><small>' + esc(l.deskripsi) + '</small></div>'; }).join('') +
        '</div></section></div></div>';
      $$('.av-opt', root).forEach((bt) => bt.onclick = () => {
        const av = bt.dataset.av; if (av === p.avatar) return;
        const old = p.avatar;
        patchProfil({ avatar: av });
        api('setAvatar', { avatar: av }).then((r) => { if (!r.success) { patchProfil({ avatar: old }); toast(r.message, 'error'); } else toast('Avatar diganti!', 'success', 1500); });
      });
    }
  });

  // ================================================================ LIGA PAHLAWAN
  let ligaTab = 'xp';
  registerPage('liga', {
    role: 'murid', title: 'Liga Pahlawan',
    template: () => '<div class="liga-root"></div>',
    show(el) {
      this.el = el; this.render();
      swr('liga', 'liga', {}, (d, fromCache) => { if (!fromCache && AppState.boot) { AppState.boot.liga = d; cacheSet('boot', AppState.boot); this.render(); } }, { fresh: 60000 });
    },
    refresh() { TQ.cacheStale('liga'); this.show(this.el); },
    render() {
      const root = this.el && $('.liga-root', this.el), b = B(); if (!root || !b) return;
      const L = b.liga, me = L.list.find((x) => x.id === b.profil.id) || { rank: '-', xpMinggu: 0, streak: 0 };
      const list = ligaTab === 'xp' ? L.list : L.list.slice().sort((x, y) => y.streak - x.streak || y.checkin - x.checkin).map((x, i) => Object.assign({}, x, { rank: i + 1 }));
      const pod = list.slice(0, 3), meR = list.find((x) => x.id === b.profil.id) || me;
      const podCard = (x, pos) => !x ? '<div></div>' : '<div class="pod pod-' + pos + '"><span class="pod-rank">' + pos + '</span>' + avatarSvg(x.avatar, x.level, pos === 1 ? 92 : 70) + '<b>' + esc(x.nama) + '</b><small>Lv.' + x.level + '</small>' +
        '<div class="pod-stats"><div><small>XP usaha</small><b>' + fmtN(x.xpMinggu) + '</b></div><div><small>Streak</small><b>' + icon('flame', 'ic-xs') + x.streak + '</b></div></div><div class="pod-base">' + (pos === 1 ? 'Emas' : pos === 2 ? 'Perak' : 'Perunggu') + '</div></div>';
      root.innerHTML = '<section class="liga-hero"><div><span class="chip chip-gold">Minggu mulai ' + fmtTgl(L.minggu) + '</span><h1>' + icon('trophy') + 'Liga Pahlawan Kelas ' + esc(b.kelas.nama) + '</h1>' +
        '<p>Di TKA QUEST, semua kawan adalah pahlawan. Peringkat ini merayakan kerajinan berlatih dan semangat pantang menyerah, bukan skor ujian.</p></div>' +
        '<div class="lh-stats"><div class="stat-chip">' + icon('star') + '<div><small>Total XP kelas</small><b>' + fmtN(L.total) + '</b></div></div><div class="stat-chip">' + icon('users') + '<div><small>Aktif minggu ini</small><b>' + L.aktif + ' / ' + L.jumlah + '</b></div></div></div></section>' +
        '<div class="seg"><button data-t="xp" class="' + (ligaTab === 'xp' ? 'active' : '') + '">' + icon('star', 'ic-xs') + 'Usaha Mingguan</button><button data-t="streak" class="' + (ligaTab === 'streak' ? 'active' : '') + '">' + icon('flame', 'ic-xs') + 'Penjaga Api Streak</button></div>' +
        '<div class="podium">' + podCard(pod[1], 2) + podCard(pod[0], 1) + podCard(pod[2], 3) + '</div>' +
        '<section class="card-stone me-card"><span class="me-rank">#' + meR.rank + '</span>' + avatarSvg(b.profil.avatar, b.profil.level, 52) + '<div><b>' + esc(b.profil.nama) + ' (Kamu)</b><small>' + (meR.rank > 1 && typeof meR.rank === 'number' ? (ligaTab === 'xp' ? 'Butuh ' + fmtN(list[meR.rank - 2].xpMinggu - meR.xpMinggu + 1) + ' XP lagi untuk naik ke #' + (meR.rank - 1) : 'Jaga api check-in setiap hari!') : 'Kamu di puncak! Pertahankan!') + '</small></div>' +
        '<div class="me-num"><small>' + (ligaTab === 'xp' ? 'XP minggu ini' : 'Streak') + '</small><b>' + (ligaTab === 'xp' ? fmtN(meR.xpMinggu) : meR.streak + ' hari') + '</b></div><a class="btn btn-green btn-sm" href="#/misi">' + icon('swords', 'ic-xs') + 'Latihan</a></section>' +
        '<div class="liga-grid"><section class="card-stone liga-list">' + list.slice(3).map((x) => '<div class="lg-row ' + (x.id === b.profil.id ? 'me' : '') + '"><span class="rank">' + x.rank + '</span>' + avatarSvg(x.avatar, x.level, 40) +
          '<div class="lg-name"><b>' + esc(x.nama) + '</b><small>Lv.' + x.level + ' • ' + (x.hariIni ? '<span class="ok">Sudah check-in</span>' : 'Belum latihan hari ini') + '</small></div>' +
          '<span class="lg-streak">' + icon('flame', 'ic-xs') + x.streak + '</span><span class="lg-xp">' + fmtN(x.xpMinggu) + ' XP</span></div>').join('') +
        (list.length <= 3 ? '<p class="muted center">Ajak teman sekelas bergabung!</p>' : '') + '</section>' +
        '<aside>' + energiKomunal(b) + '<section class="card-green-soft"><b>' + icon('heart', 'ic-sm') + 'Belajar bersama, tumbuh bersama</b><p class="small">Peringkat tidak mengukur kepintaran, melainkan ketekunan dan keberanian mencoba setiap hari.</p></section></aside></div>';
      $$('.seg button', root).forEach((bt) => bt.onclick = () => { ligaTab = bt.dataset.t; this.render(); });
    }
  });

  // ================================================================ MULAI
  TQ.Murid = { refreshBoot, startMisi, Play, Pre };
  TQ.start();
})();
