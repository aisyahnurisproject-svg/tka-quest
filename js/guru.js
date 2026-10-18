/* =====================================================================
   TKA QUEST — guru.js (dimuat hanya setelah guru/admin masuk)
   Beranda Kelas, Daftar Murid & Progres, Kelola Bank Soal, Laporan & Ekspor, Pengaturan (+ migrasi).
   Semua data dibaca lewat SWR (cache perangkat) + prefetch batch saat idle.
   ===================================================================== */
'use strict';
(function () {
  const { $, $$, esc, rich, fmtN, fmtTgl, relTime, debounce, AppState, Store, userKey, api, apiQ, swr, cacheSet, cacheGet, cacheStale, toast, modal, confirmDlg, busy, errorBox, registerPage, go, idle } = TQ;

  const G = { kelas: '', hari: 7 };
  const boot = () => AppState.boot || {};
  const isAdmin = () => AppState.role === 'admin';
  const STATUS = { aman: ['Aman', 'ok'], perhatian: ['Perlu Perhatian', 'warn'], bantuan: ['Butuh Bantuan', 'bad'], belum: ['Belum Mulai', 'idle'] };
  const statusChip = (s) => '<span class="st-chip st-' + (STATUS[s] || STATUS.belum)[1] + '"><i></i>' + (STATUS[s] || STATUS.belum)[0] + '</span>';
  const domChip = (m) => '<span class="dom-chip ' + (m === 'Numerasi' ? 'num' : 'lit') + '">' + esc(m) + '</span>';
  const initials = (n) => String(n || '?').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const avInit = (n, s) => '<span class="av-init av-' + (s || 'idle') + '">' + esc(initials(n)) + '</span>';
  const pctTxt = (v) => (v === null || v === undefined ? '–' : v + '%');
  const kelasNama = () => ((boot().kelas || []).find((k) => k.id === G.kelas) || {}).nama || '';
  const thumb = (id, w) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 400);

  // ================================================================ SHELL
  const NAV = [['beranda', 'grid', 'Beranda Kelas'], ['murid', 'users', 'Daftar Murid & Progres'], ['soal', 'file-text', 'Kelola Bank Soal'], ['laporan', 'bar-chart', 'Laporan & Ekspor'], ['pengaturan', 'settings', 'Pengaturan']];
  TQ.Shells.guru = {
    home: 'beranda',
    mount(app) {
      document.body.className = 'role-guru';
      const b = boot();
      G.kelas = (b.kelas || []).some((k) => k.id === Store.get(userKey('g:kelas'), '')) ? Store.get(userKey('g:kelas'), '') : b.kelasAktif;
      if (b.dash && b.dash.kelas && b.dash.kelas.id === b.kelasAktif && !cacheGet('dash:' + b.kelasAktif + ':7')) cacheSet('dash:' + b.kelasAktif + ':7', b.dash);
      const logo = b.sekolah && b.sekolah.logo ? '<img src="' + thumb(b.sekolah.logo, 120) + '" alt="">' : icon('shield');
      app.innerHTML =
        '<div class="shell-guru"><aside class="g-side" id="g-side">' +
        '<div class="g-brand"><span class="g-logo">' + logo + '</span><div><b>TKA QUEST</b><small>' + esc((b.sekolah || {}).nama || 'Portal Guru') + '</small></div></div>' +
        '<label class="g-kelas"><span>' + icon('school', 'ic-sm') + 'Kelas</span><select id="g-kelas">' + (b.kelas || []).map((k) => '<option value="' + esc(k.id) + '"' + (k.id === G.kelas ? ' selected' : '') + '>Kelas ' + esc(k.nama) + '</option>').join('') + '</select>' +
        '<small>T.A. ' + esc((b.sekolah || {}).tahun || '') + ' • ' + esc((b.sekolah || {}).semester || '') + '</small></label>' +
        '<nav class="g-nav"><small class="g-nav-h">Menu utama</small>' + NAV.map((n) => '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + icon(n[1], 'ic-sm') + '<span>' + n[2] + '</span></a>').join('') + '</nav>' +
        '<div class="g-me"><span class="av-init av-me">' + esc(initials((b.me || {}).nama)) + '</span><div><b>' + esc((b.me || {}).nama || '') + '</b><small>' + (isAdmin() ? 'Admin sekolah' : 'Guru kelas') + '</small></div>' +
        '<button class="icon-btn" id="g-logout" title="Keluar" aria-label="Keluar">' + icon('log-out', 'ic-sm') + '</button></div></aside>' +
        '<div class="g-overlay" id="g-ov"></div>' +
        '<div class="g-body"><header class="g-top"><button class="icon-btn g-burger" id="g-burger" aria-label="Buka menu">' + icon('menu') + '</button>' +
        '<div class="g-crumb"><small>' + esc((b.sekolah || {}).nama || '') + ' / Kelas <span id="g-kls-name">' + esc(kelasNama()) + '</span></small><b id="g-title">Beranda</b></div>' +
        '<span class="g-sync" id="g-sync">' + icon('cloud', 'ic-xs') + 'Tersinkron</span>' +
        '<button class="g-btn g-btn-ghost g-btn-sm" id="g-refresh" title="Ambil data terbaru dari server">' + icon('refresh', 'ic-sm') + '<span class="hide-sm">Segarkan</span></button></header>' +
        '<main class="g-main" id="g-pages"></main></div></div>';
      $('#g-kelas').onchange = (e) => { G.kelas = e.target.value; Store.set(userKey('g:kelas'), G.kelas); $('#g-kls-name').textContent = kelasNama(); rerender(); };
      $('#g-logout').onclick = TQ.logout;
      $('#g-burger').onclick = () => document.body.classList.add('g-open');
      $('#g-ov').onclick = () => document.body.classList.remove('g-open');
      $('#g-refresh').onclick = () => { const d = TQ.Pages[AppState.page]; if (d && d.refresh) d.refresh(true); };
      idle(prefetch, 1800);
    },
    host: () => $('#g-pages'),
    setActive(name) {
      $$('.g-nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
      const n = NAV.find((x) => x[0] === name); if (n && $('#g-title')) $('#g-title').textContent = n[2];
      document.body.classList.remove('g-open');
    }
  };
  function rerender() { const d = TQ.Pages[AppState.page]; if (d && d.show) d.show(d.el); }
  function syncState(s) {
    const el = $('#g-sync'); if (!el) return;
    el.className = 'g-sync ' + (s || '');
    el.innerHTML = s === 'busy' ? '<span class="spinner spinner-xs"></span>Memuat…' : s === 'off' ? icon('cloud-off', 'ic-xs') + 'Offline' : icon('cloud', 'ic-xs') + 'Tersinkron';
  }
  /** Prefetch menu yang sering dibuka dalam 1 eksekusi (batch) saat idle */
  function prefetch() {
    const calls = [['soal', 'soalList', {}], ['arsip', 'arsipList', {}]];
    if (isAdmin()) calls.push(['admin', 'adminData', {}]);
    calls.forEach((c) => { if (cacheGet(c[0])) return; apiQ(c[1], c[2]).then((r) => { if (r && r.success) cacheSet(c[0], r.data); }); });
  }
  const dashKey = (k, h) => 'dash:' + k + ':' + h;
  async function loadDash(render, force, hari) {
    if (!G.kelas) { render(null); return; }
    syncState('busy');
    const r = await swr(dashKey(G.kelas, hari || G.hari), 'dashboard', { kelas: G.kelas, hari: hari || G.hari }, render, { fresh: 60000, force, q: true, onError: (e) => render(null, false, e) });
    syncState(r.success ? '' : (navigator.onLine === false ? 'off' : ''));
    if (!r.success && r.message && !r.cached) toast(r.message, 'error');
    return r;
  }
  const emptyKelas = () => '<div class="g-empty">' + icon('school') + '<h3>Belum ada kelas untuk akun ini</h3><p>Minta admin sekolah menautkan Anda sebagai wali kelas di Pengaturan → Kelas & Guru.</p></div>';
  const pageHead = (title, sub, actions) => '<div class="g-head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="g-actions">' + actions + '</div>' : '') + '</div>';
  const rangeSeg = (cur, opts) => '<div class="g-seg" role="group" aria-label="Rentang">' + (opts || [[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari']]).map((o) => '<button data-h="' + o[0] + '" class="' + (cur === o[0] ? 'active' : '') + '">' + o[1] + '</button>').join('') + '</div>';

  // ================================================================ BERANDA
  registerPage('beranda', {
    role: 'guru', title: 'Beranda Kelas',
    template: () => '<div class="g-page"></div>',
    show(el) { this.el = el; const root = $('.g-page', el); if (!G.kelas) { root.innerHTML = emptyKelas(); return; } loadDash((d, c, e) => this.render(d, e)); },
    refresh(force) { loadDash((d, c, e) => this.render(d, e), force); },
    render(d, err) {
      const root = $('.g-page', this.el);
      if (!d) { root.innerHTML = err ? errorBox(err.message, () => this.refresh(true)) : '<div class="g-skel"></div><div class="g-skel"></div>'; return; }
      const k = d.kpi, tot = Math.max(1, k.total);
      const pr = (n) => Math.round(n / tot * 100);
      const bantuan = d.murid.filter((m) => m.status === 'bantuan'), rajin = d.rajin.map((id) => d.murid.find((m) => m.id === id)).filter(Boolean);
      root.innerHTML = pageHead('Beranda Kelas ' + esc(d.kelas.nama), 'Ringkasan ' + (G.hari === 1 ? 'hari ini' : G.hari + ' hari terakhir') + ' • diperbarui ' + relTime(d.dibuat), rangeSeg(G.hari) + '<a class="g-btn g-btn-ghost" href="#/laporan">' + icon('download', 'ic-sm') + 'Laporan</a>') +
        '<div class="kpi-grid">' +
        kpi('Total murid aktif', k.total, 'Siswa', 'users', 'navy', '<span class="kpi-cap">' + icon('check-circle', 'ic-xs') + k.checkinHariIni + ' sudah check-in hari ini</span>') +
        kpi('Status aman', k.aman, 'Siswa', 'check-circle', 'ok', '<span class="kpi-cap ok">' + pr(k.aman) + '% • akurasi ≥ ' + boot().aturan.ambangAman + '%</span>') +
        kpi('Perlu perhatian', k.perhatian + k.belum, 'Siswa', 'alert-triangle', 'warn', '<span class="kpi-cap warn">' + k.belum + ' belum mulai • ' + k.perhatian + ' kurang stabil</span>') +
        kpi('Butuh bantuan', k.bantuan, 'Siswa', 'alert-circle', 'bad', '<span class="kpi-cap bad">Salah > ' + boot().aturan.ambangBantuan + '% dalam ' + boot().aturan.hariStatus + ' hari</span>') + '</div>' +
        '<div class="g-grid-2"><section class="g-card"><div class="g-card-h"><h2>' + icon('target', 'ic-sm') + 'Materi Paling Sering Salah</h2><span class="muted small">' + (d.materi.length ? 'Urut dari galat tertinggi' : '') + '</span></div>' +
        (d.materi.length ? '<ol class="mat-list">' + d.materi.slice(0, 5).map((m, i) => '<li><span class="mat-no">' + (i + 1) + '</span><div class="mat-txt"><b>' + esc(m.materi) + '</b><small>' + domChip(m.mapel) + ' ' + fmtN(m.n) + ' butir dikerjakan • ' + m.murid + ' murid</small></div>' +
          '<span class="err-pill ' + (m.persen > 50 ? 'bad' : m.persen >= 30 ? 'warn' : 'ok') + '">' + m.persen + '% galat</span><button class="g-btn g-btn-outline g-btn-xs" data-mat="' + esc(m.materi) + '">Lihat murid</button></li>').join('') + '</ol>'
          : '<div class="g-empty sm">' + icon('info') + '<p>Belum ada jawaban pada rentang ini. Data muncul setelah murid menyelesaikan misi.</p></div>') + '</section>' +
        '<section class="g-card"><div class="g-card-h"><h2>' + icon('bar-chart', 'ic-sm') + 'Literasi vs Numerasi</h2><span class="muted small">Akurasi 4 minggu</span></div>' +
        '<div class="dom-sum"><div><small>' + domChip('Literasi') + '</small><b>' + pctTxt(k.akurasiLit) + '</b></div><div><small>' + domChip('Numerasi') + '</small><b>' + pctTxt(k.akurasiNum) + '</b></div><div><small>Misi selesai</small><b>' + fmtN(k.misi) + '</b></div></div>' +
        trenChart(d.tren) + '<p class="muted small">' + domInsight(k) + '</p></section></div>' +
        '<div class="g-grid-3"><section class="g-card"><div class="g-card-h"><h2>' + icon('alert-circle', 'ic-sm') + 'Butuh Bantuan</h2><span class="st-chip st-bad"><i></i>' + bantuan.length + '</span></div>' +
        (bantuan.length ? bantuan.slice(0, 6).map((m) => muridRow(m)).join('') : '<p class="muted small">Tidak ada murid berstatus butuh bantuan. Pertahankan!</p>') + '</section>' +
        '<section class="g-card"><div class="g-card-h"><h2>' + icon('flame', 'ic-sm') + 'Paling Rajin Minggu Ini</h2></div>' + (rajin.length ? rajin.map((m) => muridRow(m, true)).join('') : '<p class="muted small">Belum ada aktivitas minggu ini.</p>') + '</section>' +
        '<section class="g-card"><div class="g-card-h"><h2>' + icon('message', 'ic-sm') + 'Pesan untuk Murid</h2></div><p class="muted small">Tampil di Basecamp dan layar hasil misi murid kelas ini.</p>' +
        '<textarea class="g-input" id="g-pesan" rows="4" maxlength="280" placeholder="Contoh: Hari ini fokus operasi pecahan campuran, ya!">' + esc(d.kelas.pesan || '') + '</textarea>' +
        '<div class="g-row-end"><small class="muted" id="g-pesan-n">' + (d.kelas.pesan || '').length + '/280</small><button class="g-btn g-btn-primary g-btn-sm" id="g-pesan-s">' + icon('send', 'ic-sm') + 'Simpan pesan</button></div></section></div>';
      $$('.g-seg button', root).forEach((b) => b.onclick = () => { G.hari = +b.dataset.h; this.show(this.el); });
      $$('[data-mat]', root).forEach((b) => b.onclick = () => { MuridUI.q = ''; MuridUI.materi = b.dataset.mat; go('murid'); });
      $$('.m-row', root).forEach((r) => r.onclick = () => openDetail(r.dataset.id));
      const ta = $('#g-pesan', root);
      ta.oninput = () => { $('#g-pesan-n', root).textContent = ta.value.length + '/280'; };
      $('#g-pesan-s', root).onclick = async (e) => {
        const btn = e.currentTarget; btn.disabled = true;
        const r = await api('kelasPesan', { kelas: G.kelas, pesan: ta.value.trim() });
        btn.disabled = false;
        toast(r.success ? 'Pesan tersimpan dan tampil di layar murid.' : r.message, r.success ? 'success' : 'error');
        if (r.success) { const kk = (boot().kelas || []).find((x) => x.id === G.kelas); if (kk) kk.pesan = r.data.pesan; cacheStale(dashKey(G.kelas, G.hari)); }
      };
    }
  });
  function kpi(label, val, unit, ic, tone, cap) {
    return '<div class="kpi kpi-' + tone + '"><div class="kpi-top"><span>' + label + '</span><span class="kpi-ic">' + icon(ic, 'ic-sm') + '</span></div><div class="kpi-val"><b>' + fmtN(val) + '</b><small>' + unit + '</small></div>' + cap + '</div>';
  }
  function muridRow(m, rajin) {
    return '<button class="m-row" data-id="' + esc(m.id) + '">' + avInit(m.nama, STATUS[m.status][1]) + '<span class="m-row-t"><b>' + esc(m.nama) + '</b><small>' +
      (rajin ? fmtN(m.xpMinggu) + ' XP minggu ini • streak ' + m.streak : (m.lemah[0] ? 'Lemah: ' + esc(m.lemah[0].materi) + ' (' + m.lemah[0].persen + '% salah)' : 'Akurasi ' + pctTxt(m.akurasi))) + '</small></span>' + icon('chevron-right', 'ic-sm') + '</button>';
  }
  function domInsight(k) {
    if (k.akurasiLit === null && k.akurasiNum === null) return 'Belum ada data pada rentang ini.';
    if (k.akurasiLit === null || k.akurasiNum === null) return 'Data baru tersedia untuk satu domain.';
    const d = k.akurasiLit - k.akurasiNum;
    if (Math.abs(d) < 5) return 'Penguasaan Literasi dan Numerasi seimbang.';
    return 'Kelas lebih lemah di ' + (d > 0 ? 'Numerasi' : 'Literasi') + ' (selisih ' + Math.abs(d) + ' poin). Prioritaskan latihan domain ini.';
  }
  /** Grafik batang berkelompok (SVG ringan, tanpa pustaka chart) */
  function trenChart(tren) {
    const W = 360, H = 180, base = 150, top = 16, gw = W / tren.length;
    let s = '<svg class="tren-svg" viewBox="0 0 ' + W + ' ' + (H + 10) + '" role="img" aria-label="Grafik akurasi Literasi dan Numerasi per minggu">';
    [0, 50, 100].forEach((v) => { const y = base - (base - top) * v / 100; s += '<line x1="28" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="0" y="' + (y + 4) + '" class="ax">' + v + '%</text>'; });
    tren.forEach((t, i) => {
      const x0 = 34 + i * ((W - 34) / tren.length), bw = 22;
      [['lit', t.lit], ['num', t.num]].forEach((b, j) => {
        const v = b[1], h = v === null ? 0 : (base - top) * v / 100, x = x0 + 14 + j * (bw + 6);
        s += v === null ? '<rect x="' + x + '" y="' + (base - 3) + '" width="' + bw + '" height="3" class="bar-none"/>' : '<rect x="' + x + '" y="' + (base - h) + '" width="' + bw + '" height="' + h + '" rx="4" class="bar-' + b[0] + '"><title>' + (b[0] === 'lit' ? 'Literasi' : 'Numerasi') + ' ' + v + '%</title></rect><text x="' + (x + bw / 2) + '" y="' + (base - h - 4) + '" class="val">' + v + '</text>';
      });
      s += '<text x="' + (x0 + 14 + bw + 3) + '" y="' + (base + 18) + '" class="lbl">' + esc(t.label) + '</text>';
    });
    return s + '</svg><div class="legend-g"><span><i class="lg-lit"></i>Literasi</span><span><i class="lg-num"></i>Numerasi</span></div>';
  }

  // ================================================================ DAFTAR MURID
  const MuridUI = { q: '', status: '', materi: '', quick: '', sort: 'bantuan', page: 1, sel: new Set() };
  registerPage('murid', {
    role: 'guru', title: 'Daftar Murid & Progres',
    template: () => '<div class="g-page"></div>',
    show(el) { this.el = el; if (!G.kelas) { $('.g-page', el).innerHTML = emptyKelas(); return; } loadDash((d, c, e) => this.render(d, e)); },
    refresh(force) { loadDash((d, c, e) => this.render(d, e), force); },
    render(d, err) {
      const root = $('.g-page', this.el);
      if (!d) { root.innerHTML = err ? errorBox(err.message, () => this.refresh(true)) : '<div class="g-skel"></div>'; return; }
      this.d = d;
      const k = d.kpi;
      if (!root.querySelector('.mt-wrap')) {
        root.innerHTML = pageHead('Daftar Murid & Progres (Kelas ' + esc(d.kelas.nama) + ')', 'Pantau penguasaan literasi & numerasi, temukan yang butuh bantuan, dan kelola akun login PIN.',
          '<button class="g-btn g-btn-ghost" id="mt-csv">' + icon('download', 'ic-sm') + 'Ekspor CSV</button><button class="g-btn g-btn-ghost" id="mt-card">' + icon('printer', 'ic-sm') + 'Cetak Kartu Login</button><button class="g-btn g-btn-primary" id="mt-add">' + icon('plus', 'ic-sm') + 'Tambah Murid</button>') +
          '<div class="kpi-grid kpi-sm" id="mt-kpi"></div>' +
          '<div class="g-card mt-tools"><div class="search-box">' + icon('search', 'ic-sm') + '<input id="mt-q" placeholder="Cari nama, username, atau NISN…" aria-label="Cari murid"></div>' +
          '<select class="g-input g-select" id="mt-st" aria-label="Filter status"><option value="">Semua status</option><option value="bantuan">Butuh bantuan</option><option value="perhatian">Perlu perhatian</option><option value="aman">Aman</option><option value="belum">Belum mulai</option></select>' +
          '<select class="g-input g-select" id="mt-sort" aria-label="Urutkan"><option value="bantuan">Urut: butuh bantuan teratas</option><option value="nama">Urut: nama A–Z</option><option value="xp">Urut: XP tertinggi</option><option value="streak">Urut: streak terpanjang</option></select>' +
          '<div class="quick" id="mt-quick"></div></div><div class="mt-wrap"></div><div class="sel-bar" id="mt-sel" hidden></div>';
        const q = $('#mt-q', root); q.value = MuridUI.q;
        q.oninput = debounce(() => { MuridUI.q = q.value.trim().toLowerCase(); MuridUI.page = 1; this.table(); }, 250);
        $('#mt-st', root).onchange = (e) => { MuridUI.status = e.target.value; MuridUI.page = 1; this.table(); };
        $('#mt-sort', root).onchange = (e) => { MuridUI.sort = e.target.value; this.table(); };
        $('#mt-add', root).onclick = tambahMurid;
        $('#mt-card', root).onclick = () => cetakKartuPilih(this.d);
        $('#mt-csv', root).onclick = () => eksporCsvMurid(this.d);
      }
      $('#mt-st', root).value = MuridUI.status; $('#mt-sort', root).value = MuridUI.sort;
      $('#mt-kpi', root).innerHTML = [['', 'Total murid', k.total, 'navy'], ['aman', 'Aman', k.aman, 'ok'], ['perhatian', 'Perlu perhatian', k.perhatian, 'warn'], ['bantuan', 'Butuh bantuan', k.bantuan, 'bad'], ['belum', 'Belum mulai', k.belum, 'idle']]
        .map((x) => '<button class="kpi-mini kpi-' + x[3] + (MuridUI.status === x[0] ? ' on' : '') + '" data-st="' + x[0] + '"><small>' + x[1] + '</small><b>' + x[2] + '</b></button>').join('');
      $$('#mt-kpi button', root).forEach((b) => b.onclick = () => { MuridUI.status = b.dataset.st; MuridUI.page = 1; this.render(this.d); });
      const blm = d.murid.filter((m) => !m.sudahCheckin).length, lk = d.murid.filter((m) => m.terkunci).length;
      $('#mt-quick', root).innerHTML = '<small>Tampilan cepat:</small>' + [['', 'Semua (' + d.murid.length + ')'], ['belumck', 'Belum check-in hari ini (' + blm + ')'], ['kunci', 'PIN terkunci (' + lk + ')']]
        .map((x) => '<button class="pill ' + (MuridUI.quick === x[0] ? 'on' : '') + '" data-q="' + x[0] + '">' + x[1] + '</button>').join('') + (MuridUI.materi ? '<button class="pill on" data-clear-mat>Materi: ' + esc(MuridUI.materi) + ' ✕</button>' : '');
      $$('#mt-quick [data-q]', root).forEach((b) => b.onclick = () => { MuridUI.quick = b.dataset.q; MuridUI.page = 1; this.render(this.d); });
      const cm = $('[data-clear-mat]', root); if (cm) cm.onclick = () => { MuridUI.materi = ''; this.render(this.d); };
      this.table();
    },
    filtered() {
      const d = this.d, U = MuridUI, order = { bantuan: 0, perhatian: 1, belum: 2, aman: 3 };
      let l = d.murid.filter((m) => (!U.status || m.status === U.status) && (!U.quick || (U.quick === 'belumck' ? !m.sudahCheckin : m.terkunci)) &&
        (!U.q || (m.nama + ' ' + m.username + ' ' + m.nisn).toLowerCase().indexOf(U.q) > -1) && (!U.materi || m.lemah.some((x) => x.materi === U.materi)));
      const s = { bantuan: (a, b) => order[a.status] - order[b.status] || a.nama.localeCompare(b.nama), nama: (a, b) => a.nama.localeCompare(b.nama), xp: (a, b) => b.xp - a.xp, streak: (a, b) => b.streak - a.streak }[U.sort];
      return l.sort(s);
    },
    table() {
      const root = $('.g-page', this.el), wrap = $('.mt-wrap', root); if (!wrap) return;
      const l = this.filtered(), per = 15, pages = Math.max(1, Math.ceil(l.length / per));
      MuridUI.page = Math.min(MuridUI.page, pages);
      const rows = l.slice((MuridUI.page - 1) * per, MuridUI.page * per);
      const bar = (v, c) => '<div class="mbar"><div class="mbar-t"><i class="' + c + '" style="width:' + (v || 0) + '%"></i></div><small>' + pctTxt(v) + '</small></div>';
      wrap.innerHTML = '<div class="g-card g-table-card"><div class="g-table-scroll"><table class="g-table"><thead><tr><th class="th-cb"><input type="checkbox" id="mt-all" aria-label="Pilih semua"></th><th>Siswa</th><th>Status</th><th>Literasi</th><th>Numerasi</th><th>Level & XP</th><th>Streak & misi</th><th>Terakhir aktif</th></tr></thead><tbody>' +
        (rows.length ? rows.map((m) => '<tr data-id="' + esc(m.id) + '" class="' + (MuridUI.sel.has(m.id) ? 'sel' : '') + '"><td class="th-cb"><input type="checkbox" data-cb="' + esc(m.id) + '"' + (MuridUI.sel.has(m.id) ? ' checked' : '') + ' aria-label="Pilih ' + esc(m.nama) + '"></td>' +
          '<td data-l="Siswa"><div class="who">' + avInit(m.nama, STATUS[m.status][1]) + '<div><b>' + esc(m.nama) + (m.terkunci ? ' <span class="lock-ic" title="PIN terkunci">' + icon('lock', 'ic-xs') + '</span>' : '') + '</b><small>@' + esc(m.username) + (m.nisn ? ' • NISN ' + esc(m.nisn) : '') + '</small></div></div></td>' +
          '<td data-l="Status">' + statusChip(m.status) + '</td><td data-l="Literasi">' + bar(m.lit, 'lit') + '</td><td data-l="Numerasi">' + bar(m.num, 'num') + '</td>' +
          '<td data-l="Level & XP"><b>Level ' + m.level + '</b><small class="d">' + fmtN(m.xp) + ' XP</small></td>' +
          '<td data-l="Streak & misi"><b class="' + (m.streak ? 'flame' : 'muted') + '">' + icon('flame', 'ic-xs') + m.streak + ' hari</b><small class="d">' + m.misiRentang + ' misi (' + G.hari + ' hr)</small></td>' +
          '<td data-l="Terakhir aktif">' + (m.sudahCheckin ? '<span class="ok-t">Hari ini</span>' : m.terakhirCheckin ? fmtTgl(m.terakhirCheckin) : '<span class="muted">Belum pernah</span>') + '</td></tr>').join('')
          : '<tr><td colspan="8" class="td-empty">Tidak ada murid yang cocok dengan filter.</td></tr>') + '</tbody></table></div>' +
        '<div class="g-pager"><small>Menampilkan ' + (l.length ? (MuridUI.page - 1) * per + 1 : 0) + '–' + Math.min(l.length, MuridUI.page * per) + ' dari ' + l.length + ' murid</small><div>' +
        Array.from({ length: pages }, (_, i) => '<button class="' + (i + 1 === MuridUI.page ? 'on' : '') + '" data-p="' + (i + 1) + '">' + (i + 1) + '</button>').join('') + '</div></div></div>';
      $$('tbody tr[data-id]', wrap).forEach((tr) => tr.onclick = (e) => { if (e.target.closest('input')) return; openDetail(tr.dataset.id); });
      $$('[data-cb]', wrap).forEach((cb) => cb.onchange = () => { cb.checked ? MuridUI.sel.add(cb.dataset.cb) : MuridUI.sel.delete(cb.dataset.cb); cb.closest('tr').classList.toggle('sel', cb.checked); this.selBar(); });
      $('#mt-all', wrap).onchange = (e) => { rows.forEach((m) => e.target.checked ? MuridUI.sel.add(m.id) : MuridUI.sel.delete(m.id)); this.table(); };
      $$('[data-p]', wrap).forEach((b) => b.onclick = () => { MuridUI.page = +b.dataset.p; this.table(); });
      this.selBar();
    },
    selBar() {
      const bar = $('#mt-sel', this.el); if (!bar) return;
      const n = MuridUI.sel.size; bar.hidden = !n;
      bar.innerHTML = '<span class="sel-n">' + n + '</span><span>murid dipilih</span><button class="g-btn g-btn-light g-btn-sm" id="sel-pin">' + icon('printer', 'ic-sm') + 'Reset PIN & cetak kartu</button><button class="g-btn g-btn-light g-btn-sm" id="sel-x">Batal</button>';
      if (!n) return;
      $('#sel-x', bar).onclick = () => { MuridUI.sel.clear(); this.table(); };
      $('#sel-pin', bar).onclick = () => resetPinFlow(Array.from(MuridUI.sel));
    }
  });

  // ---- detail murid (panel samping)
  async function openDetail(id) {
    const d = cacheGet(dashKey(G.kelas, G.hari)) || {};
    const m = (d.murid || []).find((x) => x.id === id) || { id, nama: '…', status: 'belum', lemah: [] };
    const dlg = modal({ title: 'Detail murid', size: 'lg', cls: 'g-drawer', body: '<div id="md-body">' + detailHtml(m, null) + '</div>' });
    const r = await swr('md:' + id, 'muridDetail', { id }, (det) => { const b = $('#md-body', dlg.el); if (b) { b.innerHTML = detailHtml(m, det); bindDetail(dlg, m, det); } }, { fresh: 60000 });
    if (!r.success && !r.cached) { const b = $('#md-body', dlg.el); if (b) b.innerHTML = errorBox(r.message, () => { dlg.close(); openDetail(id); }); }
  }
  function detailHtml(m, det) {
    const p = det ? det.profil : null;
    const lemah = det ? det.materi.filter((x) => x.persen > 0).slice(0, 3) : m.lemah;
    const days = [];
    for (let i = 20; i >= 0; i--) days.push(new Date(Date.now() + 7 * 3600e3 - i * 864e5).toISOString().slice(0, 10));
    return '<div class="md-head">' + (p ? avatarSvg(p.avatar, p.level, 64) : avInit(m.nama, STATUS[m.status][1])) + '<div><h3>' + esc(m.nama) + '</h3><small>@' + esc(m.username || '') + (m.nisn ? ' • NISN ' + esc(m.nisn) : '') + '</small><div>' + statusChip(m.status) + (det && !det.aktif ? ' <span class="st-chip st-idle"><i></i>Nonaktif</span>' : '') + '</div></div></div>' +
      '<div class="md-pin ' + (det && det.terkunci ? 'locked' : '') + '">' + icon('key', 'ic-sm') + '<div><small>PIN login murid</small><b>' + (det && det.terkunci ? 'Terkunci (5× salah)' : '•••• tersimpan aman') + '</b></div>' +
      (det && det.terkunci ? '<button class="g-btn g-btn-primary g-btn-sm" id="md-unlock">' + icon('unlock', 'ic-sm') + 'Buka kunci</button>' : '') + '<button class="g-btn g-btn-outline g-btn-sm" id="md-pin">' + icon('refresh', 'ic-sm') + 'Reset PIN</button></div>' +
      (m.status === 'bantuan' ? '<div class="md-alert">' + icon('flag', 'ic-sm') + '<div><b>Butuh pendampingan remedial</b><p>Salah lebih dari ' + boot().aturan.ambangBantuan + '% dalam ' + boot().aturan.hariStatus + ' hari terakhir.' + (lemah[0] ? ' Fokuskan pada ' + esc(lemah[0].materi) + '.' : '') + '</p></div></div>' : '') +
      '<div class="md-grid"><div><h4>Keseimbangan kompetensi (' + G.hari + ' hari)</h4>' +
      '<div class="md-bar"><span>' + domChip('Literasi') + '</span><b>' + pctTxt(m.lit) + '</b></div><div class="mbar-t big"><i class="lit" style="width:' + (m.lit || 0) + '%"></i></div>' +
      '<div class="md-bar"><span>' + domChip('Numerasi') + '</span><b>' + pctTxt(m.num) + '</b></div><div class="mbar-t big"><i class="num" style="width:' + (m.num || 0) + '%"></i></div>' +
      '<h4>Materi paling sering salah (30 hari)</h4>' + (lemah.length ? lemah.map((x, i) => '<div class="md-mat"><span class="mat-no">' + (i + 1) + '</span><div><b>' + esc(x.materi) + '</b><small>' + x.n + ' butir dikerjakan</small></div><span class="err-pill ' + (x.persen > 50 ? 'bad' : 'warn') + '">' + x.persen + '% galat</span></div>').join('') : '<p class="muted small">Belum ada materi bermasalah.</p>') + '</div>' +
      '<div><h4>Statistik</h4><div class="md-stats"><div><b>' + (p ? p.level : m.level || '–') + '</b><small>Level</small></div><div><b>' + fmtN(p ? p.xp : m.xp) + '</b><small>XP</small></div><div><b>' + (p ? p.streak : m.streak || 0) + '</b><small>Streak</small></div><div><b>' + fmtN(p ? p.misiTotal : m.misiTotal) + '</b><small>Total misi</small></div></div>' +
      '<h4>Misi terakhir</h4>' + (det ? (det.misi.length ? '<div class="md-misi">' + det.misi.slice(0, 8).map((x) => { const s = Math.round(x.benar / x.total * 100); return '<span class="' + (s >= 75 ? 'ok' : s >= 50 ? 'warn' : 'bad') + '" title="' + fmtTgl(x.waktu) + ' ' + x.benar + '/' + x.total + '">' + x.benar + '/' + x.total + '</span>'; }).join('') + '</div>' : '<p class="muted small">Belum ada misi.</p>') : '<div class="g-skel sm"></div>') +
      '<h4>Kehadiran 21 hari</h4><div class="md-cal">' + days.map((dd) => '<i class="' + (det && det.hadir.indexOf(dd) > -1 ? 'on' : '') + '" title="' + fmtTgl(dd) + '"></i>').join('') + '</div></div></div>' +
      '<div class="md-actions"><button class="g-btn g-btn-primary" id="md-rapor">' + icon('file-text', 'ic-sm') + 'Rapor mini (PDF)</button><button class="g-btn g-btn-ghost" id="md-edit">' + icon('edit', 'ic-sm') + 'Ubah data</button>' +
      (det ? '<button class="g-btn g-btn-ghost danger" id="md-off">' + icon(det.aktif ? 'lock' : 'unlock', 'ic-sm') + (det.aktif ? 'Nonaktifkan akun' : 'Aktifkan lagi') + '</button>' : '') + '</div>';
  }
  function bindDetail(dlg, m, det) {
    const el = dlg.el;
    const u = $('#md-unlock', el); if (u) u.onclick = async () => { const r = await api('bukaKunci', { id: m.id }); toast(r.success ? 'PIN dibuka. Murid bisa mencoba masuk lagi.' : r.message, r.success ? 'success' : 'error'); if (r.success) { cacheStale('md:' + m.id); cacheStale(dashKey(G.kelas, G.hari)); dlg.close(); rerender(); } };
    $('#md-pin', el).onclick = () => { dlg.close(); resetPinFlow([m.id]); };
    $('#md-rapor', el).onclick = () => { dlg.close(); Lap.preset = { jenis: 'rapor', murid: m.id }; go('laporan'); };
    $('#md-edit', el).onclick = () => editMurid(m, det, dlg);
    const off = $('#md-off', el); if (off) off.onclick = async () => {
      const aktif = !det.aktif;
      if (!aktif && !(await confirmDlg('Nonaktifkan akun ' + m.nama + '?', 'Murid tidak bisa masuk dan tidak muncul di daftar kelas. Data progres tetap tersimpan dan bisa diaktifkan lagi oleh admin.', 'Nonaktifkan', true))) return;
      const r = await api('muridUbah', { id: m.id, aktif });
      toast(r.success ? 'Status akun diperbarui.' : r.message, r.success ? 'success' : 'error');
      if (r.success) { cacheStale('md:' + m.id); dlg.close(); loadDash((d) => TQ.Pages.murid.render && AppState.page === 'murid' ? TQ.Pages.murid.render(d) : rerender(), true); }
    };
  }
  function editMurid(m, det, parent) {
    modal({ title: 'Ubah data ' + m.nama, size: 'sm', body: '<label class="g-field"><span>Nama lengkap</span><input class="g-input" id="em-n" value="' + esc(m.nama) + '" maxlength="60"></label><label class="g-field"><span>NISN</span><input class="g-input" id="em-s" value="' + esc(m.nisn || '') + '" inputmode="numeric" maxlength="12"></label>',
      actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'g-btn g-btn-primary', onClick: async (dlg) => {
        const r = await api('muridUbah', { id: m.id, nama: $('#em-n', dlg.el).value, nisn: $('#em-s', dlg.el).value });
        if (!r.success) { toast(r.message, 'error'); return false; }
        toast('Data murid disimpan.', 'success'); parent.close(); cacheStale('md:' + m.id); loadDash((d) => { if (AppState.page === 'murid') TQ.Pages.murid.render(d); }, true);
      } }] });
  }

  // ---- tambah murid, reset PIN, kartu login
  function tambahMurid() {
    modal({ title: 'Tambah murid ke Kelas ' + kelasNama(), size: 'lg', body:
      '<p class="muted small">Tulis satu murid per baris. NISN opsional, dipisah koma. Username dan PIN 4 angka dibuat otomatis lalu <b>ditampilkan sekali</b> untuk dicetak sebagai kartu login.</p>' +
      '<textarea class="g-input mono" id="tm-list" rows="9" placeholder="Budi Santoso, 0012398120&#10;Siti Aisyah, 0012398121&#10;Ahmad Fauzi"></textarea><small class="muted" id="tm-n">0 murid</small>',
      onOpen: (el) => { const t = $('#tm-list', el); t.oninput = () => { $('#tm-n', el).textContent = parseList(t.value).length + ' murid'; }; },
      actions: [{ label: 'Batal' }, { label: 'Buat akun', cls: 'g-btn g-btn-primary', icon: 'plus', onClick: async (dlg, btn) => {
        const list = parseList($('#tm-list', dlg.el).value);
        if (!list.length) { toast('Tulis minimal satu nama.', 'warn'); return false; }
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-xs"></span>Membuat…';
        const r = await api('muridTambah', { kelas: G.kelas, list });
        if (!r.success) { toast(r.message, 'error'); btn.disabled = false; btn.textContent = 'Buat akun'; return false; }
        cacheStale(dashKey(G.kelas, G.hari));
        loadDash((d) => { if (AppState.page === 'murid') TQ.Pages.murid.render(d); }, true);
        setTimeout(() => tampilAkun(r.data.akun, 'Akun murid berhasil dibuat'), 220);
      } }] });
  }
  function parseList(t) { return t.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const p = x.split(/[,;\t]/); return { nama: p[0].trim(), nisn: (p[1] || '').trim() }; }).filter((x) => x.nama.length >= 2); }
  async function resetPinFlow(ids) {
    if (!(await confirmDlg('Buat PIN baru untuk ' + ids.length + ' murid?', 'PIN lama langsung tidak berlaku dan murid perlu masuk ulang. PIN baru ditampilkan sekali untuk dicetak.', 'Buat PIN baru'))) return;
    busy(true, 'Membuat PIN baru…');
    const r = await api('resetPin', { ids });
    busy(false);
    if (!r.success) { toast(r.message, 'error'); return; }
    MuridUI.sel.clear();
    cacheStale(dashKey(G.kelas, G.hari));
    ids.forEach((id) => cacheStale('md:' + id));
    if (AppState.page === 'murid') TQ.Pages.murid.refresh(true);
    tampilAkun(r.data.akun, 'PIN baru siap dibagikan');
  }
  function cetakKartuPilih(d) {
    const ids = MuridUI.sel.size ? Array.from(MuridUI.sel) : d.murid.map((m) => m.id);
    if (!ids.length) { toast('Belum ada murid di kelas ini.', 'warn'); return; }
    if (!MuridUI.sel.size) toast('Tidak ada yang dipilih, semua murid kelas ini akan dibuatkan kartu.', 'info');
    resetPinFlow(ids);
  }
  function tampilAkun(akun, title) {
    modal({ title, size: 'lg', body: '<p class="note-info">' + icon('info', 'ic-sm') + 'Demi keamanan, PIN hanya ditampilkan sekarang. Cetak atau salin sebelum menutup jendela ini.</p>' +
      '<div class="g-table-scroll"><table class="g-table compact"><thead><tr><th>Nama</th><th>Kelas</th><th>Username</th><th>PIN</th></tr></thead><tbody>' +
      akun.map((a) => '<tr><td>' + esc(a.nama) + '</td><td>' + esc(a.kelas) + '</td><td class="mono">' + esc(a.username) + '</td><td class="mono pin-big">' + esc(a.pin) + '</td></tr>').join('') + '</tbody></table></div>',
      actions: [{ label: 'Salin teks', icon: 'copy', cls: 'g-btn g-btn-ghost', close: false, onClick: () => { navigator.clipboard.writeText(akun.map((a) => a.nama + '\t' + a.username + '\t' + a.pin).join('\n')).then(() => toast('Tersalin.', 'success', 1500)); } },
        { label: 'Cetak kartu login', icon: 'printer', cls: 'g-btn g-btn-primary', close: false, onClick: () => cetakKartu(akun) }] });
  }
  function printHtml(html) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 350);
  }
  function cetakKartu(akun) {
    const s = boot().sekolah || {}, url = s.appUrl || location.origin + location.pathname;
    printHtml('<html><head><title>Kartu Login TKA QUEST</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;margin:0}.g{display:grid;grid-template-columns:1fr 1fr;gap:6mm}' +
      '.c{border:2px dashed #2E384D;border-radius:10px;padding:10px 12px;break-inside:avoid;background:#FEF9C3}.h{display:flex;justify-content:space-between;font-size:11px;color:#166534;font-weight:bold}' +
      '.n{font-size:16px;font-weight:bold;margin:6px 0 2px}.r{display:flex;gap:10px;margin-top:6px}.b{flex:1;background:#fff;border:2px solid #2E384D;border-radius:8px;padding:5px 8px}.b small{display:block;font-size:9px;color:#64748B}.b b{font-size:18px;font-family:monospace;letter-spacing:1px}.u{font-size:9px;color:#475569;margin-top:6px;word-break:break-all}</style></head><body><div class="g">' +
      akun.map((a) => '<div class="c"><div class="h"><span>🛡️ TKA QUEST</span><span>' + esc(s.nama || '') + '</span></div><div class="n">' + esc(a.nama) + '</div><div style="font-size:11px">Kelas ' + esc(a.kelas) + '</div><div class="r"><div class="b"><small>USERNAME</small><b>' + esc(a.username) + '</b></div><div class="b" style="flex:.6"><small>PIN</small><b>' + esc(a.pin) + '</b></div></div><div class="u">Buka: ' + esc(url) + ' • Jangan berikan PIN ke orang lain.</div></div>').join('') + '</div></body></html>');
  }
  function eksporCsvMurid(d) {
    const head = ['Nama', 'NISN', 'Username', 'Status', 'Level', 'XP', 'Streak', 'Misi (' + G.hari + ' hari)', 'Akurasi %', 'Literasi %', 'Numerasi %', 'Terakhir check-in', 'Materi lemah'];
    const rows = d.murid.map((m) => [m.nama, m.nisn, m.username, STATUS[m.status][0], m.level, m.xp, m.streak, m.misiRentang, m.akurasi, m.lit, m.num, m.terakhirCheckin, m.lemah.map((x) => x.materi).join('; ')]);
    downloadCsv('Murid Kelas ' + d.kelas.nama + ' ' + TQ.todayKey() + '.csv', [head].concat(rows));
  }
  function downloadCsv(name, rows) {
    const csv = '\ufeff' + rows.map((r) => r.map((v) => { const s = v === null || v === undefined ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name);
  }
  function downloadBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ================================================================ BANK SOAL
  const SoalUI = { mapel: '', wil: '', tingkat: '', status: 'aktif', q: '', page: 1 };
  registerPage('soal', {
    role: 'guru', title: 'Kelola Bank Soal',
    template: () => '<div class="g-page"></div>',
    show(el) { this.el = el; this.load(); },
    refresh(force) { this.load(force); },
    async load(force) {
      syncState('busy');
      const r = await swr('soal', 'soalList', {}, (d) => { this.list = d.soal; this.render(); }, { fresh: 120000, force, q: true, onError: (e) => { $('.g-page', this.el).innerHTML = errorBox(e.message, () => this.load(true)); } });
      syncState('');
      if (G.kelas && !cacheGet(dashKey(G.kelas, 30))) loadDash(() => { if (this.list) this.render(); }, false, 30);
      return r;
    },
    render() {
      const root = $('.g-page', this.el), L = this.list || [], W = boot().wilayah || [];
      const aktif = L.filter((q) => q.aktif), lit = aktif.filter((q) => q.mapel === 'Literasi').length;
      const t = { Mudah: 0, Sedang: 0, Sulit: 0 }; aktif.forEach((q) => { t[q.tingkat]++; });
      const dash30 = cacheGet(dashKey(G.kelas, 30)), matMap = {};
      (dash30 ? dash30.materi : []).forEach((m) => { matMap[m.mapel + '|' + m.materi] = m; });
      const prior = dash30 ? dash30.materi.filter((m) => m.persen > 50) : [];
      if (!root.querySelector('.sl-list')) {
        root.innerHTML = pageHead('Kelola Bank Soal TKA', 'Tambah, ubah, dan kurasi butir soal Literasi & Numerasi untuk 6 wilayah petualangan.',
          (isAdmin() ? '<button class="g-btn g-btn-ghost" id="sl-csv">' + icon('upload', 'ic-sm') + 'Impor CSV</button>' : '') + '<button class="g-btn g-btn-primary" id="sl-add">' + icon('plus', 'ic-sm') + 'Tambah Butir Soal</button>') +
          '<div class="kpi-grid" id="sl-kpi"></div><div class="g-card sl-tools"></div><div class="sl-list"></div>';
        $('#sl-add', root).onclick = () => soalForm(null);
        const c = $('#sl-csv', root); if (c) c.onclick = () => csvImporter('soal');
      }
      $('#sl-kpi', root).innerHTML = kpi('Total soal aktif', aktif.length, 'butir', 'file-text', 'navy', '<span class="kpi-cap">' + domChip('Literasi') + ' ' + lit + ' &nbsp;' + domChip('Numerasi') + ' ' + (aktif.length - lit) + '</span>') +
        '<div class="kpi kpi-navy"><div class="kpi-top"><span>Distribusi kesulitan</span><span class="kpi-ic">' + icon('activity', 'ic-sm') + '</span></div><div class="dist">' +
        ['Mudah', 'Sedang', 'Sulit'].map((x) => '<i class="d-' + x.toLowerCase() + '" style="flex:' + (t[x] || 0.001) + '"></i>').join('') + '</div><div class="dist-l">' + ['Mudah', 'Sedang', 'Sulit'].map((x) => '<span>' + x + ': <b>' + t[x] + '</b></span>').join('') + '</div></div>' +
        kpi('Materi prioritas remedial', prior.length, 'materi', 'alert-circle', 'bad', '<span class="kpi-cap bad">' + (prior[0] ? 'Teratas: ' + esc(prior[0].materi) : 'Galat > 50% (30 hari)') + '</span>') +
        kpi('Soal bergambar', aktif.filter((q) => q.gambar).length, 'butir', 'image', 'ok', '<span class="kpi-cap">Tersimpan di Google Drive</span>');
      $('.sl-tools', root).innerHTML = '<div class="g-seg">' + [['', 'Semua mapel'], ['Literasi', 'Literasi'], ['Numerasi', 'Numerasi']].map((x) => '<button data-m="' + x[0] + '" class="' + (SoalUI.mapel === x[0] ? 'active' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
        '<div class="search-box">' + icon('search', 'ic-sm') + '<input id="sl-q" placeholder="Cari teks soal, materi, atau ID…" value="' + esc(SoalUI.q) + '"></div>' +
        '<select class="g-input g-select" id="sl-t"><option value="">Semua tingkat</option><option>Mudah</option><option>Sedang</option><option>Sulit</option></select>' +
        '<select class="g-input g-select" id="sl-s"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option><option value="">Semua status</option></select>' +
        '<div class="quick"><small>Wilayah:</small><button class="pill ' + (!SoalUI.wil ? 'on' : '') + '" data-w="">Semua (' + W.length + ')</button>' + W.map((w, i) => '<button class="pill ' + (SoalUI.wil === w.id ? 'on' : '') + '" data-w="' + w.id + '">W' + (i + 1) + ': ' + esc(w.nama) + '</button>').join('') + '</div>';
      $('#sl-t', root).value = SoalUI.tingkat; $('#sl-s', root).value = SoalUI.status;
      $$('.sl-tools [data-m]', root).forEach((b) => b.onclick = () => { SoalUI.mapel = b.dataset.m; SoalUI.page = 1; this.render(); });
      $$('.sl-tools [data-w]', root).forEach((b) => b.onclick = () => { SoalUI.wil = b.dataset.w; SoalUI.page = 1; this.render(); });
      $('#sl-t', root).onchange = (e) => { SoalUI.tingkat = e.target.value; SoalUI.page = 1; this.renderList(matMap); };
      $('#sl-s', root).onchange = (e) => { SoalUI.status = e.target.value; SoalUI.page = 1; this.renderList(matMap); };
      $('#sl-q', root).oninput = debounce((e) => { SoalUI.q = e.target.value.trim().toLowerCase(); SoalUI.page = 1; this.renderList(matMap); }, 250);
      this.renderList(matMap);
    },
    renderList(matMap) {
      const root = $('.g-page', this.el), W = boot().wilayah || [], U = SoalUI;
      const l = (this.list || []).filter((q) => (!U.mapel || q.mapel === U.mapel) && (!U.wil || q.wilayah === U.wil) && (!U.tingkat || q.tingkat === U.tingkat) &&
        (!U.status || (U.status === 'aktif') === q.aktif) && (!U.q || (q.id + ' ' + q.teks + ' ' + q.materi + ' ' + q.stimulus).toLowerCase().indexOf(U.q) > -1))
        .sort((a, b) => (b.diperbarui || '').localeCompare(a.diperbarui || ''));
      const per = 10, pages = Math.max(1, Math.ceil(l.length / per)); U.page = Math.min(U.page, pages);
      const rows = l.slice((U.page - 1) * per, U.page * per);
      const wn = (id) => { const i = W.findIndex((w) => w.id === id); return i < 0 ? id : 'Wilayah ' + (i + 1) + ' • ' + W[i].nama; };
      $('.sl-list', root).innerHTML = '<div class="g-card"><div class="g-card-h"><h2>Daftar butir soal <span class="count">' + l.length + '</span></h2></div>' +
        (rows.length ? rows.map((q) => {
          const mm = matMap[q.mapel + '|' + q.materi];
          return '<article class="soal-item' + (q.aktif ? '' : ' off') + '"><div class="si-head"><span class="si-id">' + esc(q.id) + '</span>' + domChip(q.mapel) + '<span class="tk tk-' + q.tingkat.toLowerCase() + '">' + q.tingkat + '</span>' + (q.aktif ? '' : '<span class="st-chip st-idle"><i></i>Nonaktif</span>') +
            '<div class="si-act"><button class="icon-btn" data-pv="' + esc(q.id) + '" title="Pratinjau tampilan murid">' + icon('eye', 'ic-sm') + '</button><button class="icon-btn" data-ed="' + esc(q.id) + '" title="Ubah">' + icon('edit', 'ic-sm') + '</button><button class="icon-btn" data-dup="' + esc(q.id) + '" title="Duplikat">' + icon('copy', 'ic-sm') + '</button><button class="icon-btn danger" data-del="' + esc(q.id) + '" title="Hapus">' + icon('trash', 'ic-sm') + '</button></div></div>' +
            '<small class="si-wil">' + esc(wn(q.wilayah)) + '</small><div class="si-body"><div>' + (q.stimulus ? '<p class="si-stim">' + esc(q.stimulus.slice(0, 220)) + (q.stimulus.length > 220 ? '…' : '') + '</p>' : '') + '<p class="si-teks">' + rich(q.teks) + '</p></div>' +
            (q.gambar ? '<img class="si-img" src="' + thumb(q.gambar, 240) + '" alt="" loading="lazy">' : '') + '</div>' +
            '<div class="si-opts">' + Object.keys(q.opsi).filter((L) => q.opsi[L]).map((L) => '<span class="' + (L === q.kunci ? 'key' : '') + '">' + (L === q.kunci ? icon('check-circle', 'ic-xs') : '') + '<b>' + L + '.</b> ' + rich(q.opsi[L]) + (L === q.kunci ? ' (Kunci)' : '') + '</span>').join('') + '</div>' +
            '<div class="si-meta"><span>' + icon('target', 'ic-xs') + 'Materi: <b>' + esc(q.materi) + '</b></span>' + (mm ? '<span class="' + (mm.persen > 50 ? 'bad' : '') + '">' + icon('activity', 'ic-xs') + 'Galat kelas 30 hari: <b>' + mm.persen + '%</b></span>' : '') +
            '<span>' + icon('user', 'ic-xs') + esc(q.pembuat || '–') + (q.diperbarui ? ' • ' + relTime(q.diperbarui) : '') + '</span></div></article>';
        }).join('') : '<div class="g-empty sm">' + icon('search') + '<p>Tidak ada soal yang cocok dengan filter.</p></div>') +
        '<div class="g-pager"><small>Halaman ' + U.page + ' dari ' + pages + '</small><div>' + (pages > 1 ? '<button data-p="' + Math.max(1, U.page - 1) + '">‹</button>' + Array.from({ length: pages }, (_, i) => i + 1).filter((i) => i === 1 || i === pages || Math.abs(i - U.page) <= 2).map((i) => '<button class="' + (i === U.page ? 'on' : '') + '" data-p="' + i + '">' + i + '</button>').join('') + '<button data-p="' + Math.min(pages, U.page + 1) + '">›</button>' : '') + '</div></div></div>';
      const find = (id) => (this.list || []).find((x) => x.id === id);
      $$('[data-p]', root).forEach((b) => b.onclick = () => { U.page = +b.dataset.p; this.renderList(matMap); $('.sl-list', root).scrollIntoView({ behavior: 'smooth' }); });
      $$('[data-ed]', root).forEach((b) => b.onclick = () => soalForm(find(b.dataset.ed)));
      $$('[data-dup]', root).forEach((b) => b.onclick = () => { const q = Object.assign({}, find(b.dataset.dup)); delete q.id; soalForm(q, true); });
      $$('[data-pv]', root).forEach((b) => b.onclick = () => modal({ title: 'Pratinjau layar murid', size: 'sm', body: phonePreview(find(b.dataset.pv)) }));
      $$('[data-del]', root).forEach((b) => b.onclick = async () => {
        const q = find(b.dataset.del);
        if (!(await confirmDlg('Hapus soal ' + q.id + '?', 'Soal dihapus permanen dari bank soal. Riwayat jawaban murid tetap tersimpan. Pilih "Ubah → Nonaktif" bila hanya ingin menyembunyikan.', 'Hapus', true))) return;
        const r = await api('soalHapus', { id: q.id });
        toast(r.success ? 'Soal dihapus.' : r.message, r.success ? 'success' : 'error');
        if (r.success) { this.list = this.list.filter((x) => x.id !== q.id); cacheSet('soal', { soal: this.list }); this.render(); }
      });
    }
  });

  function phonePreview(q) {
    if (!q) return '';
    return '<div class="phone"><div class="phone-in"><div class="pp-head">' + icon('swords', 'ic-xs') + 'Misi Harian • ' + esc(q.mapel || '') + '</div>' +
      (q.stimulus ? '<div class="pp-stim">' + rich(q.stimulus) + '</div>' : '') + (q.gambar ? '<img src="' + thumb(q.gambar, 500) + '" alt="">' : '') +
      '<p class="pp-q">' + rich(q.teks || 'Teks soal…') + '</p>' + ['A', 'B', 'C', 'D'].filter((L) => (q.opsi || {})[L]).map((L) => '<div class="pp-opt ' + (L === q.kunci ? 'k' : '') + '"><b>' + L + '</b>' + rich(q.opsi[L]) + '</div>').join('') +
      '<div class="pp-btn">Kunci Jawaban</div></div></div>';
  }

  function soalForm(q, dup) {
    const W = boot().wilayah || [], L = (TQ.Pages.soal.list || []);
    const s = Object.assign({ mapel: 'Literasi', wilayah: '', materi: '', tingkat: 'Sedang', stimulus: '', teks: '', opsi: { A: '', B: '', C: '', D: '' }, kunci: 'A', pembahasan: '', gambar: '', aktif: true }, q ? JSON.parse(JSON.stringify(q)) : {});
    if (!s.wilayah) s.wilayah = (W.find((w) => w.mapel === s.mapel) || {}).id || '';
    const materiList = Array.from(new Set(L.map((x) => x.materi))).sort();
    const dlg = modal({ title: q && !dup ? 'Ubah soal ' + q.id : dup ? 'Duplikat soal' : 'Tambah butir soal baru', size: 'xl', cls: 'soal-form-modal', body:
      '<div class="sf-grid"><form class="sf-form" id="sf" novalidate>' +
      '<div class="g-row2"><label class="g-field"><span>Mata pelajaran</span><select class="g-input" name="mapel"><option>Literasi</option><option>Numerasi</option></select></label>' +
      '<label class="g-field"><span>Wilayah petualangan</span><select class="g-input" name="wilayah"></select></label></div>' +
      '<div class="g-row2"><label class="g-field"><span>Materi pokok</span><input class="g-input" name="materi" list="sf-mat" maxlength="80" placeholder="mis. Pecahan campuran"><datalist id="sf-mat">' + materiList.map((m) => '<option value="' + esc(m) + '">').join('') + '</datalist></label>' +
      '<div class="g-field"><span>Tingkat kesulitan</span><div class="g-seg" id="sf-tk">' + ['Mudah', 'Sedang', 'Sulit'].map((x) => '<button type="button" data-t="' + x + '">' + x + '</button>').join('') + '</div></div></div>' +
      '<label class="g-field"><span>Teks stimulus / bacaan <small>(opsional)</small></span><textarea class="g-input" name="stimulus" rows="4" maxlength="4000" placeholder="Paragraf, cerita, tabel data, atau konteks soal…"></textarea></label>' +
      '<label class="g-field"><span>Teks soal</span><textarea class="g-input" name="teks" rows="3" maxlength="2000" required placeholder="Pertanyaan yang dijawab murid"></textarea><small class="muted">Format: **tebal**, _miring_, baris baru didukung.</small></label>' +
      '<div class="g-field"><span>Gambar stimulus <small>(opsional, disimpan di Google Drive)</small></span><div class="drop" id="sf-drop"></div><input type="file" id="sf-file" accept="image/png,image/jpeg,image/webp" hidden></div>' +
      '<div class="g-field"><span>Opsi jawaban & kunci <small>(pilih lingkaran untuk menandai kunci)</small></span>' + ['A', 'B', 'C', 'D'].map((Lt) => '<div class="sf-opt"><label class="sf-radio"><input type="radio" name="kunci" value="' + Lt + '"><b>' + Lt + '</b></label><input class="g-input" name="opsi_' + Lt + '" maxlength="500" placeholder="Opsi ' + Lt + (Lt > 'B' ? ' (opsional)' : '') + '"></div>').join('') + '</div>' +
      '<label class="g-field"><span>Pembahasan konsep <small>(muncul setelah murid menjawab)</small></span><textarea class="g-input" name="pembahasan" rows="3" maxlength="1500" placeholder="Jelaskan langkah atau alasan jawaban yang benar"></textarea></label>' +
      '<label class="g-check"><input type="checkbox" name="aktif"> Soal aktif (bisa muncul di misi murid)</label></form>' +
      '<aside class="sf-prev"><small class="muted">Pratinjau layar murid</small><div id="sf-pv"></div></aside></div>',
      actions: [{ label: 'Batal' }, { label: 'Simpan ke bank soal', icon: 'check', cls: 'g-btn g-btn-primary', onClick: async (d, btn) => {
        collect();
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-xs"></span>Menyimpan…';
        const body = { id: q && !dup ? q.id : '', mapel: s.mapel, wilayah: s.wilayah, materi: s.materi, tingkat: s.tingkat, stimulus: s.stimulus, teks: s.teks, opsi: s.opsi, kunci: s.kunci, pembahasan: s.pembahasan, gambar: s.gambar, aktif: s.aktif };
        const r = await api('soalSimpan', { soal: body });
        if (!r.success) { toast(r.message, 'error'); btn.disabled = false; btn.innerHTML = icon('check', 'ic-sm') + 'Simpan ke bank soal'; return false; }
        toast(r.data.baru ? 'Soal ' + r.data.id + ' ditambahkan.' : 'Perubahan disimpan.', 'success');
        const P = TQ.Pages.soal; const saved = Object.assign({}, body, { id: r.data.id, pembuat: (q && !dup && q.pembuat) || (boot().me || {}).nama, diperbarui: new Date().toISOString() });
        P.list = (P.list || []).filter((x) => x.id !== saved.id).concat([saved]);
        cacheSet('soal', { soal: P.list }); cacheStale('soal');
        if (AppState.page === 'soal') P.render();
      } }] });
    const f = $('#sf', dlg.el);
    const fillWil = () => { f.wilayah.innerHTML = W.filter((w) => w.mapel === s.mapel).map((w) => '<option value="' + w.id + '">W' + (W.indexOf(w) + 1) + ': ' + esc(w.nama) + '</option>').join(''); if (!W.some((w) => w.id === s.wilayah && w.mapel === s.mapel)) s.wilayah = f.wilayah.value; f.wilayah.value = s.wilayah; };
    f.mapel.value = s.mapel; fillWil();
    f.materi.value = s.materi; f.stimulus.value = s.stimulus; f.teks.value = s.teks; f.pembahasan.value = s.pembahasan; f.aktif.checked = !!s.aktif;
    ['A', 'B', 'C', 'D'].forEach((Lt) => { f['opsi_' + Lt].value = s.opsi[Lt] || ''; });
    const kr = $$('input[name=kunci]', f).find((x) => x.value === s.kunci); if (kr) kr.checked = true;
    const tk = () => $$('#sf-tk button', f).forEach((b) => b.classList.toggle('active', b.dataset.t === s.tingkat));
    $$('#sf-tk button', f).forEach((b) => b.onclick = () => { s.tingkat = b.dataset.t; tk(); }); tk();
    function collect() {
      s.mapel = f.mapel.value; s.wilayah = f.wilayah.value; s.materi = f.materi.value.trim(); s.stimulus = f.stimulus.value; s.teks = f.teks.value; s.pembahasan = f.pembahasan.value; s.aktif = f.aktif.checked;
      ['A', 'B', 'C', 'D'].forEach((Lt) => { s.opsi[Lt] = f['opsi_' + Lt].value; });
      const k = $$('input[name=kunci]', f).find((x) => x.checked); s.kunci = k ? k.value : '';
    }
    const pv = () => { collect(); $('#sf-pv', dlg.el).innerHTML = phonePreview(s); };
    f.mapel.onchange = () => { s.mapel = f.mapel.value; fillWil(); pv(); };
    f.oninput = debounce(pv, 150); f.onchange = pv;
    const drop = $('#sf-drop', f), file = $('#sf-file', f);
    const paintDrop = () => { drop.innerHTML = s.gambar ? '<img src="' + thumb(s.gambar, 300) + '" alt=""><div><b>Gambar terpasang</b><small>Tersimpan di folder Gambar Soal (Drive)</small><button type="button" class="g-btn g-btn-ghost g-btn-xs" id="sf-rm">' + icon('trash', 'ic-xs') + 'Lepas</button></div>'
      : '<div class="drop-in">' + icon('upload') + '<b>Tarik & lepas gambar atau <u>pilih berkas</u></b><small>PNG, JPG, atau WebP. Otomatis dikecilkan ≤ 1 MB.</small></div>';
      const rm = $('#sf-rm', drop); if (rm) rm.onclick = (e) => { e.stopPropagation(); s.gambar = ''; paintDrop(); pv(); }; };
    paintDrop();
    drop.onclick = () => file.click();
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); };
    file.onchange = () => { if (file.files[0]) upload(file.files[0]); file.value = ''; };
    async function upload(fl) {
      drop.innerHTML = '<div class="drop-in"><span class="spinner"></span><b>Mengecilkan & mengunggah…</b></div>';
      const r = await unggahGambar(fl, 'soal');
      if (r.success) { s.gambar = r.data.id; if (r.data.pesan) toast(r.data.pesan, 'warn', 6000); } else toast(r.message, 'error');
      paintDrop(); pv();
    }
    pv();
  }

  /** Kecilkan gambar di browser (maks 1280 px, ≤ 1 MB) lalu unggah ke Drive lewat API */
  async function unggahGambar(fl, tujuan) {
    if (!/^image\/(png|jpeg|webp)$/.test(fl.type)) return { success: false, message: 'Format harus PNG, JPG, atau WebP.' };
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(fl); });
      const max = tujuan === 'logo' ? 512 : 1280, sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      let mime = tujuan === 'logo' && fl.type === 'image/png' ? 'image/png' : 'image/jpeg', q = 0.85, data;
      for (let i = 0; i < 6; i++) { data = c.toDataURL(mime, q); if (data.length * 0.75 <= 1000000) break; mime = 'image/jpeg'; q -= 0.12; }
      if (data.length * 0.75 > 1000000) return { success: false, message: 'Gambar terlalu besar walau sudah dikecilkan.' };
      return await api('unggahGambar', { mime, data: data.split(',')[1], tujuan });
    } catch (e) { return { success: false, message: 'Gambar tidak bisa dibaca.' }; }
  }

  // ================================================================ LAPORAN & EKSPOR
  const Lap = { jenis: 'kelas', murid: 'semua', hari: 7, dari: '', sampai: '', format: 'pdf', preset: null };
  registerPage('laporan', {
    role: 'guru', title: 'Laporan & Ekspor',
    template: () => '<div class="g-page"></div>',
    show(el) {
      this.el = el;
      if (Lap.preset) { Object.assign(Lap, Lap.preset); Lap.preset = null; }
      if (!G.kelas) { $('.g-page', el).innerHTML = emptyKelas(); return; }
      this.render();
      loadDash(() => this.renderMurid(), false, 7);
      this.arsip();
    },
    refresh(force) { this.arsip(force); },
    render() {
      const root = $('.g-page', this.el), custom = Lap.hari === 0;
      root.innerHTML = pageHead('Laporan Capaian & Ekspor Data', 'Unduh ringkasan untuk arsip sekolah, rapat dewan guru, atau rapor mini yang siap dibagikan ke orang tua.', '') +
        '<section class="g-card lap-gen"><div class="g-card-h"><h2>' + icon('settings', 'ic-sm') + 'Generator Dokumen</h2><span class="muted small">' + icon('cloud', 'ic-xs') + 'Tersimpan juga di folder Laporan (Drive)</span></div>' +
        '<div class="lap-grid"><label class="g-field"><span>1. Jenis laporan</span><select class="g-input" id="lp-j"><option value="kelas">Rekap kelas kolektif</option><option value="rapor">Rapor mini per anak</option></select></label>' +
        '<label class="g-field" id="lp-m-w"><span>2. Sasaran murid</span><select class="g-input" id="lp-m"><option value="semua">Semua murid (satu berkas)</option></select></label>' +
        '<label class="g-field"><span>3. Rentang evaluasi</span><select class="g-input" id="lp-h"><option value="1">Hari ini</option><option value="7">7 hari terakhir (mingguan)</option><option value="30">30 hari terakhir (bulanan)</option><option value="90">90 hari terakhir</option><option value="0">Pilih tanggal…</option></select></label>' +
        '<div class="g-field"><span>4. Format keluaran</span><div class="g-seg" id="lp-f">' + [['pdf', 'PDF'], ['sheet', 'Google Sheets'], ['csv', 'CSV']].map((x) => '<button data-f="' + x[0] + '" class="' + (Lap.format === x[0] ? 'active' : '') + '">' + x[1] + '</button>').join('') + '</div></div></div>' +
        '<div class="lap-dates" ' + (custom ? '' : 'hidden') + '><label class="g-field"><span>Dari</span><input type="date" class="g-input" id="lp-d1" value="' + Lap.dari + '"></label><label class="g-field"><span>Sampai</span><input type="date" class="g-input" id="lp-d2" value="' + Lap.sampai + '"></label></div>' +
        '<label class="g-field" id="lp-c-w" hidden><span>Catatan wali kelas <small>(kosongkan untuk catatan otomatis dari data)</small></span><textarea class="g-input" id="lp-c" rows="3" maxlength="600"></textarea></label>' +
        '<div class="g-row-end"><small class="muted">' + icon('check-circle', 'ic-xs') + 'Dokumen otomatis memakai kop dan identitas sekolah dari Pengaturan.</small><button class="g-btn g-btn-primary" id="lp-go">' + icon('zap', 'ic-sm') + 'Buat Laporan</button></div></section>' +
        '<div class="g-grid-2"><section class="g-card"><div class="g-card-h"><h2>' + icon('database', 'ic-sm') + 'Arsip Berkas Siap Unduh</h2><button class="icon-btn" id="lp-ar" title="Muat ulang arsip">' + icon('refresh', 'ic-sm') + '</button></div><div id="lp-arsip"><div class="g-skel sm"></div></div></section>' +
        '<section class="g-card tip"><h2>' + icon('lightbulb', 'ic-sm') + 'Petunjuk</h2><ul><li>Rapor mini dibuat 1 halaman A4 per anak, siap dicetak untuk orang tua.</li><li>Pilih "Google Sheets" bila ingin mengolah data lebih lanjut atau membagikannya ke rekan guru.</li><li>CSV dibuat langsung di perangkat ini, tanpa membebani server.</li><li>Pembuatan PDF 28 rapor membutuhkan ±10–20 detik.</li></ul></section></div>';
      $('#lp-j', root).value = Lap.jenis; $('#lp-h', root).value = String(Lap.hari);
      this.renderMurid();
      $('#lp-j', root).onchange = (e) => { Lap.jenis = e.target.value; this.syncForm(); };
      $('#lp-m', root).onchange = (e) => { Lap.murid = e.target.value; this.syncForm(); };
      $('#lp-h', root).onchange = (e) => { Lap.hari = +e.target.value; $('.lap-dates', root).hidden = Lap.hari !== 0; };
      $('#lp-d1', root).onchange = (e) => { Lap.dari = e.target.value; }; $('#lp-d2', root).onchange = (e) => { Lap.sampai = e.target.value; };
      $$('#lp-f button', root).forEach((b) => b.onclick = () => { Lap.format = b.dataset.f; $$('#lp-f button', root).forEach((x) => x.classList.toggle('active', x === b)); });
      $('#lp-go', root).onclick = (e) => this.generate(e.currentTarget);
      $('#lp-ar', root).onclick = () => this.arsip(true);
      this.syncForm();
    },
    renderMurid() {
      const sel = $('#lp-m', this.el); if (!sel) return;
      const d = cacheGet(dashKey(G.kelas, 7)) || cacheGet(dashKey(G.kelas, G.hari));
      sel.innerHTML = '<option value="semua">Semua murid (satu berkas)</option>' + (d ? d.murid.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nama) + '</option>').join('') : '');
      sel.value = Lap.murid; if (!sel.value) { Lap.murid = 'semua'; sel.value = 'semua'; }
    },
    syncForm() {
      const r = this.el;
      $('#lp-m-w', r).hidden = Lap.jenis !== 'rapor';
      $('#lp-c-w', r).hidden = !(Lap.jenis === 'rapor' && Lap.murid !== 'semua');
    },
    async generate(btn) {
      const body = { kelas: G.kelas, jenis: Lap.jenis, murid: Lap.murid, hari: Lap.hari || 7, format: Lap.format, catatan: ($('#lp-c', this.el) || {}).value || '' };
      if (Lap.hari === 0) { if (!Lap.dari || !Lap.sampai) { toast('Pilih tanggal awal dan akhir.', 'warn'); return; } body.dari = Lap.dari; body.sampai = Lap.sampai; }
      btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<span class="spinner spinner-xs"></span>Menyusun laporan…';
      try {
        if (Lap.format === 'csv') {
          const r = await api('laporanData', body);
          if (!r.success) { toast(r.message, 'error'); return; }
          const d = r.data;
          downloadCsv((Lap.jenis === 'rapor' ? 'Rapor ' : 'Rekap ') + 'Kelas ' + d.kelas.nama + ' ' + d.dari + ' sd ' + d.sampai + '.csv',
            [['Nama', 'NISN', 'Status', 'Level', 'XP', 'Streak', 'Hari aktif', 'Misi', 'Akurasi %', 'Literasi %', 'Numerasi %', 'Materi perlu penguatan']].concat(
              d.murid.filter((m) => Lap.jenis !== 'rapor' || Lap.murid === 'semua' || m.id === Lap.murid).map((m) => [m.nama, m.nisn, STATUS[m.status][0], m.level, m.xp, m.streak, m.hadir, m.misiRentang, m.akurasi, m.lit, m.num, m.lemah.map((x) => x.materi + ' (' + x.persen + '%)').join('; ')])));
          toast('CSV diunduh.', 'success');
          return;
        }
        const r = await api('laporan', body, { timeout: 120000 });
        if (!r.success) { toast(r.message, 'error'); return; }
        if (r.data.format === 'sheet') {
          modal({ title: 'Google Sheets siap', size: 'sm', body: '<p>Laporan <b>' + esc(r.data.nama) + '</b> sudah dibuat di folder Laporan pada Google Drive.</p>', actions: [{ label: 'Tutup' }, { label: 'Buka Spreadsheet', cls: 'g-btn g-btn-primary', icon: 'external-link', onClick: () => window.open(r.data.url, '_blank', 'noopener') }] });
        } else {
          const bytes = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
          downloadBlob(new Blob([bytes], { type: 'application/pdf' }), r.data.nama);
          toast('PDF diunduh dan tersimpan di arsip Drive.', 'success');
        }
        cacheStale('arsip'); this.arsip(true);
      } finally { btn.disabled = false; btn.innerHTML = old; }
    },
    async arsip(force) {
      const box = () => $('#lp-arsip', this.el);
      await swr('arsip', 'arsipList', {}, (list) => {
        const b = box(); if (!b) return;
        b.innerHTML = list.length ? list.map((f) => {
          const pdf = /pdf/.test(f.mime), sh = /spreadsheet/.test(f.mime);
          return '<div class="arsip"><span class="ar-ic ' + (pdf ? 'pdf' : sh ? 'sh' : '') + '">' + icon(pdf ? 'file-text' : sh ? 'sheet' : 'file-text', 'ic-sm') + '</span><div><b>' + esc(f.nama) + '</b><small>' + fmtTgl(f.waktu) + ' ' + TQ.fmtJam(f.waktu) + (f.ukuran ? ' • ' + Math.max(1, Math.round(f.ukuran / 1024)) + ' KB' : '') + '</small></div><a class="g-btn g-btn-outline g-btn-xs" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + icon('external-link', 'ic-xs') + 'Buka</a></div>';
        }).join('') : '<p class="muted small">Belum ada laporan yang dibuat.</p>';
      }, { fresh: force ? 0 : 60000, force, q: true, onError: (e) => { const b = box(); if (b) b.innerHTML = '<p class="muted small">' + esc(e.message) + '</p>'; } });
    }
  });

  // ================================================================ PENGATURAN
  let setTab = 'akun';
  registerPage('pengaturan', {
    role: 'guru', title: 'Pengaturan',
    template: () => '<div class="g-page"></div>',
    show(el) { this.el = el; this.render(); },
    refresh(force) { if (isAdmin()) this.loadAdmin(force); },
    tabs() {
      const t = [['akun', 'key', 'Keamanan Akun']];
      if (isAdmin()) t.push(['sekolah', 'school', 'Identitas Sekolah'], ['aturan', 'zap', 'Aturan Misi & XP'], ['wilayah', 'map', 'Wilayah Petualangan'], ['kelas', 'users', 'Kelas & Guru'], ['data', 'database', 'Data & Migrasi']);
      return t;
    },
    render() {
      const root = $('.g-page', this.el), tabs = this.tabs();
      if (!tabs.some((x) => x[0] === setTab)) setTab = 'akun';
      root.innerHTML = pageHead('Pengaturan', isAdmin() ? 'Kelola identitas sekolah, aturan permainan, akun guru, dan migrasi data.' : 'Kelola keamanan akun Anda. Pengaturan sekolah diatur oleh admin.', '') +
        '<div class="set-wrap"><nav class="set-tabs">' + tabs.map((x) => '<button data-t="' + x[0] + '" class="' + (setTab === x[0] ? 'active' : '') + '">' + icon(x[1], 'ic-sm') + '<span>' + x[2] + '</span></button>').join('') + '</nav><div class="set-body" id="set-body"></div></div>';
      $$('.set-tabs button', root).forEach((b) => b.onclick = () => { setTab = b.dataset.t; this.render(); });
      if (setTab === 'akun') this.akun(); else this.loadAdmin();
    },
    akun() {
      const me = boot().me || {};
      $('#set-body', this.el).innerHTML = '<section class="g-card"><h2>' + icon('user', 'ic-sm') + 'Akun saya</h2><div class="kv"><span>Nama</span><b>' + esc(me.nama) + '</b><span>Username</span><b>' + esc(me.username) + '</b><span>Peran</span><b>' + (isAdmin() ? 'Admin sekolah' : 'Guru kelas') + '</b></div></section>' +
        '<section class="g-card"><h2>' + icon('key', 'ic-sm') + 'Ganti kata sandi</h2><form id="pw" class="form-narrow"><label class="g-field"><span>Sandi lama</span><input class="g-input" type="password" name="lama" autocomplete="current-password" required></label>' +
        '<label class="g-field"><span>Sandi baru</span><input class="g-input" type="password" name="baru" autocomplete="new-password" minlength="8" required><small class="muted">Minimal 8 karakter, berisi huruf dan angka.</small></label>' +
        '<label class="g-field"><span>Ulangi sandi baru</span><input class="g-input" type="password" name="ulang" autocomplete="new-password" required></label><button class="g-btn g-btn-primary">' + icon('check', 'ic-sm') + 'Simpan sandi baru</button></form>' +
        '<p class="muted small">Setelah sandi diganti, sesi di perangkat lain otomatis keluar.</p></section>';
      $('#pw', this.el).onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        if (f.baru.value !== f.ulang.value) { toast('Ulangi sandi baru belum sama.', 'warn'); return; }
        const r = await api('gantiSandi', { lama: f.lama.value, baru: f.baru.value });
        if (!r.success) { toast(r.message, 'error'); return; }
        TQ.setSession(r.data.token, AppState.role, AppState.uid, AppState.boot);
        f.reset(); toast('Sandi diganti. Perangkat lain sudah dikeluarkan.', 'success');
      };
    },
    async loadAdmin(force) {
      const body = $('#set-body', this.el); if (!body) return;
      if (!cacheGet('admin')) body.innerHTML = '<div class="g-skel"></div>';
      syncState('busy');
      await swr('admin', 'adminData', {}, (d) => { this.A = d; this.renderAdmin(); }, { fresh: force ? 0 : 60000, force, onError: (e) => { body.innerHTML = errorBox(e.message, () => this.loadAdmin(true)); } });
      syncState('');
    },
    renderAdmin() {
      const fn = { sekolah: this.sekolah, aturan: this.aturan, wilayah: this.wilayah, kelas: this.kelasGuru, data: this.data }[setTab];
      if (fn && this.A) fn.call(this, $('#set-body', this.el), this.A);
    },
    async saveSettings(obj, btn) {
      btn.disabled = true;
      const r = await api('settingsSimpan', { settings: obj });
      btn.disabled = false;
      if (!r.success) { toast(r.message, 'error'); return false; }
      toast('Pengaturan disimpan.', 'success'); cacheStale('admin');
      Object.keys(obj).forEach((k) => { const s = this.A.settings.find((x) => x.kunci === k); if (s) s.nilai = obj[k]; });
      return true;
    },
    settingsForm(el, keys, title, ic, after) {
      const S = {}; this.A.settings.forEach((s) => { S[s.kunci] = s; });
      el.innerHTML = '<section class="g-card"><h2>' + icon(ic, 'ic-sm') + title + '</h2><form id="sf-set" class="set-form">' + keys.map((k) => {
        const s = S[k] || { nilai: '', ket: '' }, num = typeof s.nilai === 'number';
        return '<label class="g-field"><span>' + esc(s.ket || k) + '</span><input class="g-input" name="' + k + '" ' + (k === 'TANGGAL_TKA' ? 'type="date"' : num ? 'type="number" min="0"' : '') + ' value="' + esc(s.nilai) + '"></label>';
      }).join('') + '<div class="set-save"><button class="g-btn g-btn-primary">' + icon('check', 'ic-sm') + 'Simpan perubahan</button></div></form></section>' + (after || '');
      $('#sf-set', el).onsubmit = async (e) => { e.preventDefault(); const o = {}; keys.forEach((k) => { o[k] = e.target[k].value; }); await this.saveSettings(o, $('button', e.target)); };
    },
    sekolah(el) {
      const S = {}; this.A.settings.forEach((s) => { S[s.kunci] = s.nilai; });
      this.settingsForm(el, ['NAMA_SEKOLAH', 'NPSN', 'ALAMAT', 'KOTA', 'KEPALA_SEKOLAH', 'NIP_KEPSEK', 'TAHUN_AJARAN', 'SEMESTER', 'TANGGAL_TKA', 'APP_URL'], 'Identitas sekolah & kop laporan', 'school',
        '<section class="g-card"><h2>' + icon('image', 'ic-sm') + 'Logo sekolah</h2><div class="logo-row"><span class="logo-prev">' + (S.LOGO_ID ? '<img src="' + thumb(S.LOGO_ID, 200) + '" alt="Logo">' : icon('shield')) + '</span><div><p class="muted small">PNG/JPG persegi, akan dikecilkan otomatis. Dipakai di panel guru dan kop PDF.</p><input type="file" id="lg-file" accept="image/png,image/jpeg,image/webp" hidden><button class="g-btn g-btn-outline" id="lg-btn">' + icon('upload', 'ic-sm') + 'Unggah logo</button></div></div></section>');
      $('#lg-btn', el).onclick = () => $('#lg-file', el).click();
      $('#lg-file', el).onchange = async (e) => {
        const fl = e.target.files[0]; if (!fl) return;
        busy(true, 'Mengunggah logo…');
        const r = await unggahGambar(fl, 'logo');
        if (r.success) await this.saveSettings({ LOGO_ID: r.data.id }, $('#lg-btn', el)); else toast(r.message, 'error');
        busy(false); this.renderAdmin();
      };
    },
    aturan(el) {
      this.settingsForm(el, ['SOAL_PER_MISI', 'MAKS_MISI_HARIAN', 'XP_BENAR', 'XP_SALAH', 'XP_SELESAI', 'XP_CHECKIN', 'XP_SEMPURNA', 'XP_LEVEL_DASAR', 'AMBANG_AMAN', 'AMBANG_BANTUAN', 'HARI_STATUS', 'HARI_TIDAK_AKTIF', 'TARGET_KOMUNAL'], 'Aturan misi, XP & ambang status', 'zap',
        '<p class="muted small">Perubahan langsung berlaku untuk misi berikutnya. Level dihitung ulang dari total XP, jadi mengubah dasar kurva level bisa menaikkan/menurunkan level murid.</p>');
    },
    wilayah(el) {
      const W = this.A.wilayah;
      el.innerHTML = '<section class="g-card"><h2>' + icon('map', 'ic-sm') + 'Enam wilayah petualangan</h2><p class="muted small">Nama, cerita, fokus materi, dan XP yang dibutuhkan untuk membuka wilayah. Mapel tiap wilayah tetap.</p><form id="wf">' +
        W.map((w, i) => '<fieldset class="wil-f"><legend>W' + (i + 1) + ' • ' + domChip(w.mapel) + '</legend><div class="g-row3"><label class="g-field"><span>Nama wilayah</span><input class="g-input" name="nama_' + w.id + '" value="' + esc(w.nama) + '" maxlength="40"></label>' +
          '<label class="g-field"><span>Bos penjaga</span><input class="g-input" name="bos_' + w.id + '" value="' + esc(w.bos) + '" maxlength="40"></label><label class="g-field"><span>Syarat XP</span><input class="g-input" type="number" min="0" name="syarat_' + w.id + '" value="' + w.syarat + '"></label></div>' +
          '<div class="g-row2"><label class="g-field"><span>Cerita singkat</span><input class="g-input" name="desk_' + w.id + '" value="' + esc(w.deskripsi) + '" maxlength="200"></label><label class="g-field"><span>Fokus materi</span><input class="g-input" name="mat_' + w.id + '" value="' + esc(w.materi) + '" maxlength="200"></label></div></fieldset>').join('') +
        '<div class="set-save"><button class="g-btn g-btn-primary">' + icon('check', 'ic-sm') + 'Simpan wilayah</button></div></form></section>';
      $('#wf', el).onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        const list = W.map((w) => ({ id: w.id, nama: f['nama_' + w.id].value, bos: f['bos_' + w.id].value, syarat: f['syarat_' + w.id].value, deskripsi: f['desk_' + w.id].value, materi: f['mat_' + w.id].value }));
        const r = await api('wilayahSimpan', { list });
        toast(r.success ? 'Wilayah disimpan. Murid melihat perubahan saat membuka ulang aplikasi.' : r.message, r.success ? 'success' : 'error');
        if (r.success) { cacheStale('admin'); this.loadAdmin(true); }
      };
    },
    kelasGuru(el, A) {
      const gName = (id) => (A.guru.find((g) => g.id === id) || {}).nama || '<span class="muted">Belum ada</span>';
      el.innerHTML = '<section class="g-card"><div class="g-card-h"><h2>' + icon('school', 'ic-sm') + 'Kelas</h2><button class="g-btn g-btn-primary g-btn-sm" id="kl-add">' + icon('plus', 'ic-sm') + 'Tambah kelas</button></div>' +
        '<div class="g-table-scroll"><table class="g-table compact"><thead><tr><th>Kelas</th><th>Wali kelas</th><th>Murid aktif</th><th>Status</th><th></th></tr></thead><tbody>' +
        A.kelas.map((k) => '<tr><td><b>' + esc(k.nama) + '</b></td><td>' + gName(k.guru) + '</td><td>' + (A.jumlahMurid[k.id] || 0) + '</td><td>' + (k.aktif ? statusChip('aman').replace('Aman', 'Aktif') : statusChip('belum').replace('Belum Mulai', 'Nonaktif')) + '</td><td><button class="g-btn g-btn-ghost g-btn-xs" data-k="' + esc(k.id) + '">' + icon('edit', 'ic-xs') + 'Ubah</button></td></tr>').join('') + '</tbody></table></div></section>' +
        '<section class="g-card"><div class="g-card-h"><h2>' + icon('users', 'ic-sm') + 'Akun guru</h2><button class="g-btn g-btn-primary g-btn-sm" id="gr-add">' + icon('plus', 'ic-sm') + 'Tambah guru</button></div>' +
        '<div class="g-table-scroll"><table class="g-table compact"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th></th></tr></thead><tbody>' +
        A.guru.map((g) => '<tr><td><b>' + esc(g.nama) + '</b>' + (g.nip ? '<small class="d">NIP ' + esc(g.nip) + '</small>' : '') + '</td><td class="mono">' + esc(g.username) + '</td><td>' + (g.peran === 'admin' ? 'Admin' : 'Guru') + '</td><td>' + (g.aktif ? 'Aktif' : '<span class="muted">Nonaktif</span>') + '</td><td><button class="g-btn g-btn-ghost g-btn-xs" data-g="' + esc(g.id) + '">' + icon('edit', 'ic-xs') + 'Ubah</button></td></tr>').join('') + '</tbody></table></div></section>';
      const kForm = (k) => modal({ title: k ? 'Ubah kelas ' + k.nama : 'Tambah kelas', size: 'sm', body: '<label class="g-field"><span>Nama kelas</span><input class="g-input" id="kf-n" value="' + esc(k ? k.nama : '') + '" placeholder="6A" maxlength="12"></label>' +
        '<label class="g-field"><span>Wali kelas</span><select class="g-input" id="kf-g"><option value="">— pilih guru —</option>' + A.guru.filter((g) => g.aktif).map((g) => '<option value="' + esc(g.id) + '"' + (k && k.guru === g.id ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('') + '</select></label>' +
        (k ? '<label class="g-check"><input type="checkbox" id="kf-a"' + (k.aktif ? ' checked' : '') + '> Kelas aktif</label>' : ''),
        actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'g-btn g-btn-primary', onClick: async (d) => {
          const r = await api('kelasSimpan', { id: k ? k.id : '', nama: $('#kf-n', d.el).value, guru: $('#kf-g', d.el).value, aktif: k ? $('#kf-a', d.el).checked : true });
          if (!r.success) { toast(r.message, 'error'); return false; }
          toast('Kelas disimpan. Guru melihat kelas baru setelah masuk ulang.', 'success'); this.loadAdmin(true);
        } }] });
      const gForm = (g) => modal({ title: g ? 'Ubah akun ' + g.nama : 'Tambah akun guru', size: 'sm', body:
        '<label class="g-field"><span>Nama lengkap & gelar</span><input class="g-input" id="gf-n" value="' + esc(g ? g.nama : '') + '" maxlength="80"></label>' +
        '<label class="g-field"><span>NIP <small>(opsional, untuk tanda tangan rapor)</small></span><input class="g-input" id="gf-nip" value="' + esc(g ? g.nip : '') + '" maxlength="25"></label>' +
        '<label class="g-field"><span>Username</span><input class="g-input" id="gf-u" value="' + esc(g ? g.username : '') + '" maxlength="40" autocapitalize="none"></label>' +
        '<label class="g-field"><span>' + (g ? 'Sandi baru (kosongkan bila tetap)' : 'Kata sandi awal') + '</span><input class="g-input" id="gf-p" type="text" autocomplete="off" placeholder="min. 8 karakter, huruf + angka"></label>' +
        '<div class="g-row2"><label class="g-field"><span>Peran</span><select class="g-input" id="gf-r"><option value="guru">Guru kelas</option><option value="admin"' + (g && g.peran === 'admin' ? ' selected' : '') + '>Admin sekolah</option></select></label>' +
        (g ? '<label class="g-check"><input type="checkbox" id="gf-a"' + (g.aktif ? ' checked' : '') + '> Akun aktif</label>' : '') + '</div>',
        actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'g-btn g-btn-primary', onClick: async (d) => {
          const r = await api('guruSimpan', { id: g ? g.id : '', nama: $('#gf-n', d.el).value, nip: $('#gf-nip', d.el).value, username: $('#gf-u', d.el).value, password: $('#gf-p', d.el).value, peran: $('#gf-r', d.el).value, aktif: g ? $('#gf-a', d.el).checked : true });
          if (!r.success) { toast(r.message, 'error'); return false; }
          toast('Akun guru disimpan.', 'success'); this.loadAdmin(true);
        } }] });
      $('#kl-add', el).onclick = () => kForm(null);
      $('#gr-add', el).onclick = () => gForm(null);
      $$('[data-k]', el).forEach((b) => b.onclick = () => kForm(A.kelas.find((k) => k.id === b.dataset.k)));
      $$('[data-g]', el).forEach((b) => b.onclick = () => gForm(A.guru.find((g) => g.id === b.dataset.g)));
    },
    data(el, A) {
      el.innerHTML = '<section class="g-card"><h2>' + icon('database', 'ic-sm') + 'Import dari spreadsheet app lama</h2>' +
        '<p class="muted small">Spreadsheet lama <b>hanya dibaca</b>, tidak pernah diubah. Kolom dikenali dari nama header, jadi bisa dari TKA QUEST versi lama maupun app lain (data siswa, bank soal). Jalankan lagi tepat sebelum pindah untuk menangkap data baru (delta sync) — tidak akan dobel.</p>' +
        '<div class="g-row2"><label class="g-field"><span>URL atau ID spreadsheet lama</span><input class="g-input" id="im-src" placeholder="https://docs.google.com/spreadsheets/d/…"></label>' +
        '<label class="g-field"><span>Kelas tujuan (untuk murid yang kelasnya tidak cocok)</span><select class="g-input" id="im-k"><option value="">— pilih —</option>' + A.kelas.filter((k) => k.aktif).map((k) => '<option value="' + esc(k.id) + '">Kelas ' + esc(k.nama) + '</option>').join('') + '</select></label></div>' +
        '<div class="g-row2"><label class="g-field"><span>Mapel default soal tanpa kolom mapel</span><select class="g-input" id="im-m"><option>Literasi</option><option>Numerasi</option></select></label>' +
        '<label class="g-check"><input type="checkbox" id="im-ow"> Timpa data yang sudah ada (nama murid, isi soal). Progres murid selalu memakai nilai tertinggi.</label></div>' +
        '<div class="g-row-end"><span></span><button class="g-btn g-btn-primary" id="im-scan">' + icon('search', 'ic-sm') + 'Pindai (tanpa menulis)</button></div><div id="im-res"></div></section>' +
        '<section class="g-card"><h2>' + icon('upload', 'ic-sm') + 'Import dari berkas CSV</h2><p class="muted small">Untuk data dari luar (Dapodik, Excel). Unduh template, isi, lalu simpan sebagai CSV.</p><div class="csv-row">' +
        '<button class="g-btn g-btn-outline" id="csv-m">' + icon('users', 'ic-sm') + 'Import murid (CSV)</button><button class="g-btn g-btn-outline" id="csv-s">' + icon('file-text', 'ic-sm') + 'Import soal (CSV)</button>' +
        '<button class="g-btn g-btn-ghost" id="tpl-m">' + icon('download', 'ic-sm') + 'Template murid</button><button class="g-btn g-btn-ghost" id="tpl-s">' + icon('download', 'ic-sm') + 'Template soal</button></div></section>' +
        '<section class="g-card"><h2>' + icon('activity', 'ic-sm') + 'Performa server</h2><div id="perf"><button class="g-btn g-btn-ghost" id="perf-go">' + icon('refresh', 'ic-sm') + 'Periksa status</button></div></section>' +
        (A.demo ? '<section class="g-card danger-zone"><h2>' + icon('trash', 'ic-sm') + 'Data contoh</h2><p class="small">Ada <b>' + A.demo + ' murid demo</b> (Bima, Siti, Dimas, …) beserta riwayatnya. Hapus sebelum dipakai murid sungguhan.</p><button class="g-btn g-btn-danger" id="demo-del">' + icon('trash', 'ic-sm') + 'Hapus data demo</button></section>' : '');
      const res = $('#im-res', el);
      const opsi = () => ({ source: $('#im-src', el).value.trim(), kelasTujuan: $('#im-k', el).value, mapelDefault: $('#im-m', el).value, overwrite: $('#im-ow', el).checked });
      $('#im-scan', el).onclick = async (e) => {
        const o = opsi(); if (!o.source) { toast('Tempel URL spreadsheet lama.', 'warn'); return; }
        e.currentTarget.disabled = true; res.innerHTML = '<div class="g-skel sm"></div>';
        const r = await api('importScan', o);
        e.currentTarget.disabled = false;
        if (!r.success) { res.innerHTML = '<p class="note-bad">' + esc(r.message) + '</p>'; return; }
        const d = r.data, pil = new Set(d.pilihan.map((x) => x.sheet));
        res.innerHTML = '<h3 class="mt">Sumber: ' + esc(d.source.nama) + '</h3><div class="g-table-scroll"><table class="g-table compact"><thead><tr><th></th><th>Sheet</th><th>Terdeteksi</th><th>Baris</th><th>Akan ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' +
          d.sheets.map((s) => { const rp = d.report[s.sheet] || {}; return '<tr><td><input type="checkbox" data-sh="' + esc(s.sheet) + '" data-j="' + s.jenis + '"' + (pil.has(s.sheet) ? ' checked' : '') + (s.jenis ? '' : ' disabled') + '></td><td><b>' + esc(s.sheet) + '</b>' + (Object.keys(s.peta).length ? '<small class="d">' + Object.keys(s.peta).map((k) => k + '←' + esc(s.peta[k])).join(', ') + '</small>' : '') + '</td><td>' + ({ tka: 'TKA QUEST', murid: 'Data murid', soal: 'Bank soal' }[s.jenis] || '<span class="muted">Tidak dikenali</span>') + '</td><td>' + s.baris + '</td><td>' + (rp.ditambah === undefined ? '–' : '<b>' + rp.ditambah + '</b>') + '</td><td>' + (rp.diperbarui === undefined ? '–' : rp.diperbarui) + '</td><td>' + (rp.dilewati === undefined ? '–' : rp.dilewati) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' + (d.warnings.length ? '<ul class="warn-list">' + d.warnings.map((w) => '<li>' + icon('alert-triangle', 'ic-xs') + esc(w) + '</li>').join('') + '</ul>' : '') +
          '<div class="g-row-end"><small class="muted">Angka di atas hasil pindai (dry-run). Belum ada yang ditulis.</small><button class="g-btn g-btn-primary" id="im-run">' + icon('database', 'ic-sm') + 'Jalankan import</button></div>';
        $('#im-run', res).onclick = async () => {
          const pilihan = $$('[data-sh]', res).filter((c) => c.checked).map((c) => ({ sheet: c.dataset.sh, jenis: c.dataset.j }));
          if (!pilihan.length) { toast('Centang minimal satu sheet.', 'warn'); return; }
          if (!(await confirmDlg('Jalankan import sekarang?', 'Data dari ' + pilihan.length + ' sheet akan ditambahkan ke app ini. Spreadsheet lama tidak berubah. Import aman diulang.', 'Jalankan'))) return;
          busy(true, 'Mengimpor data…');
          const rr = await api('importRun', Object.assign(opsi(), { pilihan }), { timeout: 300000 });
          busy(false);
          if (!rr.success) { toast(rr.message, 'error'); return; }
          importDone(rr.data);
        };
      };
      $('#csv-m', el).onclick = () => csvImporter('murid', A);
      $('#csv-s', el).onclick = () => csvImporter('soal', A);
      $('#tpl-m', el).onclick = () => downloadCsv('template-murid.csv', [['nama', 'nisn', 'kelas'], ['Budi Santoso', '0012398120', '6A'], ['Siti Aisyah', '0012398121', '6A']]);
      $('#tpl-s', el).onclick = () => downloadCsv('template-soal.csv', [['mapel', 'materi', 'tingkat', 'stimulus', 'soal', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci', 'pembahasan', 'gambar'],
        ['Numerasi', 'Pecahan dan desimal', 'Mudah', '', 'Bentuk desimal dari 1/4 adalah ...', '0,25', '0,4', '1,4', '0,14', 'A', '1/4 = 25/100 = 0,25', ''],
        ['Literasi', 'Ide pokok', 'Sedang', 'Teks bacaan di sini…', 'Ide pokok paragraf tersebut adalah ...', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'B', 'Alasan jawaban', 'https://drive.google.com/file/d/ID_GAMBAR/view']]);
      $('#perf-go', el).onclick = async () => {
        const box = $('#perf', el); box.innerHTML = '<div class="g-skel sm"></div>';
        const r = await api('performa', {});
        if (!r.success) { box.innerHTML = '<p class="note-bad">' + esc(r.message) + '</p>'; return; }
        const p = r.data, perf = TQ.Perf.rows.slice(-40), avg = perf.length ? Math.round(perf.reduce((s, x) => s + x.total, 0) / perf.length) : 0;
        box.innerHTML = '<div class="kv"><span>Versi server</span><b>' + esc(p.versi) + '</b><span>Cache data dasar</span><b class="' + (p.cacheStatis === 'HANGAT' ? 'ok-t' : '') + '">' + p.cacheStatis + '</b><span>Cache bank soal</span><b class="' + (p.cacheSoal === 'HANGAT' ? 'ok-t' : '') + '">' + p.cacheSoal + '</b>' +
          '<span>Pemanas terakhir</span><b>' + (p.warmTerakhir ? relTime(p.warmTerakhir.at) + ' (' + p.warmTerakhir.scope + ')' : '–') + '</b><span>KeepWarm</span><b>' + (p.keepWarm ? 'Hidup (05.00–22.00)' : 'Mati') + '</b><span>Trigger</span><b>' + (p.trigger.join(', ') || '<span class="bad-t">Belum ada — jalankan setupTurbo()</span>') + '</b>' +
          '<span>Antrean log</span><b>' + p.antreanLog + '</b><span>Script Properties</span><b>' + Math.round(p.ukuranProperti / 1024) + ' KB / ' + Math.round(p.batasProperti / 1024) + ' KB</b><span>Rata-rata respons (perangkat ini)</span><b>' + (avg ? avg + ' ms dari ' + perf.length + ' panggilan' : '–') + '</b></div>' +
          '<h3 class="mt">Jumlah baris</h3><div class="kv">' + Object.keys(p.barisSheet).map((k) => '<span>' + esc(k) + '</span><b>' + fmtN(p.barisSheet[k]) + '</b>').join('') + '</div>' +
          (p.spreadsheet ? '<a class="g-btn g-btn-outline" href="' + esc(p.spreadsheet) + '" target="_blank" rel="noopener">' + icon('external-link', 'ic-sm') + 'Buka spreadsheet database</a>' : '');
      };
      const dd = $('#demo-del', el); if (dd) dd.onclick = async () => {
        if (!(await confirmDlg('Hapus semua data demo?', 'Murid demo dan seluruh riwayat jawabannya dihapus permanen. Murid sungguhan tidak tersentuh.', 'Hapus data demo', true))) return;
        busy(true, 'Menghapus data demo…'); const r = await api('hapusDemo', {}); busy(false);
        toast(r.success ? r.data.dihapus + ' murid demo dihapus.' : r.message, r.success ? 'success' : 'error');
        if (r.success) { Object.keys(localStorage).filter((k) => k.indexOf('dash:') > -1).forEach((k) => localStorage.removeItem(k)); this.loadAdmin(true); }
      };
    }
  });
  function importDone(d) {
    const rows = Object.keys(d.report).map((k) => '<tr><td><b>' + esc(k) + '</b></td><td>' + d.report[k].sumber + '</td><td><b>' + d.report[k].ditambah + '</b></td><td>' + d.report[k].diperbarui + '</td><td>' + d.report[k].dilewati + '</td></tr>').join('');
    Object.keys(localStorage).filter((k) => /:(dash:|soal|admin|md:)/.test(k)).forEach((k) => localStorage.removeItem(k));
    modal({ title: d.dryRun ? 'Hasil pindai' : 'Import selesai', size: 'lg', body: '<div class="g-table-scroll"><table class="g-table compact"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (d.warnings.length ? '<ul class="warn-list">' + d.warnings.map((w) => '<li>' + icon('alert-triangle', 'ic-xs') + esc(w) + '</li>').join('') + '</ul>' : '') +
      (d.akun && d.akun.length ? '<p class="note-info">' + icon('key', 'ic-sm') + d.akun.length + ' akun murid baru dibuat dengan PIN baru. Cetak kartunya sekarang.</p>' : ''),
      actions: (d.akun && d.akun.length ? [{ label: 'Lihat & cetak PIN', icon: 'printer', cls: 'g-btn g-btn-primary', onClick: () => setTimeout(() => tampilAkun(d.akun, 'Akun murid hasil import'), 220) }] : []).concat([{ label: 'Tutup' }]) });
  }

  // ---- impor CSV (diurai di browser, dry-run dulu)
  function parseCsv(text) {
    text = text.replace(/^\ufeff/, '');
    const first = text.split(/\r?\n/)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.indexOf('\t') > -1 ? '\t' : ',');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const h = (rows.shift() || []).map((x) => x.trim());
    return rows.filter((r) => r.join('').trim()).map((r) => { const o = {}; h.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); }); return o; });
  }
  function csvImporter(jenis, A) {
    const kelas = A ? A.kelas.filter((k) => k.aktif) : (boot().kelas || []);
    let rows = [];
    const dlg = modal({ title: jenis === 'murid' ? 'Import murid dari CSV' : 'Import soal dari CSV', size: 'lg', body:
      '<label class="g-field"><span>Berkas CSV</span><input type="file" class="g-input" id="cv-f" accept=".csv,text/csv"></label>' +
      (jenis === 'murid' ? '<label class="g-field"><span>Kelas tujuan (bila kolom kelas kosong/tidak cocok)</span><select class="g-input" id="cv-k">' + kelas.map((k) => '<option value="' + esc(k.id) + '"' + (k.id === G.kelas ? ' selected' : '') + '>Kelas ' + esc(k.nama) + '</option>').join('') + '</select></label>'
        : '<label class="g-field"><span>Mapel default (bila kolom mapel kosong)</span><select class="g-input" id="cv-m"><option>Literasi</option><option>Numerasi</option></select></label>') +
      '<label class="g-check"><input type="checkbox" id="cv-ow"> Timpa data yang sudah ada</label><div id="cv-res"></div>',
      actions: [{ label: 'Batal' }, { label: 'Pindai dulu', cls: 'g-btn g-btn-ghost', close: false, onClick: () => run(true) }, { label: 'Jalankan import', cls: 'g-btn g-btn-primary', close: false, onClick: () => run(false) }] });
    $('#cv-f', dlg.el).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; rows = parseCsv(await f.text()); $('#cv-res', dlg.el).innerHTML = '<p class="small">' + rows.length + ' baris terbaca. Kolom: ' + esc(Object.keys(rows[0] || {}).join(', ')) + '</p>'; };
    async function run(dry) {
      if (!rows.length) { toast('Pilih berkas CSV dulu.', 'warn'); return; }
      const res = $('#cv-res', dlg.el); res.innerHTML = '<div class="g-skel sm"></div>';
      const r = await api('importCsv', { jenis, rows, dryRun: dry, overwrite: $('#cv-ow', dlg.el).checked, kelasTujuan: ($('#cv-k', dlg.el) || {}).value, mapelDefault: ($('#cv-m', dlg.el) || {}).value }, { timeout: 180000 });
      if (!r.success) { res.innerHTML = '<p class="note-bad">' + esc(r.message) + '</p>'; return; }
      if (dry) { const k = Object.keys(r.data.report)[0], x = r.data.report[k]; res.innerHTML = '<p class="note-info">Pindai: ' + x.ditambah + ' akan ditambah, ' + x.diperbarui + ' diperbarui, ' + x.dilewati + ' dilewati.</p>' + (r.data.warnings.length ? '<ul class="warn-list">' + r.data.warnings.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>' : ''); return; }
      dlg.close();
      if (jenis === 'soal') { cacheStale('soal'); if (AppState.page === 'soal') TQ.Pages.soal.load(true); }
      setTimeout(() => importDone(r.data), 220);
    }
  }

  window.GuruApp = { G, prefetch };
})();
