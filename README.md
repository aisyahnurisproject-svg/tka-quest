# TKA QUEST — Akademi Penjelajah Ilmu

Aplikasi latihan Literasi & Numerasi TKA kelas 6 SD/MI bergaya petualangan RPG, dengan dasbor pemantauan guru.

- **Frontend:** HTML/CSS/JS murni (tanpa framework), di-host di GitHub Pages.
- **Backend:** Google Apps Script sebagai REST API JSON (`fetch` ke URL `/exec`). Kode backend **tidak** disimpan di repo ini.
- **Database:** Google Sheets & Google Drive milik sekolah.

## Struktur
```
index.html            halaman induk (SPA)
css/app.css           tampilan murid + komponen bersama
css/guru.css          tampilan guru (dimuat hanya untuk guru)
js/config.js          ⬅️ ISI URL /exec DI SINI
js/icons.js           ikon, avatar, bos (SVG inline)
js/core.js            API, cache perangkat, router, login
js/murid.js           Basecamp, Peta, Misi, Hasil, Ransel, Liga
js/guru.js            Beranda, Murid, Bank Soal, Laporan, Pengaturan
sw.js                 service worker (buka ulang instan)
```

Panduan lengkap: **PANDUAN-INSTALASI.md**. Diagnostik performa di console browser: `Perf.table()` / `Perf.summary()`.
