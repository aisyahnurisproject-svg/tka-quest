# 📋 PANDUAN INSTALASI — TKA QUEST: Akademi Penjelajah Ilmu

Versi 1.0.0 • Backend: Google Apps Script (REST API) • Frontend: GitHub Pages

TKA QUEST terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Berkas | Dipasang di |
|---|---|---|
| **Backend** (otak & database) | `Kode.gs`, `Migrasi.gs` | Google Apps Script, memakai Google Sheets & Drive Anda |
| **Frontend** (tampilan) | folder `tka-quest/` (isi ZIP) | GitHub Pages (gratis) |

Siapkan: akun Google sekolah/pribadi (pemilik data), akun GitHub, dan komputer/laptop. Waktu pemasangan sekitar 30–45 menit.

---

## BAGIAN A — Pasang Backend (Google Apps Script)

### A1. Buat proyek
1. Buka **https://script.google.com** → klik **Proyek baru**.
2. Klik judul "Proyek tanpa judul" → ganti menjadi `TKA QUEST Backend`.

### A2. Tempel kode
1. Klik berkas `Code.gs` di kiri → ganti namanya menjadi `Kode`.
2. Hapus seluruh isinya, lalu tempel **seluruh** isi `Kode.gs`.
3. Klik **＋** (Tambah berkas) → **Skrip** → beri nama `Migrasi` → tempel seluruh isi `Migrasi.gs`.
4. Tekan **Ctrl+S** (Simpan).

> Opsional tapi disarankan: **Setelan proyek** (ikon roda gigi) → centang *Tampilkan file manifes "appsscript.json"* → buka `appsscript.json` → ganti isinya dengan berkas `appsscript.json` dari paket ini. Ini memastikan zona waktu **Asia/Jakarta**.

### A3. Jalankan pemasangan pertama
1. Di bilah atas, pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul permintaan izin → **Tinjau izin** → pilih akun Anda → **Lanjutan** → **Buka TKA QUEST Backend (tidak aman)** → **Izinkan**.
   (Peringatan "tidak aman" normal untuk skrip buatan sendiri. Skrip hanya mengakses Drive & Sheets milik Anda.)
3. Tunggu ±30–60 detik sampai **Log eksekusi** menampilkan `SETUP SELESAI`.
4. **CATAT** baris ini dari log:
   ```
   🔑 Login guru/admin → username: admin   sandi: xxxxxxxx
   ```
   Sandi ini hanya muncul sekali. Lupa? Jalankan fungsi `resetSandiAdmin`.

Yang otomatis dibuat di Google Drive Anda:
- 📁 `TKA QUEST — Akademi Penjelajah Ilmu` berisi 🗃️ `Database — TKA QUEST` (12 sheet), 🖼️ `Gambar Soal`, 📂 `Laporan`.
- 30 soal contoh (6 wilayah), 10 lencana, kelas 6A, dan 8 murid demo (PIN `2468`) supaya dasbor langsung berisi. Hapus nanti lewat **Pengaturan → Data & Migrasi**.
- Trigger `keepWarm` tiap 1 menit (menjaga app tetap cepat, lihat Bagian F).

> Aman dijalankan ulang: `setupAppEnvironment` tidak membuat duplikat. Ia hanya melengkapi yang kurang.

### A4. Deploy sebagai Web App
1. Klik **Terapkan (Deploy)** → **Deployment baru**.
2. Ikon roda gigi di "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - Deskripsi: `v1.0.0`
   - **Jalankan sebagai: Saya (Me)**
   - **Yang memiliki akses: Siapa saja (Anyone)**
4. Klik **Terapkan** → **SALIN URL** yang berakhiran **`/exec`**.

> Kenapa "Siapa saja"? Murid tidak memakai akun Google, jadi pengamanan dilakukan oleh login username + PIN/sandi di dalam app, bukan oleh Google. Tanpa login yang sah, server menolak semua data.

### A5. Uji server
Buka di browser: `URL_EXEC_ANDA?w=pub` → harus tampil teks seperti `{"success":true,"data":{"warm":"ok"},...}`.

---

## BAGIAN B — Pasang Frontend (GitHub Pages)

