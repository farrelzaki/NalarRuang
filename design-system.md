# Design System NalarRuang

## 0. Metadata Dokumen

| Butir | Isi |
|---|---|
| Versi | 2.0 |
| Tanggal | 29 September 2026 |
| Pemilik gaya visual | Nur'Afia Avanza (UI/UX Designer) |
| Status | Acuan final. Nilai dari Figma section revisi; layar yang belum digambar diimprovisasi di sini. |
| Figma | `ui-nalar-ruang`, section **"putih kayak bhumi yang udah di revisi"** (node 174:2): https://www.figma.com/design/LDFCKmrGALdO7zDCzbwloZ/ui-nalar-ruang?node-id=174-2 |
| Design system interaktif | https://claude.ai/artifact/7R7qPFSeWx7aVjzCt4GxDR |
| Kanvas contoh | https://claude.ai/artifact/LtCEm8pdhnp5MUtQ2bTtJY |

**Sumber dan kewenangan.** Tampilan: Figma section revisi (final, 29 Sep 2026) → dokumen ini. Bila desain berbeda dengan SRS/WBS/PRD, **desain yang diikuti** dan dokumennya disesuaikan (SRS v1.2). Cakupan fungsi: `docs/sumber/SRS.md`, `prd.md`. Keputusan teknis: `docs/RENCANA.md`.

**Kebijakan.**
1. Gaya visual desain dipakai persis: warna, tipografi, ukuran, radius, bayangan, blur, ikon, tata letak, dan microcopy.
2. **Isi peta di Figma hanya ilustrasi** (masukan Izdihar, 29 Sep 2026). Bentuk area, lokasi contoh, dan rute tidak ditiru; peta digambar dari data dengan aturan bagian 9.
3. Yang belum digambar diimprovisasi dengan meniru komponen terdekat, hanya memakai token di sini.
4. Masalah fungsi (tumpang tindih, kontrol tertutup) diselesaikan lewat perilaku, bukan mengganti gaya.

**Penanda.** `[Dari Desain]` nilai Figma (frame disebut) · `[Improvisasi]` dirancang di sini · `[Ditetapkan]` dari dokumen.

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.1 | 27 Sep 2026 | Nilai dari section `fix` (panel kaca, aksen cyan) |
| 2.0 | 29 Sep 2026 | Acuan pindah ke section revisi: panel putih bergaris navy, tata letak baru, dialog persona dan drawer terdesain, landing baru; bagian Kartografi; ambang bintang Persona Grading |

---

## 1. Prinsip Desain

1. **Peta di tengah, kontrol di tepi.** Kolom kiri untuk mencari dan membaca (search, Top 3, Detail Lokasi, Simulator Rute); kanan atas untuk identitas dan menu; kanan bawah untuk layer dan persona. `[Dari Desain]`
2. **Kertas di atas peta.** Panel putih 0.8 dengan blur 12 dan garis tipis navy 0.2; bukan kaca bening. `[Dari Desain]`
3. **Satu tinta.** Semua teks, ikon, dan status aktif memakai navy `#0F1B3D` dengan tingkat opasitas; warna terang hanya untuk data (layer, bintang, persen). `[Dari Desain]`
4. **Editorial menyapa.** Nama tempat dan judul memakai Fraunces; dialog persona dan landing memakai Georgia dan Inter; kalimat pendek dengan *kamu/-mu*. `[Dari Desain]`
5. **Peta jujur.** Yang tergambar adalah data sebenarnya; legenda menjelaskan persis apa yang digambar. `[Ditetapkan]`

### Cara mengimprovisasi
- Mulai dari komponen desain yang fungsinya paling dekat; ubah isi, bukan gaya. Sebut sumbernya.
- Hanya token dokumen ini. Status: galat `red-600`, peringatan `amber-600`, sukses `green-500` (warna persen MATCH).
- Hover: latar `navy-900 @0.05`. Terpilih: latar `navy-900 @0.05` + garis `line`, atau isi `navy-900` dengan teks putih (toggle, checkbox, tombol LAYER). Nonaktif: opasitas 0.4.
- Ikon Lucide 0.460.0, stroke 1.33–2 sesuai ukuran (bagian 7).
- Label kecil: PJS Bold 9–10, kapital, tracking 0.9–2.

---

## 2. Arsitektur Token

| Lapis | Contoh | Aturan |
|---|---|---|
| Primitive | `navy-900` = `#0F1B3D` | Nilai mentah dari Figma |
| Semantic | `text.primary` → `navy-900` | Dipakai komponen |
| Component | `inspector.width` = 360 | Ukuran khusus komponen (bagian 8) |

Dua tema: **`map`** (aplikasi, `data-theme="map"`) dan **`editorial`** (landing, dialog persona). Tidak ada mode gelap; seksi gelap landing bagian dari `editorial`. Nama CSS: `--color-navy-900`, `--text-primary`; nama sama dengan `tokens.json` di design system interaktif.

---

## 3. Warna

### 3.1 Primitive `[Dari Desain]`

| Keluarga | Token | Nilai | Pemakaian |
|---|---|---|---|
| Navy | `navy-900` | `#0F1B3D` | Tinta utama aplikasi; tombol LAYER aktif; toggle nyala; titik A; lingkaran ikon persona sesi |
| | `navy-ink` | `#081D3C` | Tinta landing |
| | `navy-night` | `#0B1021` | Seksi "Coba Sekarang" |
| Alfa navy-900 | `ink-80` `ink-70` `ink-60` `ink-55` `ink-50` `ink-45` `ink-40` `ink-20` `ink-08` `ink-05` | 0.8 / 0.7 / 0.6 / 0.55 / 0.5 / 0.45 / 0.4 / 0.2 / 0.08 / 0.05 | Kalimat · legenda, nama layer mati · alamat, label moda · teks drawer · label kapital, persona non-sesi · deskripsi drawer · placeholder, nomor · track slider · kotak ikon drawer · lingkaran ikon non-sesi, hover |
| Alfa navy-ink (landing) | `ed-ink-80` `ed-ink-60` `ed-ink-50` | `rgba(8,29,60,…)` 0.8 / 0.6 / 0.5 | Body landing · teks kartu langkah · eyebrow kurung, nama sumber data |
| Garis | `line` | `rgba(8,29,60,0.2)` | Semua garis panel, kartu, pemisah, putus-putus |
| Kertas | `white` / `white-95` / `white-80` / `white-50` | `#FFFFFF` / 0.95 / 0.8 / 0.5 | Panel solid · Profil Persona · panel melayang · Kesimpulan |
| | `stone-50` | `#F7F5F0` | Dialog persona, drawer, kartu istilah, landing |
| | `stone-50-30` | `rgba(247,245,240,0.3)` | Kepala Top 3 |
| | `cream-100` | `#F8F5EE` | Latar landing |
| | `map-ground` | `#E8E6E1` | Latar di bawah tile |
| Slate | `slate-50` / `slate-200` | `#F8FAFC` / `#E2E8F0` | Kotak moda · toggle mati, bintang kosong |
| Aksen data | `red-50` | `#FEF2F2` | Lingkaran pin Detail Lokasi |
| | `pin-red` | `#FB2C36` | Ikon pin tempat |
| | `star-on` / `star-muted` | `#F87171` / `#FCA5A5` | Bintang persona sesi / non-sesi |
| | `cyan-100` / `cyan-600` | `#CFFAFE` / `#0891B2` | Badge PROFIL ANDA |
| | `green-500` | `#22C55E` | Persen MATCH Top 3 |
| | `rose-800` | `#9F1239` | Kartu persona terpilih di dialog |
| Landing | `maroon-700` | `#860F23` | Judul italic visi, angka misi, garis misi |
| | `amber-700` | `#B45309` | ✦ marquee |
| Status `[Improvisasi]` | `red-600` / `amber-600` | `#DC2626` / `#D97706` | Galat / peringatan |

