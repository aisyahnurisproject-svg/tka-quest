/* TKA QUEST — subset ikon (gaya garis 24px), avatar berevolusi, dan bos wilayah.
   Semua inline SVG: tanpa pustaka ikon CDN (hemat ±350 KB). */
(function () {
  const I = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
    swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>',
    backpack: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 10h8"/><path d="M8 18h8"/><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M12 3v18"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'bar-chart': '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    'cloud-off': '<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10.5 5.12"/>',
    school: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    'message': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'list': '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    'wand': '<path d="m15 4-1 1"/><path d="m20 9-1 1"/><path d="M18 2v2"/><path d="M22 6h-2"/><path d="m3 21 12-12"/><path d="m14 6 4 4"/>',
    'hourglass': '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    'move': '<path d="M12 2v20"/><path d="M2 12h20"/>',
    'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    'tree': '<path d="M12 22v-6"/><path d="M5 16h14l-3.5-5H17L12 3 7 11h1.5z"/>'
  };
  window.ICONS = I;
  /** Ikon inline: icon('flame', 'ic-sm') */
  window.icon = function (name, cls) {
    const b = I[name] || I['info'];
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + b + '</svg>';
  };

  // ---------------- AVATAR BEREVOLUSI ----------------
  const AV = {
    A1: { nama: 'Penjelajah Rimba', skin: '#F2C9A0', hair: '#4B2E1A', shirt: '#16A34A', acc: '#FBBF24', bg: '#DCFCE7',
      hat: '<path d="M16 27 Q40 19 64 27 L60 30 Q40 24 20 30Z" fill="#7C4A1E"/><path d="M27 26 C27 11 53 11 53 26Z" fill="#A16207"/><rect x="27" y="22" width="26" height="4" fill="#5B3410"/>' },
    A2: { nama: 'Ksatria Hitung', skin: '#E0AC69', hair: '#1F2937', shirt: '#0284C7', acc: '#F59E0B', bg: '#E0F2FE',
      hat: '<path d="M22 32 C21 13 59 13 58 32 L54 31 C53 21 27 21 26 31Z" fill="#94A3B8"/><path d="M38 8 h4 l2 10 h-8z" fill="#DC2626"/><rect x="25" y="27" width="30" height="4" rx="2" fill="#64748B"/>' },
    A3: { nama: 'Pujangga Cilik', skin: '#F1C27D', hair: '#3F2A1D', shirt: '#7C3AED', acc: '#F472B6', bg: '#EDE9FE',
      hat: '<ellipse cx="43" cy="20" rx="18" ry="7" fill="#6D28D9"/><circle cx="44" cy="12" r="2.5" fill="#6D28D9"/><path d="M58 18 q6 6 2 12" stroke="#FBBF24" stroke-width="2" fill="none"/>' },
    A4: { nama: 'Pemburu Kata', skin: '#C68642', hair: '#111827', shirt: '#EA580C', acc: '#0284C7', bg: '#FFEDD5',
      hat: '<path d="M22 27 Q40 15 58 27 L58 31 Q40 21 22 31Z" fill="#DC2626"/><path d="M57 28 l9 -2 l-3 6 l5 3 l-10 0z" fill="#B91C1C"/>' },
    A5: { nama: 'Arsitek Logika', skin: '#D9A066', hair: '#2D1B0E', shirt: '#0D9488', acc: '#F59E0B', bg: '#CCFBF1',
      hat: '<path d="M24 27 C24 13 56 13 56 27Z" fill="#F59E0B"/><path d="M40 25 L68 27 Q66 31 56 30Z" fill="#D97706"/><circle cx="40" cy="15" r="2" fill="#B45309"/>' },
    A6: { nama: 'Pelacak Jejak', skin: '#8D5524', hair: '#0B0F19', shirt: '#334155', acc: '#22C55E', bg: '#E2E8F0',
      hat: '<path d="M17 44 C13 13 67 13 63 44 L58 44 C59 23 21 23 22 44Z" fill="#0F766E"/><path d="M40 13 l3 -5 l3 5z" fill="#0F766E"/>' }
  };
  window.AVATARS = AV;
  /** Tahap evolusi: 1 (lv1–4), 2 (lv5–9), 3 (lv10+) */
  window.avatarStage = function (level) { return level >= 10 ? 3 : level >= 5 ? 2 : 1; };
  window.avatarSvg = function (id, level, size) {
    const a = AV[id] || AV.A1, st = window.avatarStage(level || 1), s = size || 64;
    let x = '<svg class="avatar-svg" width="' + s + '" height="' + s + '" viewBox="0 0 80 80" role="img" aria-label="Avatar ' + a.nama + '">' +
      '<circle cx="40" cy="40" r="40" fill="' + a.bg + '"/>';
    if (st === 3) x += '<circle cx="40" cy="40" r="37" fill="none" stroke="#FBBF24" stroke-width="3" stroke-dasharray="4 3"/>';
    x += '<path d="M13 80 C13 61 26 53 40 53 C54 53 67 61 67 80Z" fill="' + a.shirt + '"/>' +
      '<rect x="35" y="45" width="10" height="10" rx="3" fill="' + a.skin + '" opacity=".85"/>' +
      '<circle cx="40" cy="35" r="17" fill="' + a.skin + '"/>' +
      '<path d="M23 34 C22 20 31 16 40 16 C49 16 58 20 57 34 C53 28 47 26 40 26 C33 26 27 28 23 34Z" fill="' + a.hair + '"/>' +
      '<circle cx="34" cy="37" r="2.3" fill="#2E384D"/><circle cx="46" cy="37" r="2.3" fill="#2E384D"/>' +
      '<circle cx="34.8" cy="36.2" r=".8" fill="#fff"/><circle cx="46.8" cy="36.2" r=".8" fill="#fff"/>' +
      '<circle cx="29.5" cy="42" r="2.7" fill="#F87171" opacity=".35"/><circle cx="50.5" cy="42" r="2.7" fill="#F87171" opacity=".35"/>' +
      '<path d="M35 43 Q40 48 45 43" stroke="#2E384D" stroke-width="2" fill="none" stroke-linecap="round"/>' + a.hat;
    if (st >= 2) x += '<path d="M27 54 Q40 62 53 54 L55 59 Q40 68 25 59Z" fill="' + a.acc + '"/><path d="M40 64 l2 4 4 .5-3 3 .8 4.2L40 74l-3.8 1.7.8-4.2-3-3 4-.5z" fill="#FBBF24" stroke="#B45309" stroke-width=".6"/>';
    if (st === 3) x += '<path d="M12 18 l1.6 3.4 3.4 1.6-3.4 1.6L12 28l-1.6-3.4L7 23l3.4-1.6z" fill="#FBBF24"/><path d="M68 14 l1.2 2.6 2.6 1.2-2.6 1.2L68 21.6l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#FBBF24"/>';
    return x + '</svg>';
  };

  // ---------------- BOS WILAYAH ----------------
  window.bossSvg = function (warna, idx, size) {
    const c = warna || '#7C3AED', s = size || 96;
    const tanduk = ['<path d="M30 30 L22 12 L38 24Z M70 30 L78 12 L62 24Z" fill="#FDE68A" stroke="#2E384D" stroke-width="2"/>',
      '<rect x="26" y="16" width="48" height="10" rx="3" fill="#94A3B8" stroke="#2E384D" stroke-width="2"/>',
      '<path d="M50 6 L58 26 L42 26Z" fill="#FDE68A" stroke="#2E384D" stroke-width="2"/>',
      '<path d="M28 28 L36 8 L44 26 L50 6 L56 26 L64 8 L72 28Z" fill="#A5F3FC" stroke="#2E384D" stroke-width="2"/>',
      '<path d="M18 46 Q8 30 22 22 Q26 36 32 40Z M82 46 Q92 30 78 22 Q74 36 68 40Z" fill="' + c + '" stroke="#2E384D" stroke-width="2"/>',
      '<path d="M30 26 L34 10 L42 20 L50 6 L58 20 L66 10 L70 26Z" fill="#FBBF24" stroke="#2E384D" stroke-width="2"/>'][(idx || 0) % 6];
    return '<svg class="boss-svg" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" aria-hidden="true">' + tanduk +
      '<path d="M18 62 C18 34 32 24 50 24 C68 24 82 34 82 62 C82 82 70 92 50 92 C30 92 18 82 18 62Z" fill="' + c + '" stroke="#2E384D" stroke-width="3"/>' +
      '<ellipse cx="50" cy="70" rx="20" ry="14" fill="#fff" opacity=".22"/>' +
      '<path d="M32 48 L44 52" stroke="#2E384D" stroke-width="3" stroke-linecap="round"/><path d="M68 48 L56 52" stroke="#2E384D" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="39" cy="57" r="5" fill="#fff" stroke="#2E384D" stroke-width="2"/><circle cx="61" cy="57" r="5" fill="#fff" stroke="#2E384D" stroke-width="2"/>' +
      '<circle cx="40" cy="58" r="2.4" fill="#2E384D"/><circle cx="60" cy="58" r="2.4" fill="#2E384D"/>' +
      '<path d="M40 74 Q50 68 60 74" stroke="#2E384D" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M44 72 l2 4 2-4 M52 72 l2 4 2-4" stroke="#fff" stroke-width="2" fill="none"/></svg>';
  };
})();