### B1. Isi alamat server
1. Ekstrak ZIP. Anda mendapat folder **`tka-quest`**.
2. Buka `tka-quest/js/config.js` dengan Notepad.
3. Ganti `https://script.google.com/macros/s/GANTI_DENGAN_URL_DEPLOY_ANDA/exec` dengan URL `/exec` dari langkah A4. Simpan.

### B2. Pasang Git (sekali saja)
- **Windows:** unduh dari https://git-scm.com/download/win → pasang dengan pilihan bawaan → buka **PowerShell**.
- **Mac:** buka Terminal → ketik `git --version` (macOS menawarkan pemasangan otomatis).

Cek: `git --version` harus menampilkan nomor versi.

Atur identitas (sekali seumur komputer):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### B3. Buat repository di GitHub
github.com → tombol **＋** → **New repository** → nama misalnya `tka-quest` → pilih **Public** → **JANGAN** centang README/.gitignore/license → **Create repository**. Biarkan halamannya terbuka.

### B4. Masuk ke folder yang BENAR (paling penting!)
Folder kerja Anda adalah **`tka-quest`**, yaitu folder yang langsung berisi `index.html`. Bukan folder induknya.

Windows: buka folder `tka-quest` di File Explorer → klik address bar → ketik `powershell` → Enter.

Lalu cek isinya:
```powershell
dir
```
Harus terlihat **`index.html`**, folder **`css`**, folder **`js`**, `sw.js`, `manifest.webmanifest`. Kalau yang terlihat malah folder `tka-quest`, ketik `cd tka-quest` dulu. **Jangan lanjut sebelum `index.html` terlihat.**

### B5. Kirim ke GitHub
Jalankan satu per satu:
```bash
git init
git add .
git commit -m "Upload pertama TKA QUEST"
git branch -M main
git remote add origin https://github.com/USERNAME/tka-quest.git
git push -u origin main
```
(Ganti `USERNAME` dengan username GitHub Anda. Perhatikan **titik** di `git add .`)

Saat diminta **Password**, yang ditempel adalah **Personal Access Token**, bukan sandi GitHub:
1. Buka https://github.com/settings/tokens → **Generate new token (classic)**.
2. Note: `tka-quest`, Expiration: 90 hari, centang **repo** → **Generate token** → salin `ghp_...`.
3. Tempel di terminal (layar memang **tidak menampilkan apa pun** saat menempel — itu normal) → Enter.

Berhasil bila muncul `Writing objects: 100%` dan `[new branch] main -> main`.

### B6. Aktifkan Pages
Repo di github.com → **Settings** → **Pages**:
- Source: **Deploy from a branch**
- Branch: **main** / **(root)** → **Save**
- Centang **Enforce HTTPS**

Tunggu 1–2 menit → muncul `Your site is live at https://USERNAME.github.io/tka-quest/`. Buka alamat itu.

> Jangan pernah memakai "Add file → Upload files" di web GitHub. Cara itu meratakan folder sehingga CSS/JS tidak termuat.

---

## BAGIAN C — Pengaturan Pertama di Aplikasi

1. Buka alamat GitHub Pages → tab **Guru** → masuk dengan `admin` + sandi dari log.
2. **Pengaturan → Keamanan Akun** → ganti sandi admin.
3. **Pengaturan → Identitas Sekolah** → isi nama sekolah, NPSN, alamat, kota, kepala sekolah, tanggal TKA, dan **Alamat aplikasi** (URL GitHub Pages, dicetak di kartu login). Unggah logo.
4. **Pengaturan → Kelas & Guru** → buat akun guru lain dan kelas (mis. 6B), lalu tetapkan wali kelasnya. Setiap guru hanya melihat murid kelasnya.
5. **Daftar Murid → Tambah Murid** → tempel daftar nama (satu per baris, NISN opsional setelah koma) → PIN 4 angka dibuat otomatis → **Cetak kartu login**.
   PIN hanya tampil sekali (disimpan dalam bentuk sandi tersandi). Lupa? **Reset PIN**.
6. **Pengaturan → Data & Migrasi → Hapus data demo** sebelum dipakai murid sungguhan.
7. Uji dengan satu akun murid di HP: masuk → check-in → selesaikan satu misi.

---

## BAGIAN D — Import Data dari App Lama (Migrasi)

Menu: **Pengaturan → Data & Migrasi** (khusus admin).