**Kontras (dipertahankan sesuai Figma).** Di atas putih, `ink-60` 4,5:1 (lolos teks kecil); `ink-55` 3,9, `ink-50` 3,3, `ink-45` 2,9, `ink-40` 2,5 di bawah 4,5:1. Di atas `map-ground` dan `stone-50` sedikit lebih rendah. Nilai tetap persis desain (keputusan pengguna 29 Sep 2026); jangan memakai `ink-55` ke bawah untuk teks baru yang wajib dibaca, pakai `ink-60` atau lebih gelap. Pemeriksa kontras artifact Design System menandai token ini; peringatan itu diketahui.

### 3.2 Semantic

| Token | Nilai | Pemakaian |
|---|---|---|
| `surface.float` | `white-80` + blur 12 | Search, Top 3, Detail Lokasi, Simulator Rute |
| `surface.solid` | `white` | Panel Layer, tombol merek, slider, kartu |
| `surface.paper` | `stone-50` | Dialog persona, drawer |
| `text.primary` | `navy-900` | Judul, nama |
| `text.body` | `ink-80` | Kalimat |
| `text.secondary` | `ink-60` | Alamat, label |
| `text.muted` | `ink-50` | Label kapital, non-aktif |
| `text.placeholder` | `ink-40` | Placeholder |
| `border` | `line` | Semua garis |
| `accent` | `navy-900` | Aktif, terpilih |
| `focus.ring` | `navy-900` | Fokus `[Improvisasi]` |

### 3.3 Warna data peta

`[Dari Desain]` untuk warna yang ada di legenda Figma; `[Improvisasi]` untuk yang Figma gambar abu-abu atau tidak konsisten (lihat catatan).

| Data | Warna | Gaya |
|---|---|---|
| Historis & Risiko (banjir) | `#EF4444` | Poligon isi 0.3, garis 1.5 `#EF4444` 0.9; kelas bahaya: rendah 0.15, sedang 0.3, tinggi 0.45 |
| Ekosistem Mikro (POI, RTH) | `#22C55E` | Titik 10px isi 0.8, garis putih 2; RTH poligon isi 0.25 |
| Inklusivitas | `#0EA5E9` | Titik 10px isi 1, garis putih 2; trotoar layak garis 2 putus "4 4" `#0EA5E9` |
| MRT | `#F97316` | Garis 5 penuh |
| LRT | `#9333EA` | Garis 5 penuh |
| KRL Lin Bogor / Rangkasbitung / Cikarang | `#DC2626` / `#16A34A` / `#2563EB` `[Improvisasi]` | Garis 4 putus "10 6" di atas casing putih 6 |
| KRL lintas lain (Tangerang, Tanjung Priok, Bandara) | `#64748B` `[Improvisasi]` | Garis 4 putus "10 6" |
| Stasiun | `#FBF9F6` | Lingkaran 7px, garis `navy-900` 2 |
| Halte TransJakarta `[Improvisasi]` | `navy-900` | Titik 5px, muncul mulai zoom 14 |
| Mesin Waktu | `#A855F7` | Garis 4 putus "8 8"; proyek area: poligon garis putus, isi 0.1 |
| Legalitas Lahan | `#8B5CF6` | Poligon isi 0.2, garis 1.5 0.8 |
| Rute mobil `[Improvisasi]` | `navy-900` | Garis 5 di atas casing putih 8, panah arah tiap ±150 px |
| Rute transit `[Improvisasi]` | warna moda (tabel ini) | Ruas naik: warna jalur, garis 5; ruas jalan kaki: `navy-900` titik-titik "1 7" garis 3 |
| Titik A / B | `navy-900` / `white` | Lingkaran 24 berhuruf A/B (sama dengan kartu) |
| Wilayah terpilih / Top 3 `[Improvisasi]` | `navy-900` | Poligon garis 2.5, isi 0.08; nomor peringkat di titik pusat |

Catatan: legenda Figma menyebut KRL "merah/hijau/biru" dan trotoar "biru putus-putus" tetapi simbolnya digambar abu; di aplikasi simbol legenda memakai warna di atas. Tab Legenda menyebut Mesin Waktu "ungu putus-putus", sedangkan peta frame `all` memakainya biru; dipakai ungu sesuai teks legenda, dibedakan dari LRT oleh pola putus-putus.

### 3.4 Makna warna
Navy = kontrol, teks, aktif · merah muda = bintang skor · hijau = cocok (MATCH) dan ruang hijau · merah = risiko · biru langit = aksesibilitas · oranye/ungu/merah/hijau/biru = jalur transit · ungu muda = legalitas · marun = aksen editorial landing.

---

## 4. Tipografi `[Dari Desain]`

| Keluarga | Font | Dipakai di |
|---|---|---|
| `sans` | Plus Jakarta Sans 400/500/600/700 | Seluruh aplikasi |
| `fraunces` | Fraunces, `"SOFT" 0, "WONK" 1` | Nama lokasi, judul drawer, "Ruang" di wordmark, judul landing |
| `georgia` | Georgia (sistem) | Nama persona dan tombol di dialog persona; pertanyaan FAQ |
| `inter` | Inter | Teks dialog persona dan landing |
| `playfair` / `dmsans` | Playfair Display / DM Sans | Hero dan header landing |
| `mono` | Consolas (sistem) | Label teknis landing |

Font dibundel lokal (`docs/RENCANA.md`). Angka tabular untuk waktu, biaya, persen.

**Wordmark.** "Nalar" PJS Bold + "*Ruang*" Fraunces Bold Italic, ukuran sama (20 di tombol merek, 18 di drawer). Varian Fraunces Regular/Italic di frame "setting tentang" tidak dipakai (2 dari 3 frame memakai PJS + Fraunces Bold Italic).

### 4.1 Skala aplikasi (frame 1536 × 770)

| Nama | Font ukuran/tinggi | Bobot | Tracking | Contoh |
|---|---|---|---|---|
| `place-title` | Fraunces 24/23 | 400 | — | *Jalan Diklat Pemda* |
| `panel-title` | PJS 16/24 | 700 | — | *Detail Lokasi* |
| `section-title` | PJS 14/21 | 700 | — | *Kecocokan Gaya Hidup*, nama layer, nama persona sesi |
| `persona-muted` | PJS 14/21 | 500 | — | Persona non-sesi |
| `body` | PJS 13/21.13 | 500 | — | Kesimpulan |
| `item-title` | PJS 13/19.5 | 700 | — | Nama kawasan Top 3 |
| `input` | PJS 13 | 400 | — | Search |
| `address` / `route-input` | PJS 12/15 · 12/16 | 400 | — | Alamat · isian A/B |
| `metric` | PJS 24/32 | 700 | — | *12* mnt |
| `percent` | PJS 12/16 | 700 | — | *95%* |
| `desc` | PJS 10/16.25 | 400 | — | Deskripsi layer, legenda, subjudul Top 3 |
| `label` | PJS 10/15 | 700 | 1, kapital | *LAYER SPASIAL*, *TOP 3 REKOMENDASI*, *KESIMPULAN SINGKAT* |
| `label-wide` | PJS 10/15 | 700 | 2, kapital | *SIMULATOR RUTE* |
| `button-caps` | PJS 11/16.5 | 700 | 1.1, kapital | *LAYER*, *PERSONA* |
| `eyebrow` | PJS 9/13.5 | 700 | 0.9, kapital | *AREA TERPILIH*, *MOBIL* |
| `badge` | PJS 9/9 | 700 | 0.45 | *PROFIL ANDA* |
| `micro` | PJS 8/12 | 400 | 0.8, kapital | *MATCH* |
| `year-value` / `year-label` | PJS 20/28 · 10/15 | 700 | — · 1 | Slider tahun |
| `persona-option` | PJS 18/28 | 700 | — | Panel Profil Persona |
| Drawer | Fraunces 14/13.44 judul; PJS 16/24 tab; PJS 13/17.88 bold nama; PJS 11/17.88 teks; PJS 11/16.5 bold 0.275 kapital judul legenda | | | |

### 4.2 Dialog persona dan landing (`editorial`)