**Dari spreadsheet app lama** (TKA QUEST versi lama, SmartTKA Studio, Siap TKA, atau spreadsheet daftar siswa/bank soal apa pun):
1. Tempel URL spreadsheet lama → pilih **Kelas tujuan** → klik **Pindai (tanpa menulis)**.
2. Periksa tabel: sheet yang dikenali, peta kolom (mis. `nama←Nama Siswa`), jumlah yang akan ditambah/diperbarui/dilewati, dan peringatan.
3. Centang sheet yang ingin diimpor → **Jalankan import**.
4. Akun murid baru mendapat PIN baru → klik **Lihat & cetak PIN**.

**Dari CSV** (Dapodik/Excel): unduh template → isi → simpan sebagai CSV → **Import murid/soal (CSV)** → **Pindai dulu** → **Jalankan import**.

Jaminan & batasan:
- Spreadsheet lama **hanya dibaca**, tidak pernah diubah.
- Import **aman diulang**. Jalankan sekali lagi tepat sebelum pindah (delta sync) untuk menangkap data baru, tanpa baris dobel.
- Progres murid (XP, misi, lencana) memakai **nilai tertinggi**, sehingga tidak pernah turun.
- Sesi & PIN lama tidak ikut (kunci keamanannya berbeda). Murid memakai PIN baru dari kartu.
- Akun guru lama tidak diimpor demi keamanan. Buat ulang di Kelas & Guru.
- Gambar soal dari Drive ikut bila app lama dimiliki **akun Google yang sama**.
- Untuk pemetaan kolom yang paling tepat dari app tertentu, kirimkan `Kode.gs` app lama tersebut.

---

## BAGIAN E — Cara Update di Kemudian Hari

**Backend** (URL `/exec` tidak boleh berubah):
1. Cadangkan kode lama (salin ke Notepad).
2. Tempel kode baru → Simpan.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
   ⚠️ Jangan memilih "Deployment baru", karena URL akan berubah dan frontend berhenti bekerja.

**Frontend:**
1. Salin berkas baru ke folder `tka-quest` (timpa).
2. Naikkan angka versi di `js/config.js` (`VERSION`) **dan** di `index.html` (semua `?v=1.0.0`) agar HP murid memuat versi baru.
3. Dari folder `tka-quest`:
   ```bash
   git add .
   git commit -m "Update v1.0.1"
   git push
   ```
4. Tunggu 1–2 menit → **Ctrl+Shift+R** di browser.

---

## BAGIAN F — Kecepatan & Keamanan (yang sudah terpasang)

**Kenapa terasa instan:**
- Login langsung membawa seluruh data layar pertama (1 panggilan server, bukan 2–3).
- Data disimpan di perangkat, jadi pindah menu tidak menunggu server. Data disegarkan diam-diam di latar.
- Soal misi berikutnya disiapkan di latar saat murid membuka Basecamp, sehingga tombol "Berangkat" langsung jalan.
- Benar/salah dan pembahasan muncul seketika di HP. Nilai resmi tetap dihitung ulang di server saat misi dikirim.
- Offline di tengah misi? Hasil tersimpan di HP dan terkirim otomatis saat sinyal kembali.
- Server: cache berversi (pecahan > 100 KB), satu kali baca sheet per permintaan, batch, dan log berantrean.
- **Pemanas 3 lapis:** browser memanggil `?w=` saat halaman login dibuka, trigger `keepWarm` berjalan tiap menit pukul 05.00–22.00 WIB, dan cache dipanaskan setelah setup. Catatan jujur: cara ini menjamin cache selalu siap, tetapi tidak bisa menjamin mesin Google tidak pernah "dingin". Permintaan pertama setelah lama sepi bisa 2–4 detik.
- Kuota trigger: ±5–10 menit per hari dari jatah 90 menit (akun @gmail.com). Matikan dengan fungsi `matikanKeepWarm` bila perlu, nyalakan lagi dengan `nyalakanKeepWarm`. Cek kondisi lewat `cekPerforma` atau **Pengaturan → Data & Migrasi → Performa server**.

**Keamanan:**
- PIN murid & sandi guru disimpan sebagai hash bergaram + pepper rahasia, tidak pernah dalam bentuk asli.
- Token sesi ditandatangani HMAC-SHA256. Murid 7 hari, guru 3 hari. Token palsu atau diubah langsung ditolak.
- 5 kali salah PIN/sandi → akun terkunci 10 menit. Guru bisa membuka kunci dari detail murid.
- Reset PIN, ganti sandi, atau nonaktifkan akun langsung mengeluarkan sesi di semua perangkat.
- Setiap aksi diperiksa perannya di server. Guru hanya bisa membuka murid kelasnya sendiri. Aksi admin khusus admin.
- Kunci jawaban tidak pernah dikirim ke HP. HP hanya menerima sidik jari tersandi untuk umpan balik instan, sedangkan XP dihitung ulang di server dengan token misi bertanda tangan (tidak bisa dikirim dua kali, kedaluwarsa 3 jam, batas misi per hari).
- Teks berawalan `=`, `+`, `-`, `@` diamankan agar tidak menjadi rumus di Sheets. Kolom teks dikunci format "teks" sehingga `3/4` tidak berubah jadi tanggal dan NISN berawalan 0 tetap utuh.
- Jangan hapus `TOKEN_SECRET` dan `HASH_PEPPER` di Script Properties. Menghapusnya membuat semua PIN/sandi tidak berlaku.

---

## BAGIAN G — Kendala Umum

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "URL server belum diisi di js/config.js" | `GAS_URL` belum diganti | Isi URL `/exec`, lalu `git add .` → `git commit -m "config"` → `git push` |
| Halaman 404 di GitHub Pages | `git init` di folder yang salah | Pastikan `index.html` terlihat di halaman repo. Bila tidak, push ulang dari folder `tka-quest` |
| Tampilan polos tanpa warna | Upload lewat web GitHub (folder rata) | Push lewat terminal (Bagian B5) |
| "Sesi berakhir" terus-menerus | Jam perangkat salah / token dicabut | Betulkan jam HP, lalu masuk lagi |
| "Aplikasi belum dipasang" | `setupAppEnvironment` belum dijalankan | Jalankan di editor Apps Script |
| Perubahan backend tidak berlaku | Lupa membuat versi baru | Kelola deployment → Edit → Versi baru |
| Versi lama tetap tampil | Cache browser | Naikkan `VERSION`, lalu Ctrl+Shift+R |
| Gambar soal tidak tampil di HP murid | Kebijakan Google Workspace melarang berbagi publik | Minta admin Workspace mengizinkan "siapa saja yang memiliki link", atau pakai akun @gmail.com |
| PIN terkunci | 5 kali salah | Guru: detail murid → **Buka kunci** atau **Reset PIN** |
| Lupa sandi admin | — | Editor Apps Script → jalankan `resetSandiAdmin` → lihat log |
| `Password authentication is not supported` | GitHub menolak sandi biasa | Pakai Personal Access Token (B5) |

---

## Ringkasan hasil uji (sebelum diserahkan)

Diuji di **simulator Google Apps Script** (Node, meniru batas cache 100 KB, konversi angka/tanggal Sheets, lock) dan **browser Chromium** (HP 390 px & desktop 1366–1440 px):

- **Backend: 47/47 lulus.**
  - Pemasangan & data: setup aman diulang, format teks terjaga.
  - Keamanan: login & penguncian PIN, token palsu ditolak, cakupan kelas guru.
  - Misi: penilaian server, idempotensi, batas harian.
  - Laporan: PDF, Sheets, dan cache untuk 400 soal.
  - Migrasi: pindai tanpa menulis, sumber tidak berubah, import ulang tanpa dobel, progres memakai nilai tertinggi.
- **Browser: 19/19 lulus, 0 error JavaScript.**
  - Login murid/guru = 1 panggilan server. Pindah menu tanpa panggilan tambahan.
  - Mulai misi ±0,15 detik (sudah diprefetch). Umpan balik jawaban ±0,05 detik.
  - Mode offline → terkirim otomatis saat online.
  - Tanpa scroll horizontal di HP. Tabel guru berubah jadi kartu di HP. PDF terunduh.
- **Ukuran unduhan HP murid:** ±42 KB (gzip). Panel guru ±33 KB dimuat terpisah hanya untuk guru.

Angka waktu di atas diukur di simulator lokal. Di server Google sungguhan, setiap panggilan ke server menambah ±0,5–2 detik. Karena itulah sebagian besar layar dirancang agar tidak menunggu server sama sekali.