| Nama | Font | Contoh |
|---|---|---|
| `dialog-title` | Fraunces 60/57.6 | *Pilih Persona mu!* |
| `dialog-lead` | Inter 18/29.25 `ink-70` | Kalimat pengantar |
| `persona-name` | Georgia Bold 36/40 | *Commuter* |
| `persona-desc` | Inter 16/26 | Deskripsi persona |
| `persona-no` / `persona-tag` | Inter Bold 10/15 tracking 2 · Inter Bold 9/13.5 tracking 1.35 kapital | *01* · *AKSES TRANSIT PALING UTAMA* |
| `dialog-action` | Georgia 16/24 | *Mulai Jelajah* |
| Landing | Skala `editorial` versi 1.1 tetap berlaku (hero Playfair 108, judul Fraunces 88/64/60/48/36, body Inter 15/24.38, eyebrow Inter SemiBold 18/28 tracking 1.8) ditambah: judul *Our Vision*/*Mission* PJS SemiBold 47/62.8; teks visi PJS 36/45.2 rata kanan-kiri; angka misi Fraunces Italic 36/40 `maroon-700`; teks misi PJS Medium 15/24.38 `ed-ink-80`; judul kartu fitur Fraunces Italic 30/36 `navy-ink` | |

---

## 5. Tata Letak

**Skala spasi:** 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96.

**Overlay aplikasi (frame 1536 × 770).** Tepi layar 16 di semua sisi. `[Dari Desain]` kecuali ditandai.

```
x:16            376                                         1178        1520
 ┌───────────────┐                                           ┌──────────────┐ y:16
 │ Search  360×48│                                           │ NalarRuang ≡ │ 48 tinggi
 └───────────────┘                                           └──────────────┘
 ┌───────────────┐ jarak 12
 │ Top 3 /       │
 │ Detail Lokasi │ (sampai bawah, 16)             ┌────────────────────┐
 │ / Simulator   │                                │ LAYER SPASIAL 340  │
 │ Rute          │                                │ / PROFIL PERSONA   │
 │               │                                └────────────────────┘ jarak 12
 │               │      ┌── slider tahun 400 ──┐   [LAYER][PERSONA]  [+/−]
 └───────────────┘      └───── bawah 24 ───────┘         bawah 28     kanan 16
```

| Aturan perilaku `[Improvisasi]` | |
|---|---|
| Kolom kiri | Satu panel isi pada satu waktu di bawah search: Top 3, Detail Lokasi, atau Simulator Rute. Memilih hasil Top 3 menutup daftar lalu membuka Detail Lokasi; mode Commute menutup Detail Lokasi. |
| Tombol LAYER/PERSONA dan zoom | Di Figma tombol dan zoom bertumpuk di kanan bawah (frame `top 3`). Zoom Leaflet ditempatkan di kanan 16 bawah 28 dengan atribusi di sudut bawahnya; grup tombol di kiri zoom (kanan 58, bawah 28) agar tidak menutupi atribusi, seperti frame `all`. |
| Panel Layer / Profil Persona | Membuka di atas grup tombol, rata kanan dengan tombol (kanan 58, bawah 84.6), tinggi maksimum = layar − 76 − 84.6, isi men-scroll. Hanya satu panel kanan terbuka; tombol yang panelnya terbuka ber-isi `navy-900`. |
| Slider tahun | Muncul hanya saat Mesin Waktu aktif; tengah bawah, bawah 24. Bila layar < 1280, slider naik di atas grup tombol. |
| Popup peta | `autoPan` dengan padding kiri 392, kanan 414, atas 80, bawah 90 agar tidak tertutup kolom dan panel. |
| Drawer / dialog | Semua overlay di bawah scrim; fokus terkunci. |
| Layar pendek | Panel kiri dan kanan men-scroll isinya. Di bawah 1280 lebar, kolom kiri 320. Aplikasi desktop (SRS). |

---

## 6. Radius, Bayangan, Blur `[Dari Desain]`

| Token | Nilai | Pemakaian |
|---|---|---|
| `radius-none` | 0 | Kotak moda Simulator Rute, kotak ikon drawer |
| `radius-xs` | 4 | Checkbox Profil Persona |
| `radius-md` | 12 | Search, tombol merek, tombol LAYER/PERSONA, kartu layer, baris Top 3, Simulator Rute, baris Profil Persona, kartu istilah |
| `radius-lg` | 16 | Panel Top 3, panel Layer/Profil Persona, slider tahun, dialog persona, kartu persona dialog, kartu persona drawer |
| `radius-xl` | 24 | Baris persona Detail Lokasi, Kesimpulan |
| `radius-2xl` | 32 | Detail Lokasi |
| `radius-pill` | 9999 | Toggle, badge, titik A/B, nomor Top 3, lingkaran ikon |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)` | Baris persona sesi |
| `shadow-soft` | `0 2px 10px -4px rgba(0,0,0,.05)` | Kesimpulan |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)` | Titik A |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` | Search, tombol merek, tombol LAYER/PERSONA |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` | Top 3, Simulator Rute, slider, kartu persona terpilih |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,.25)` | Detail Lokasi, panel Layer, dialog, drawer |
| `blur-panel` / `blur-soft` / `blur-drawer` | 12 / 6 / 4 px | Panel melayang / Profil Persona dan scrim dialog / scrim drawer |
| Scrim | dialog `navy-900 @0.7` blur 6; drawer `navy-900 @0.25` blur 4 | |

```css
.nr-float {            /* Search, Top 3, Detail Lokasi, Simulator Rute */
  background: rgb(255 255 255 / .8);
  backdrop-filter: blur(12px);
  border: 1px solid rgb(8 29 60 / .2);
}
@supports not (backdrop-filter: blur(1px)) { .nr-float { background: rgb(255 255 255 / .95); } }
```

**Z-index.** Pane Leaflet 400–700, kontrol Leaflet 800 · `z-panel` 1000 (kolom kiri, panel kanan) · `z-controls` 1010 (search, tombol merek, tombol kanan bawah, slider) · `z-drawer` 1100 · `z-dialog` 1200 · `z-toast` 1300.

**Motion `[Improvisasi]`.** Panel kiri dan kanan: geser 12px + fade 200ms ease-out, keluar 150ms. Drawer: geser dari kiri 240ms. Dialog: fade + skala 0.98→1 200ms. Toggle: 160ms. Fly-to: `map.flyTo(latlng, 15, { duration: 1.2 })`. Marquee landing 40 detik. `prefers-reduced-motion`: semua transisi mati, fly-to jadi `setView`.

---

## 7. Ikonografi `[Dari Desain]`

Lucide 0.460.0; stroke 1.33 pada ikon 12–16, 2 pada ikon 18–22; ujung membulat.

| Tempat | Ikon | Ukuran, warna |
|---|---|---|
| Search / toggle Commute | `search` / `car` | 16 `ink-60`; toggle aktif ikon putih di kotak `navy-900` |
| Menu (tombol merek) | `menu` | 16 `ink-40` |
| Tutup | `x` | 18 `navy-900` (Detail Lokasi); 15 (drawer), 14 (panel) `ink-60` |
| Pin tempat | `map-pin` | 22 `pin-red` dalam lingkaran 44 `red-50` |
| Persona | Commuter `tram-front`, Driver `car`, Social & Vibe `coffee`, Zen `leaf` | 18 putih (sesi) / `ink-50` (non-sesi); 32 `ink-40` di dialog; 14 di drawer |
| Bintang | `star` | 16, jarak 4 (bagian 8.6) |
| Moda | `car`, `tram-front` | 12 `ink-60` |
| Tombol kanan bawah | `map` (LAYER), `users` (PERSONA) | 16 |
| Tab drawer | `users`, `map`, `info` | 12 |
| Terpilih | `check` | 16 putih di `rose-800` (dialog); 12–14 putih di `navy-900` (drawer, Profil Persona) |
| Lanjut | `arrow-right` | 40 `navy-900` (dialog); 16 (landing) |
| Improvisasi | `circle-alert`, `triangle-alert`, `search-x`, `loader-circle`, `navigation` | 16–20 |

**Logo.** Ikon rumah NalarRuang dan ✦ marquee di grup aset **Logo** design system interaktif. Logo sumber data (InaRISK, BIG, BPS, ATR/BPN, Jakarta Satu Data, OSM) memakai berkas resmi; yang tidak punya logo resmi (IQAir, Overpass API, GTFS Transjakarta, JUTPI) memakai nama saja.

---

## 8. Komponen Aplikasi

Semua komponen tersedia sebagai komponen React di design system interaktif (`window.NalarRuang`, props di README tiap komponen). Nilai frame 1536.

### 8.1 Search Bar `[Dari Desain]` · FR-05, FR-16, UI02
360 × 48, `nr-float`, radius 12, `shadow-lg`, padding x 16.8. Ikon `search` 16 + jarak 12; input PJS 13 `navy-900`, placeholder *Telusuri kawasan atau alamat...* `ink-40`; pemisah kiri 0.8 `line` + padding 12.8; tombol toggle 28 (padding 6) ikon `car` 16: mati tanpa latar `ink-60`, aktif latar `navy-900` ikon putih. `role="combobox"`, Enter/↓/Esc; toggle `aria-pressed`, label *Beralih ke Commute Simulator*.
- **Mode checkbox** `[Improvisasi]` (FR-15): panel bergaya Top 3 di bawah search dengan kepala *PILIH KOTA DAN PERSONA*; kota berupa tombol radius 12 garis `line` (terpilih isi `navy-900` teks putih); persona berupa baris Profil Persona (8.10) ringkas; tautan *Pakai persona sesi* PJS Bold 10 kapital `navy-900`; tombol *Cari* isi `navy-900`. Dibuka dari ikon `sliders-horizontal` 16 yang muncul di kiri tombol mobil saat search fokus.

### 8.2 Panel Top 3 Rekomendasi `[Dari Desain]` · FR-06, FR-07, BR-1
Di bawah search (jarak 12), lebar 360, `nr-float`, radius 16, `shadow-xl`, overflow clip. Kepala latar `stone-50-30`, garis bawah 0.8, padding 22.5/20/16.8: *TOP 3 REKOMENDASI* (`label`) + *Kawasan ideal berdasarkan profil [Persona].* (`desc` `ink-60`; beberapa persona digabung "Commuter & Zen"). Daftar padding 8, jarak 4; baris tombol garis `line` radius 12 padding 12.8, lebar penuh `[Improvisasi — Figma hug]`: nomor di lingkaran 24 `ink-05` (PJS Bold 10), jarak 16, nama `item-title`, tipe kawasan `desc` `ink-50`; kanan persen `percent` `green-500` + *MATCH* `micro` `ink-40`. Hover latar `ink-05`; terpilih garis `navy-900`. `role="listbox"`, dibacakan "Peringkat 1 dari 3, Kebayoran Baru, 95 persen cocok".
- Persen = skor kecocokan 0–100 dari Requirement Search (bukan dikarang); di bawah 50 persen warnanya `ink-60` `[Improvisasi]`.

### 8.3 Detail Lokasi (Point Inspector) `[Dari Desain]` · FR-08, FR-09, FR-17
Kolom kiri di bawah search, sampai bawah 16, lebar 360 (maks 400), `nr-float`, radius 32, padding 24.8, jarak 24, `shadow-2xl`, isi scroll.
- Kepala: *Detail Lokasi* `panel-title` + `x` 18 di kanan (padding x 4).
- Tempat: lingkaran 44 `red-50` garis `line` dengan `map-pin` 22; label *AREA TERPILIH* (poligon) atau *TITIK TERPILIH* (titik) `[Improvisasi dari label]` `eyebrow` `ink-50`; nama `place-title`; wilayah `address` `ink-60`.
- *Kecocokan Gaya Hidup* `section-title`, empat Baris Skor Persona (8.4) jarak 4.
- Ringkasan data layer `[Improvisasi]`: bila ada layer aktif yang punya data di lokasi, satu baris per layer (simbol legenda 14 + teks `desc` `ink-70`), dipisah garis atas 0.8.
- Kartu Kesimpulan (8.5).
- Nama lokasi selalu Bahasa Indonesia dari data wilayah (Figma frame `legalitas lahan` menulis *Special Capital Region of Jakarta*; tidak ditiru).

### 8.4 Baris Skor Persona `[Dari Desain]` · FR-09, BR-9, BR-14
| Varian | Tampilan |
|---|---|
| Persona sesi | Latar putih, garis `line`, radius 24, padding 12.8, `shadow-sm`; lingkaran 36 `navy-900` dengan ikon 18 putih; nama `section-title`; badge (8.7); bintang `star-on` |
| Non-sesi | Tanpa latar, padding 12; lingkaran 36 `ink-05` ikon 18 `ink-50`; nama `persona-muted` `ink-50`; bintang `star-muted` |
| Skor 0 `[Improvisasi]` | Tiga bintang kosong + *0 dari 3* `desc` `ink-50` di kiri bintang |
| Data tidak lengkap `[Improvisasi]` | Bintang diganti teks *Data kurang* `desc` `amber-600` |
| Wilayah: cocok `[Improvisasi]` · BR-10 | Bintang diganti lingkaran 20 `navy-900` berisi `check` 12 putih + teks *Cocok* `desc` Bold `navy-900` (non-sesi: lingkaran `ink-60`, teks `ink-60`) |
| Wilayah: belum cocok `[Improvisasi]` | Lingkaran 20 garis `line` berisi garis `minus` 12 `ink-60` + teks *Belum cocok* `desc` `ink-60` |

`aria-label="Commuter, 3 dari 3 bintang, profil anda"`; wilayah: `"Commuter, cocok, profil anda"`.

### 8.5 Kartu Kesimpulan Singkat `[Dari Desain]` · FR-17
`white-50`, garis `line`, radius 24, padding 16.8, `shadow-soft`, jarak 5.5. Label *KESIMPULAN SINGKAT* `label` `ink-50`; kalimat `body` `ink-80` (template 11.3). Beberapa persona sesi: satu kalimat per persona, dipisah jarak 8. Data tidak lengkap `[Improvisasi]`: kalimat tambahan `desc` `amber-600`.

### 8.6 Bintang Skor `[Dari Desain]`
3 × `star` 16, jarak 4. Terisi: isi dan garis `star-on` (sesi) atau `star-muted` (non-sesi). Kosong: garis `slate-200` 1.33 tanpa isi. Ikon `aria-hidden`.

### 8.7 Badge *PROFIL ANDA* `[Dari Desain]`
Pill `cyan-100`, padding 4/10, `badge` `cyan-600`. Di setiap persona sesi.

### 8.8 Simulator Rute (Commute) `[Dari Desain]` · FR-10, FR-11, FR-16, UI04
Menggantikan panel kolom kiri saat toggle aktif; lebar 360, `nr-float`, radius 12, padding 20.8, jarak 20, `shadow-xl`.
- Kepala: *SIMULATOR RUTE* `label-wide` + `x` 14; garis bawah 0.8, pb 12.8.
- Titik: lingkaran 24; **A** isi `navy-900` huruf putih PJS Bold 9 `shadow-md`; **B** putih garis `line` huruf `navy-900`. Penghubung garis putus 0.8 `line` di x 11. Isian: input `route-input` `navy-900`, garis bawah 0.8, padding 6/6.8; jarak antarbaris 16.
- Moda: dua kotak berdampingan jarak 12 (pt 8), `slate-50`, garis `line`, radius 0, tinggi 96, padding 11.8: ikon 12 + *MOBIL* / *TRANSIT* `eyebrow` `ink-60`; waktu `metric` + *mnt* PJS 10 `ink-50`; biaya PJS Medium 10/15 `ink-70`.
- `[Improvisasi]` Kotak moda dapat dipilih: terpilih garis `navy-900` 1.5 dan rute moda itu tampil tebal di peta; yang lain tampil tipis 0.4.
- `[Improvisasi]` Jarak: chip di kanan kepala `desc` `ink-60` *18,4 km*.
- `[Improvisasi]` Keterangan di bawah kotak: *Estimasi tanpa lalu lintas real-time.* `desc` `ink-50`; untuk transit tambahan rincian moda, mis. *Jalan 6 mnt · KRL Bogor 41 mnt · Jalan 4 mnt*.
- Keadaan kosong `[Improvisasi]`: placeholder *Ketik alamat atau pilih di peta* `ink-40` dan tautan *Pilih di peta* PJS Bold 10 kapital; kotak moda berisi *—*.
- Tidak tersedia `[Improvisasi]`: kotak moda menampilkan *Tidak tersedia* `amber-600` + *Coba titik yang lebih dekat ke jalan*.
- Tombol *Reset* `[Improvisasi]`: ikon `rotate-ccw` 14 di kiri `x`, muncul bila ada isian.

### 8.9 Panel Layer Spasial `[Dari Desain]` · FR-03, FR-04
Lebar 340.4, putih, garis `line`, radius 16, `shadow-2xl`. Kepala padding 12/16/12.8, garis bawah 0.8: *LAYER SPASIAL* `label` + `x` 14. Isi padding 8, jarak 4.
- Kartu layer: putih, garis `line`, radius 12, padding 12.8. Mati: nama PJS Bold 14/21 `ink-70`, deskripsi `desc` `ink-50`. Nyala: nama `navy-900`, deskripsi diganti legenda di bawah garis atas 0.8 (pt 7.7): simbol 16 + teks `desc` `ink-70`; Mobilitas memakai grid 2 kolom.
- Toggle 36 × 20, knob 16 putih: nyala `navy-900`, mati `slate-200`.
- Deskripsi layer (mati): *Area rawan banjir dan risiko bencana lain.* · *Kafe, restoran, ritel, dan ruang hijau.* · *Aksesibilitas pedestrian dan fasilitas umum.* · *Halte, stasiun KRL/MRT, dan jalur arteri.* · *Proyek infrastruktur dan tata ruang masa depan.* · *Gambaran status kepemilikan dan peruntukan.*
- Legenda (nyala): lihat 11.4.
- Gagal `[Improvisasi]`: deskripsi diganti *Layer gagal dimuat.* `red-600` + *Coba lagi* PJS Bold 10 kapital `navy-900`; toggle nonaktif. Memuat: toggle diganti `loader-circle` 16 berputar.

### 8.10 Panel Profil Persona `[Dari Desain]` · FR-19
Dibuka dari tombol PERSONA; ukuran dan posisi sama dengan panel Layer (di Figma panel ini masih menempel di bawah kepala Layer; di aplikasi berdiri sendiri). `white-95` blur 6, garis `line`, radius 16, `shadow-2xl`. Kepala *PROFIL PERSONA* `label` + `x`. Isi padding 8 jarak 4: baris putih garis `line` radius 12 padding 16.8, lebar penuh `[Improvisasi — Figma hug]`: nama `persona-option` (`navy-900` terpilih, `ink-50` tidak) + checkbox 20 radius 4 garis `line` (terpilih isi `navy-900` + `check` 12 putih). Minimal satu persona (BR-7): menghapus centang terakhir ditolak dengan toast.

### 8.11 Tombol Merek `[Dari Desain]` · FR-18
Kanan 16 atas 16, tinggi 48, putih, garis `line`, radius 12, padding x 20.8, jarak 12, `shadow-lg`. Wordmark 20 + ikon `menu` 16. Seluruh tombol membuka drawer. `aria-label="Buka menu NalarRuang"`, `aria-expanded`.

### 8.12 Tombol LAYER / PERSONA `[Dari Desain]`
Tinggi 44.6, radius 12, garis `line`, padding 12.8/16.8, jarak 8 antartombol, `shadow-lg`, ikon 16 + `button-caps`. Panelnya terbuka: isi `navy-900` teks putih; tertutup: putih teks `ink-60`. `aria-expanded`.

### 8.13 Slider Tahun (Mesin Waktu) `[Dari Desain]` · FR-04, BR-3
Lebar 400, putih, garis `line`, radius 16, padding 16.8/24.8, jarak 20, `shadow-xl`. Kiri tahun awal *2026* `year-label` `ink-50`; track 2px `ink-20` dengan knob 16 putih garis `navy-900` `[Improvisasi]` dan titik per tahun; kanan tahun terpilih `year-value`. Rentang 2026–2030 (FR-04). `input type=range` + `aria-valuetext="Tahun 2029"`. Tidak ada proyek pada tahun itu `[Improvisasi]`: teks *Belum ada proyek di tahun ini.* `desc` di bawah track.

### 8.14 Drawer Menu `[Dari Desain]` · FR-18–21, UI05
Kiri, lebar 320, tinggi penuh, `stone-50`, `shadow-2xl`; scrim sisanya. Kepala padding 24/24/12: wordmark 18 + `x` 15 (tombol bulat padding 6). Tab tiga sama lebar: ikon 12 + PJS 16/24; terpilih `navy-900` garis bawah 1.6 `navy-900` `[Improvisasi: Figma memberi garis `line` pada semua tab]`, lainnya `ink-40`. Isi latar putih, padding 19/20/20, jarak 16–20, scroll.
- **Persona** `[Dari Desain]`: judul *Ubah Preferensi Persona* Fraunces 14; deskripsi PJS 11/17.88 `ink-50` *Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.*; kartu radius 16 padding 15.6 jarak 12 garis `line`: terpilih latar `ink-05`, kotak 28 `navy-900` + `check` 14 putih, nama PJS Bold 13 `navy-900`; lainnya putih, kotak 28 `ink-08` + ikon persona 14, nama `ink-70`; deskripsi PJS 11/17.88 `ink-45`.
- **Legenda** `[Dari Desain]`: judul *Legenda Peta*; sub *Panduan membaca simbol dan warna pada Visual Explorer.*; baris simbol 16 + judul PJS Bold 11 kapital + teks PJS 11/16.5 `ink-55` (isi 11.4).
- **Tentang** `[Dari Desain]` + `[Improvisasi]`: judul *Tentang NalarRuang 2.0*; teks *Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka.*; kartu istilah `stone-50` garis `line` radius 12 padding 12.8 (Isochrone, Point Inspector, Commute Simulator, Persona Grading — teks 12.1). Ditambahkan dengan gaya kartu yang sama: **Sumber data** (sembilan sumber, bagian 10) dan **Catatan** berisi disclaimer (BR-17) serta *Dibuat oleh Kelompok 4 — Developer Rumah, IPB University.*
- `role="dialog" aria-modal`, `role="tablist"`; Esc atau klik scrim menutup; fokus kembali ke tombol merek.

### 8.15 Dialog Persona (Onboarding) `[Dari Desain]` · FR-13, FR-14, UI00
Scrim `navy-900 @0.7` blur 6. Dialog `stone-50`, radius 16, lebar 1200 (maks layar − 48), padding 64, jarak 48, `shadow-2xl`, tanpa tombol tutup.
- Judul *Pilih Persona mu!* `dialog-title`; pengantar `dialog-lead` lebar 597: *Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.*
- Empat kartu (jarak 21.5, lebar ±246, min tinggi 320, radius 16, padding 33.6, garis `line`): baris atas ikon 32 `ink-40` + lingkaran pilih 28 garis `line`; nomor + tagline (01 *AKSES TRANSIT PALING UTAMA*, 02 *JALAN LANCAR, TOL DEKAT*, 03 *DEKAT SERU-SERUNYA KOTA*, 04 *TENANG, HIJAU, LEGA*) `ink-40`; nama `persona-name` `ink-70`; deskripsi `persona-desc` `ink-50`.
- Terpilih: latar putih, skala 1.02, `shadow-xl`; lingkaran isi `rose-800` + `check` 16 putih; nomor `navy-900`, tagline `rose-800`, nama `navy-900`, deskripsi `ink-80`. Hover `[Improvisasi]`: latar `white-50`.
- Tombol *Mulai Jelajah* `dialog-action` + `arrow-right` 40, kanan, pt 32. Belum ada pilihan `[Improvisasi]`: tombol opasitas 0.4; menekannya memunculkan *Pilih minimal satu persona dulu, ya.* Inter 14 `rose-800` di kiri tombol (`role="alert"`).
- Kartu = `role="checkbox"`; Spasi memilih; fokus awal di kartu pertama. Pilihan disimpan di `sessionStorage` (FR-14).

### 8.16 Popup Peta `[Improvisasi]` · FR-08
Figma revisi tidak menggambar popup; dirancang dari kartu Top 3. Putih, garis `line`, radius 12, padding 12.8/14, `shadow-lg`, lebar 240–300. Judul PJS Bold 13 `navy-900`, jenis PJS Bold 9 kapital `ink-50` di atas judul, isi `desc` `ink-70`, sumber `micro` `ink-40`, tautan *Lihat detail* PJS Bold 10 kapital + `arrow-right` 12 membuka Detail Lokasi. Satu seleksi dengan Detail Lokasi (BR-13).

### 8.17 Label Peta `[Dari Desain]`
Label stasiun dan nama tempat memakai tooltip Leaflet permanen seperti frame `all`: putih opasitas 0.9, garis putih, radius 3, padding 6.8, bayangan `0 1px 1.5px rgba(0,0,0,.4)`; teks PJS 12/18 `navy-900` (Figma memakai Arial bawaan; diganti font aplikasi). Muncul mulai zoom 13 dan menghindari tumpang tindih (collision) `[Improvisasi]`.

### 8.18 Kontrol Zoom & Atribusi `[Dari Desain]`
Bawaan Leaflet 1.9 (30px) di kanan 16 bawah 28; atribusi *Leaflet | © OpenStreetMap* di bawahnya, wajib.

### 8.19 Toast, Memuat, Kosong, Galat `[Improvisasi]`
Toast: putih, garis `line`, radius 12, `shadow-lg`, titik status 8, PJS Medium 13 `navy-900`, tengah bawah (di atas slider bila tampil), 4 detik. Keadaan dalam panel: ikon 16 di lingkaran 36 `ink-05` (`search-x` `ink-60`, `triangle-alert` `amber-600`, `circle-alert` `red-600`), judul PJS Bold 13, teks `desc` `ink-60`. Memuat: skeleton `ink-05` berdenyut 1.2s. Microcopy 11.2.

---

## 9. Kartografi `[Improvisasi]` · masukan Izdihar, SRS BR-13

Peta di Figma sengaja tidak ditiru. Aturan berikut membuat peta terlihat benar dan tidak aneh.

**9.1 Bentuk area mengikuti data.** Area selalu poligon hasil data (kelurahan, genangan InaRISK, zona RDTR, RTH OSM), tidak pernah kotak, segitiga, atau lingkaran buatan. Geometri disederhanakan (toleransi ±5 m pada zoom 15) tanpa mengubah bentuk. Area yang saling bersebelahan berbagi batas yang sama (tanpa celah atau tumpukan).

**9.2 Lokasi masuk akal.** Titik contoh, hasil Top 3, dan titik yang diklik pengguna dinilai sebagai calon hunian: bila titik jatuh di area non-hunian (monumen, taman kota, bandara, badan air, jalan tol), Detail Lokasi tetap tampil tetapi label berbunyi *TITIK TERPILIH · bukan kawasan hunian* dan skor tetap dihitung. Contoh di dokumentasi dan landing memakai kawasan hunian nyata (mis. permukiman dekat Stasiun Bojong Gede), bukan Monas.

**9.3 Rute mengikuti jalan dan punya arah.** Rute mobil digambar dari geometri hasil routing di jaringan jalan; rute transit dari ruas jalan kaki + jalur KRL/MRT/LRT/TransJakarta yang dilalui. Tidak ada garis lurus A–B. Arah ditunjukkan panah kecil searah perjalanan di sepanjang garis, titik A dan B di ujungnya, dan titik pindah moda berupa lingkaran stasiun (3.3). Kamera menyesuaikan batas rute (`fitBounds`, padding kolom kiri 392).

**9.4 Tumpukan layer.** Dari bawah: basemap → poligon (Legalitas, Historis, RTH) → garis (jalur transit, Mesin Waktu, rute) → titik (POI, Inklusivitas, halte) → stasiun → pin/label. Isi poligon transparan agar basemap tetap terbaca.

**9.5 Kepadatan.** Titik POI di-cluster di bawah zoom 15 (lingkaran putih garis warna layer berisi jumlah, PJS Bold 11). Halte TransJakarta dan label nama muncul mulai zoom 14. Poligon kelurahan hanya digambar garis tepinya sampai dipilih.

**9.6 Sorot dan redup (FR-02).** Fitur di luar filter aktif atau di luar Top 3: opasitas 0.35 (poligon isi 0.1). Wilayah terpilih: garis `navy-900` 2.5 isi 0.08.

**9.7 Basemap.** Tile OpenStreetMap standar tanpa pewarnaan ulang, di atas `map-ground`. Warna data (3.3) dipilih agar tetap terbaca di atas warna jalan OSM (merah muda, kuning).

**9.8 Legenda jujur.** Legenda inline, tab Legenda, dan popup selalu menjelaskan simbol yang benar-benar digambar pada zoom saat itu (BR-16).

---

## 10. Komponen Landing Page `[Dari Desain]` · FR-22, UI06

Frame `Landing Pagee` (254:8086, 1440 × 9188), tema `editorial`. Nilai komponen yang tidak berubah dari versi 1.1 (header, hero, marquee, kolom visi, kartu foto persona, tile layer, kartu langkah, FAQ, band CTA) tetap berlaku; perubahan dan tambahan:

| Seksi | Isi |
|---|---|
| Urutan | Header + hero → marquee → *Mengurai Visi, / Menata Kota Bersama.* + kolom Spasial/Persona/Rekomendasi → **Our Vision** → **Mission** → Empat Cara Memandang Suatu Kota → Tiga cara menjelajah → Enam layer, satu kota → Sumber Data Terbuka → Cara Kerja → **Coba Sekarang** → FAQ → CTA + footer |
| Our Vision | Judul `PJS SemiBold 47/62.8 navy-ink`; teks PJS 36/45.2 rata kanan-kiri lebar 617; foto kota hitam-putih 4:3 dalam bingkai `slate-50` garis `line` padding 12.8, bayangan `0 30px 60px -15px rgba(15,23,42,.1)` |
| Mission | Judul tengah; tiga kolom 413 dibatasi garis putus 0.8 **`maroon-700`** atas-bawah; angka *01 02 03* Fraunces Italic 36/40 `maroon-700`; teks PJS Medium 15/24.38 `ed-ink-80` tengah, maks 280 |
| Tiga cara menjelajah | Eyebrow *FITUR UTAMA*; judul Fraunces 60/57.6; tiga kolom garis putus `line`, padding 48; gambar 4:3 dalam bingkai putus `line` padding 8.8, bayangan dalam `inset 0 0 20px 1px rgba(0,0,0,.05)`; judul Fraunces Italic 30/36 `navy-ink`; deskripsi Inter 15/24.38 `ed-ink-80`; *PELAJARI* + panah |
| Gambar fitur `[Improvisasi]` | Bukan ilustrasi Figma. Cuplikan peta asli (tile OSM hitam-putih) yang digambar dengan aturan bagian 9: **Requirement Search** — tiga poligon kelurahan nyata bernomor 1–3 bergaris `navy-900`; **Smart Point Inspector** — pin di permukiman nyata dengan label *★ 3/3 Sangat Cocok*; **Commute Simulator** — rute yang menyusuri jalan dengan panah arah dari A ke B. Dibuat dari data yang sama dengan aplikasi, disimpan sebagai gambar statis |
| Sumber Data Terbuka | Sembilan sumber tanpa duplikasi, grid 3 × 3: **InaRISK (BNPB)**, **DEMNAS (BIG)**, **IQAir**, **BPS**, **Overpass API (OSM)**, **GTFS Transjakarta**, **Jakarta Satu Data**, **ATR/BPN**, **JUTPI Phase 3**. Logo resmi bila ada + nama Georgia 20 `ed-ink-50`; tautan *BUKA PETA INTERAKTIF* bergaris bawah |
| Coba Sekarang | Seksi `navy-night` padding 96/48; kartu radius 20 berisi tangkapan layar aplikasi **versi revisi** diburamkan + lapisan navy; tag pill *INTERAKTIF*; judul *Coba Sekarang* Georgia 40; teks *Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu.* Inter 15 `stone-50 @0.8`; tombol pill putih *BUKA PETA →* Inter Bold 12 tracking 1.2 |
| Footer | *HUBUNGI KAMI* Sekolah Vokasi IPB, Bogor, Jawa Barat, Indonesia · *KONTAK* Kerja Sama kolaborasi@nalaruang.id, Media media@nalaruang.id (alamat contoh sampai domain ditetapkan, OQ-09 PRD) · *IKUTI* ikon sosial · wordmark · disclaimer · © 2026 |
| FAQ | Jawaban *Datanya dari mana?* memakai daftar sumber di atas (PRD US-26) |

---

## 11. Konten & Microcopy

### 11.1 Katalog desain (kutip persis)
*Telusuri kawasan atau alamat...* · *TOP 3 REKOMENDASI* · *Kawasan ideal berdasarkan profil Commuter.* · *MATCH* · *Detail Lokasi* · *AREA TERPILIH* · *Kecocokan Gaya Hidup* · *PROFIL ANDA* · *KESIMPULAN SINGKAT* · *SIMULATOR RUTE* · *MOBIL* · *TRANSIT* · *mnt* · *LAYER SPASIAL* · *PROFIL PERSONA* · *LAYER* · *PERSONA* · *Pilih Persona mu!* · *Mulai Jelajah* · *Ubah Preferensi Persona* · *Legenda Peta* · *Tentang NalarRuang 2.0* · istilah Tentang: *Isochrone* — *Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik.*; *Point Inspector* — *Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta.*; *Commute Simulator* — *Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum.*; *Persona Grading* — *3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok.* · deskripsi persona dan layer (8.9, 8.15).

### 11.2 Microcopy keadaan `[Improvisasi]`
| Keadaan | Judul | Teks |
|---|---|---|
| Tidak ditemukan (UC-03) | *Belum ada kawasan yang cocok* | *Coba longgarkan kata kunci atau pilih kota lain.* |
| Data tidak tersedia (UC-04) | *Data belum tersedia di sini* | *Layer ini belum punya data untuk lokasi yang kamu pilih.* |
| Layer gagal (UC-02) | *Layer gagal dimuat.* | *Coba lagi* |
| Estimasi tidak tersedia (UC-06) | *Tidak tersedia* | *Coba titik yang lebih dekat ke jalan* |
| Data tidak lengkap (UC-05) | — | *Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.* |
| Bukan kawasan hunian (9.2) | — | *Titik ini bukan kawasan hunian. Skor tetap dihitung dari jarak ke fasilitas.* |
| Gagal simpan preferensi (UC-07) | — | *Gagal menyimpan preferensi. Coba pilih lagi.* |
| Minimal satu persona (BR-7) | — | *Pilih minimal satu persona dulu, ya.* |
| Preferensi tersimpan | — | *Preferensi persona tersimpan untuk sesi ini.* |
| Estimasi commute | — | *Estimasi tanpa lalu lintas real-time.* |

### 11.3 Template kesimpulan
*Buat gaya hidup [Persona]: [frasa]*. 3 bintang *Sangat mendukung aktivitasmu!* `[Dari Desain]` · 2 *Cukup mendukung aktivitasmu.* `[Improvisasi]` · 1 *Mungkin kurang optimal, pertimbangkan lokasi lain.* `[Dari Desain]` · 0 *Belum mendukung aktivitasmu, pertimbangkan lokasi lain.* `[Improvisasi]`. Wilayah (poligon, BR-10) `[Improvisasi]`: *Cocok untuk gaya hidup [Persona].* · *Belum cocok untuk gaya hidup [Persona].*

### 11.4 Legenda (kartu layer dan tab Legenda)
| Layer | Teks legenda (kartu) | Tab Legenda |
|---|---|---|
| Historis & Risiko | *Area rawan banjir (merah). Mengindikasikan area historis genangan air.* | *Area rawan banjir historis (merah).* |
| Ekosistem Mikro | *Ruang terbuka hijau, taman, dan fasilitas gaya hidup.* | *Ruang hijau, taman & fasilitas gaya hidup (hijau).* |
| Inklusivitas | *Trotoar dan akses pedestrian layak.* · *Titik akses ramah disabilitas.* | *Trotoar layak (biru putus-putus) & titik akses disabilitas (biru).* |
| Mobilitas & Transit | *Jalur MRT (oranye).* · *KRL Merah (Bogor).* · *KRL Hijau (Rangkas).* · *KRL Biru (Cikarang).* · *Jalur LRT (ungu).* · *Stasiun transit.* | *MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih).* |
| Mesin Waktu | *Proyek transportasi/LRT masa depan yang sedang dibangun.* | *Garis putus-putus ungu = Mesin Waktu (proyek 2026–2030).* |
| Legalitas Lahan | *Pemetaan bidang tanah dan zona legal (ungu muda).* | *Pemetaan zona bidang tanah legal (ungu).* |

`[Improvisasi]` Tab Legenda menambah *KRL Biru* dan *KRL lintas lain (abu)* bila jalur itu digambar, serta *Halte TransJakarta (titik navy)*.

### 11.5 Nada
Santai, *kamu/-mu*, kalimat pendek, tanpa emoji; nama fitur tetap Inggris; label kecil kapital.

---

## 12. Aksesibilitas Perilaku

Tanpa mengubah warna, ukuran, atau efek.

| Area | Aturan |
|---|---|
| Fokus | Cincin 2px `navy-900`, offset 2px, hanya `:focus-visible` |
| Drawer, dialog | `role="dialog" aria-modal="true"`; fokus terkunci; Esc menutup drawer (dialog persona tidak bisa ditutup sebelum memilih) |
| Top 3 | Combobox + listbox; ↑/↓, Enter, Esc; dibacakan peringkat dan persen |
| Toggle, checkbox, slider | `role="switch" aria-checked`; `role="checkbox"`; `input range` + `aria-valuetext` |
| Skor | "Commuter, 3 dari 3 bintang, profil anda" |
| Kontrol peta | Tombol berlabel; marker dapat difokus dan dibuka dengan Enter |
| Status | Toast `role="status"`/`alert`; memuat `aria-busy` |
| Gerak | `prefers-reduced-motion` (bagian 6) |

---

## 13. Panduan Implementasi

Stack: Laravel + Inertia + React + Tailwind + Leaflet (`docs/RENCANA.md`). Komponen React di design system interaktif menjadi titik awal `resources/js/Components/`. Tailwind CSS v4 `[TBD OQ-02]`.

### 13.1 Tema Tailwind v4
```css
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-fraunces: "Fraunces", Georgia, serif;
  --font-georgia: Georgia, "Times New Roman", serif;
  --font-inter: "Inter", system-ui, sans-serif;
  --font-playfair: "Playfair Display", Georgia, serif;
  --font-dmsans: "DM Sans", system-ui, sans-serif;
  --font-mono: Consolas, ui-monospace, monospace;

  --color-navy-900: #0f1b3d; --color-navy-ink: #081d3c; --color-navy-night: #0b1021;
  --color-line: rgb(8 29 60 / .2);
  --color-stone-50: #f7f5f0; --color-cream-100: #f8f5ee; --color-map-ground: #e8e6e1;
  --color-pin-red: #fb2c36; --color-star-on: #f87171; --color-star-muted: #fca5a5;
  --color-rose-800: #9f1239; --color-maroon-700: #860f23; --color-amber-700: #b45309;
  /* data peta */
  --color-map-banjir: #ef4444; --color-map-hijau: #22c55e; --color-map-akses: #0ea5e9;
  --color-map-mrt: #f97316; --color-map-lrt: #9333ea; --color-map-krl-bogor: #dc2626;
  --color-map-krl-rangkas: #16a34a; --color-map-krl-cikarang: #2563eb; --color-map-krl-lain: #64748b;
  --color-map-stasiun: #fbf9f6; --color-map-waktu: #a855f7; --color-map-legal: #8b5cf6;

  --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-2xl: 32px;
  --shadow-soft: 0 2px 10px -4px rgb(0 0 0 / .05);
}
/* slate, cyan, green, red, amber: palet bawaan Tailwind v4 identik dengan Figma */

@utility nr-float {
  background: rgb(255 255 255 / .8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-line);
}
@utility text-ink-80 { color: rgb(15 27 61 / .8); }  /* pola sama untuk 70, 60, 55, 50, 45, 40 */
```

### 13.2 Leaflet
```js
// resources/js/Map/styles.js — satu-satunya tempat menyentuh L (CLAUDE.md)
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export const layerStyle = {
  historis:  (kelas) => ({ color: css('--color-map-banjir'), weight: 1.5, opacity: .9,
                          fillColor: css('--color-map-banjir'), fillOpacity: { rendah: .15, sedang: .3, tinggi: .45 }[kelas] }),
  legalitas: () => ({ color: css('--color-map-legal'), weight: 1.5, opacity: .8, fillColor: css('--color-map-legal'), fillOpacity: .2 }),
  rth:       () => ({ color: css('--color-map-hijau'), weight: 1, fillColor: css('--color-map-hijau'), fillOpacity: .25 }),
  mesinWaktu:() => ({ color: css('--color-map-waktu'), weight: 4, dashArray: '8 8' }),
};
export const transitStyle = {
  mrt: () => ({ color: css('--color-map-mrt'), weight: 5 }),
  lrt: () => ({ color: css('--color-map-lrt'), weight: 5 }),
  krl: (lin) => ({ color: css(`--color-map-krl-${lin}`), weight: 4, dashArray: '10 6' }), // di atas casing putih weight 6
};
export const poi = (warna) => ({ radius: 5, color: '#fff', weight: 2, fillColor: css(warna), fillOpacity: .8 });
export const stasiun = { radius: 7, color: css('--color-navy-900'), weight: 2, fillColor: css('--color-map-stasiun'), fillOpacity: 1 };
export const ruteMobil = [{ color: '#fff', weight: 8 }, { color: css('--color-navy-900'), weight: 5 }]; // + panah arah (9.3)
export const ruteJalanKaki = { color: css('--color-navy-900'), weight: 3, dashArray: '1 7', lineCap: 'round' };
export const terpilih = { color: css('--color-navy-900'), weight: 2.5, fillOpacity: .08 };
export const redup = { opacity: .35, fillOpacity: .1 };
// Basemap: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
// Kontrol zoom: position 'bottomright'
```

### 13.3 Checklist review "sesuai desain"
- [ ] Nilai dari token; tidak ada hex baru di luar bagian 3.
- [ ] Posisi overlay sesuai bagian 5; tidak ada kontrol yang tertutup.
- [ ] Microcopy dikutip persis (11.1) atau dari 11.2–11.4.
- [ ] Peta mengikuti bagian 9: tidak ada area kotak, rute lurus, atau lokasi non-hunian sebagai contoh.
- [ ] Legenda cocok dengan simbol yang digambar.
- [ ] Keyboard dan `prefers-reduced-motion` diuji.

---

## 14. Open Questions

| ID | Pertanyaan | Dampak | Pemilik |
|---|---|---|---|
| OQ-02 | Versi Tailwind saat scaffolding? | Bila v3, tema 13.1 dipindah ke `tailwind.config.js` | Farrel |
| OQ-05 | Ikon tombol PERSONA dan tab Legenda di Figma berupa SVG bebas; dipetakan ke Lucide `users` dan `map`. Setuju? | Ikon | Nur'Afia |
| OQ-06 | Sumber data biaya perjalanan (tarif KRL/TJ, BBM, tol) | Isi biaya Simulator Rute | Farrel, Galih |
| OQ-07 | Legalitas Lahan: persil atau zonasi RDTR? Legenda desain menyebut "bidang tanah dan zona legal" | Isi layer Legalitas | Galih |
| OQ-11 | Warna KRL Cikarang dan lintas lain belum ada di Figma; diusulkan `#2563EB` dan abu | Legenda Mobilitas | Nur'Afia |

Terjawab di versi ini: nama font (Figma), pustaka ikon (Lucide), nama layer (TBD-08), posisi panel dan hamburger (tata letak baru), ambang bintang titik (TBD-10).

---

## 15. Lampiran

### A. Matriks traceability

| Komponen | Status | Frame Figma revisi | UI | FR |
|---|---|---|---|---|
| Search Bar | Dari Desain; mode checkbox Improvisasi | semua | UI02 | FR-05, FR-15, FR-16 |
| Panel Top 3 | Dari Desain | top 3 | UI02 | FR-06, FR-07 |
| Detail Lokasi, Baris Skor, Bintang, Badge, Kesimpulan | Dari Desain; titik/skor 0/data kurang Improvisasi | all, layer | UI03 | FR-08, FR-09, FR-17 |
| Simulator Rute | Dari Desain; kosong/pilih moda/tidak tersedia Improvisasi | Simulasi Rute | UI04 | FR-10, FR-11 |
| Panel Layer Spasial, Toggle, Legenda | Dari Desain; gagal/memuat Improvisasi | top 3, all, layer | UI01 | FR-03 |
| Slider Tahun | Dari Desain | all, mesin waktu | UI01 | FR-04 |
| Panel Profil Persona | Dari Desain (dirapikan) | persona | UI01 | FR-19 |
| Tombol Merek, LAYER/PERSONA | Dari Desain | semua | UI01 | FR-18 |
| Drawer Persona / Legenda / Tentang | Dari Desain; sumber data + disclaimer di Tentang Improvisasi | setting persona/legenda/tentang | UI05 | FR-18–21 |
| Dialog Persona | Dari Desain; peringatan Improvisasi | persona | UI00 | FR-13, FR-14 |
| Popup, Toast, State | Improvisasi | — | — | UC-01–07 |
| Kartografi | Improvisasi | — | UI01 | FR-02, FR-03, FR-11 |
| Landing (Vision, Mission, Tiga cara, Sumber Data, Coba Sekarang) | Dari Desain; gambar fitur Improvisasi | Landing Pagee | UI06 | FR-22 |

### B. Daftar token
Lengkap di `tokens.json` design system interaktif; asal Figma section revisi kecuali yang ditandai Improvisasi.

### C. Variasi dan versi kanonik

| Hal | Variasi di Figma | Kanonik |
|---|---|---|
| Posisi tombol kanan bawah | Bertumpuk dengan zoom (frame `top 3`) vs di kiri zoom (frame `all`) | Frame `all` |
| Wordmark drawer | PJS + Fraunces Bold Italic (2 frame) vs Fraunces Regular/Italic (1 frame) | PJS + Fraunces Bold Italic |
| Panel Profil Persona | Menempel di panel Layer | Panel sendiri |
| Lebar baris Top 3 dan Profil Persona | Mengikuti isi | Lebar penuh |
| Latar dialog persona | Chrome lama (search pill "MODE RUTE") di belakang scrim | Visual Explorer versi revisi |

### D. Glosarium
Basemap · Layer · Titik / Wilayah (metode skor) · Fly-to · Persona sesi · Token · 15-minute city (±1,2 km jalan kaki) · MATCH (persen kecocokan Top 3) · Casing (garis putih di bawah garis jalur agar terbaca).
