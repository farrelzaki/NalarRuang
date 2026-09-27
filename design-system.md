# Design System NalarRuang

## 0. Metadata Dokumen

| Butir | Isi |
|---|---|
| Versi | 1.1-draft |
| Tanggal | 27 September 2026 |
| Pemilik gaya visual | Nur'Afia Avanza (UI/UX Designer) |
| Status | Draf. Nilai diambil dari Figma; nilai yang tidak ada di layer Figma ditandai "(sampling)". |
| Figma | `ui-nalar-ruang`, section `fix` (node 159:4009): https://www.figma.com/design/LDFCKmrGALdO7zDCzbwloZ/ui-nalar-ruang?node-id=159-4009 |
| Design system interaktif | https://claude.ai/artifact/7R7qPFSeWx7aVjzCt4GxDR (token, 37 komponen React dengan live preview, logo, 12 screenshot) |
| Kanvas contoh | https://claude.ai/artifact/LtCEm8pdhnp5MUtQ2bTtJY (4 layar dirakit dari komponen design system) |

**Sumber dan kewenangan.** Nilai visual dan pola interaksi: Figma → screenshot `docs/design/` → deskripsi UI SRS (UI00–UI05) hanya untuk memahami tujuan. Cakupan dan aturan: `docs/sumber/SRS.md` → `WBS.md` → `CHARTER.md` → `DESKRIPSI.md`, diselaraskan dengan `prd.md`. Keputusan teknis: `docs/RENCANA.md` (menang bila bertabrakan dengan prompt penyusunan). Kebijakan desain: `docs/design/analisis-uiux-nalarruang.md` bagian 0.

**Kebijakan (ringkas).**
1. Gaya visual desain dilindungi: warna UI dan data peta, tipografi, ukuran, radius, bayangan, efek kaca, ikon, fotografi, basemap, bentuk komponen, tata letak, dan nada microcopy dipakai persis.
2. Yang belum didesain diimprovisasi dengan meniru komponen terdekat, hanya memakai token di dokumen ini.
3. Masalah fungsi diselesaikan lewat perilaku, bukan perubahan tampilan.
4. Bila satu komponen tampil dalam dua versi, versi yang muncul di lebih banyak layar menjadi kanonik (Lampiran C).

**Penanda.** `[Dari Desain]` dari Figma (rujukan frame/file); "(sampling)" bila nilai hanya bisa diambil dari screenshot · `[Improvisasi]` dirancang untuk yang belum ada, dengan komponen sumber · `[Ditetapkan]` dari dokumen sumber · `[TBD]` lihat Open Questions.

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0-draft | 27 Sep 2026 | Ekstraksi awal dari 12 screenshot |
| 1.1-draft | 27 Sep 2026 | Semua nilai disinkronkan dari Figma; nama font landing dan pustaka ikon terkonfirmasi; komponen React di design system |

---

## 1. Pendahuluan & Prinsip Desain

Dokumen ini membuat developer dan AI agent bisa membangun layar yang sudah didesain identik dengan Figma, dan membangun layar yang belum didesain seolah dibuat desainer yang sama. Urutan pakai: cari komponen di bagian 9–10 (atau di design system interaktif), ambil token dari bagian 2–8, ikuti pola di bagian 11, cek dengan checklist bagian 14.

**Skala frame Figma.** Layar aplikasi di Figma ada dalam dua ukuran. Frame **1536 × 770** (lima layar layer dan `all`) memakai nilai Tailwind yang bulat: teks 16/24, 14/20, 12/16; radius 24/32/36; bayangan `0 8px 32px`. Frame **1440 × 722** (Top 3, Visual Explorer, Commute) adalah salinan yang diperkecil 0.9375× (15px = 16 × 0.9375). **Nilai kanonik adalah nilai frame 1536.** Drawer (`Desktop - 6`) dan landing digambar langsung di 1440 px; nilainya dipakai apa adanya.

**Prinsip yang terbaca dari desain.**
1. **Peta adalah kanvas, panel melayang di atasnya.** Semua kontrol adalah panel kaca putih 0.4 dengan blur (frame `VISUAL EXPLORER`). `[Dari Desain]`
2. **Persona sesi selalu ditonjolkan.** Baris persona sesi diberi latar, garis, dan badge *PROFIL ANDA*; persona lain diredupkan 0.5 (frame `all`). `[Dari Desain]`
3. **Legenda menempel di kontrolnya.** Kartu layer aktif menjelaskan simbolnya: *Titik Biru di Peta*. `[Dari Desain]`
4. **Satu aksen per permukaan.** Aplikasi memakai cyan `#00A8DD`; landing memakai marun `#860F23` untuk judul italic. `[Dari Desain]`
5. **Bahasa yang menyapa.** Kalimat pendek dengan *kamu/-mu*: *Sangat mendukung aktivitasmu!* `[Dari Desain]`
6. **Landing bercerita seperti majalah.** Fraunces dan Playfair Display besar, foto kota hitam-putih, garis putus-putus, angka Georgia italic. `[Dari Desain]`

### Cara mengimprovisasi
- Mulai dari komponen desain yang fungsinya paling dekat; ubah isi, bukan gaya. Sebut sumbernya.
- Pakai hanya token yang sudah ada. Galat memakai warna legenda Historis (`rose-600`), peringatan warna legenda Mobilitas (`orange-600`), sukses warna legenda Ekosistem (`green-600`).
- Hover = latar menguat ke putih. Terpilih = `cyan-500`, atau `slate-50` + garis `slate-200`. Nonaktif = opasitas 0.5.
- Ikon baru dari Lucide 0.460.0, stroke 2.
- Microcopy santai dengan *kamu/-mu*; judul kecil kapital ber-letter-spacing.
- Panel baru mengikuti posisi overlay di bagian 5 dan tidak menutupi komponen yang ada.
- Alur baru meniru alur yang ada (dialog meniru drawer).

---

## 2. Arsitektur Token & Konvensi Penamaan

| Lapis | Contoh | Aturan |
|---|---|---|
| Primitive | `color.cyan.500` = `#00A8DD` | Nilai mentah dari Figma. Komponen UI memakai lapis semantic, kecuali warna data peta dan legenda. |
| Semantic | `color.text.primary` → `color.slate.800` | Makna, berbeda per tema. |
| Component | `inspector.width` = 384px | Ukuran khusus komponen (bagian 9–10). |

Dua tema: **`map`** (aplikasi, `data-theme="map"`) dan **`editorial`** (landing, `data-theme="editorial"`). Tidak ada mode gelap.

**Penamaan.** Dokumen memakai path W3C (`color.text.primary`). Di CSS dan Tailwind: `color.text.primary` → `--text-primary`; `color.cyan.500` → `--color-cyan-500` (Tailwind v4) / `--cyan-500` (design system). Nama token sama dengan `tokens.json` di design system interaktif.

---

## 3. Warna

### 3.1 Primitive `[Dari Desain]`

Warna aplikasi adalah palet **Tailwind v4**; warna vektor peta adalah palet **Tailwind v3**.

| Keluarga | Token | Nilai | Pemakaian |
|---|---|---|---|
| Slate | `slate-50` | `#F8FAFC` | Baris persona sesi, opsi moda |
| | `slate-100` | `#F1F5F9` | Chip jarak, kotak slider, tombol tutup |
| | `slate-200` | `#E2E8F0` | Garis kartu terangkat; bintang kosong; toggle mati |
| | `slate-300` | `#CAD5E2` | Track slider; lingkaran ikon persona non-sesi |
| | `slate-400` | `#90A1B9` | Teks chip; label demo landing |
| | `slate-500` | `#62748E` | Teks sekunder |
| | `slate-600` | `#45556C` | Tombol reset; ikon toggle Commute; legenda Mesin Waktu |
| | `slate-700` | `#314158` | Kalimat kesimpulan; isi Commute |
| | `slate-800` | `#1D293D` | Judul panel, nama lokasi; lingkaran ikon persona sesi |
| | `slate-900` | `#0F172B` | Tinta Kartu Demo landing |
| Tinta | `ink-900` | `#132332` | Nama layer, nama persona, label pill |
| | `ink-label` | `#4E6071` | *AREA TERPILIH* |
| | `ink-popup` | `#333333` | Popup peta |
| | `placeholder` | `rgba(69,85,108,0.8)` | Placeholder search |
| | `top3-label` | `rgba(98,116,142,0.8)` | *TOP 3 REKOMENDASI* |
| Kaca | `glass-30` … `glass-90` | putih 0.3 / 0.4 / 0.5 / 0.6 / 0.7 / 0.8 / 0.85 / 0.9 | Lihat 6.2 |
| Cyan | `cyan-500` | `#00A8DD` | Aksen, toggle, badge, tahun, pin rumah |
| | `cyan-500-20` | `rgba(0,168,221,0.2)` | Latar badge; garis kotak tahun |
| | `cyan-route` | `#3CB7EC` (sampling) | Rute Commute |
| | `cyan-mode` | `#9BD6E9` (sampling) | Opsi moda terpilih |
| Aksi | `cream-button` | `#FEFAED` | Tombol *Reset & Pilih Ulang* |
| | `amber-pin` | `#EE8700` | Pin tujuan |
| Skor | `star-rose` | `#F88698` | Bintang skor, ikon pin tempat |
| | `star-line` | `#DFD7C2` | Garis tepi bintang |
| | `star-top3` / `star-top3-20` | `#FCC618` / `rgba(252,198,24,0.2)` | Bintang dan lingkaran Top 3 |
| | `yellow-100` | `#FEF9C2` | Lingkaran ikon Inklusivitas |
| Legenda | `rose-500` / `rose-500-30` / `rose-600` | `#FF2056` / 0.3 / `#EC003F` | Historis: garis, isi, teks |
| | `green-500` / `green-600` | `#00C950` / `#00A63E` | Ekosistem: titik, teks; ikon Legalitas |
| | `blue-500` / `blue-600` | `#2B7FFF` / `#155DFC` | Inklusivitas: titik, teks |
| | `orange-500` / `orange-600` | `#FF6900` / `#F54900` | Mobilitas: garis, teks; ikon Mobilitas |
| | `purple-500` / `purple-500-30` / `purple-600` | `#AD46FF` / 0.3 / `#9810FA` | Legalitas: garis, isi, teks |
| Data peta | `map-rose` | `#F43F5E` | Poligon Historis |
| | `map-green` | `#22C55E` | Titik Ekosistem |
| | `map-blue` | `#3B82F6` | Titik Inklusivitas |
| | `map-violet` | `#8B5CF6` | Poligon Legalitas |
| | `map-slate` | `#64748B` | Garis Mesin Waktu |
| | `transit-krl-bogor` / `-rangkasbitung` / `-cikarang` | `#E11D48` / `#16A34A` / `#2563EB` (sampling) | Jalur KRL |
| | `transit-lrt` / `transit-mrt` | `#9333EA` (sampling) / `#F97316` | Jalur LRT, MRT |
| Leaflet | `leaflet-link` / `leaflet-close` / `leaflet-line` | `#0078A8` / `#757575` / `#CCCCCC` | Bawaan Leaflet |
| Drawer | `drawer-bg` | `#F9F8F9` (sampling) | Latar drawer |
| | `drawer-brand` / `drawer-heading` | `#343E50` / `#525B6A` | Nama, judul tab |
| | `drawer-muted` / `drawer-card-title` | `#99A5B5` / `#697485` | Deskripsi, judul kartu |
| | `drawer-tab` / `drawer-tab-active` / `drawer-tab-line` | `#8795A9` / `#4BC1E7` / `#EFEFF1` | Tab |
| | `drawer-check-selected` / `drawer-card-line` / `drawer-card-bg` | `#3BBBE3` / `#16AEDF` / `#EBF3F7` | Kartu persona terpilih |
| | `drawer-checkbox-line` / `drawer-checkbox-bg` | `#A8BBDB` / `#FFFEFE` | Checkbox |
| | `scrim` | `rgba(0,0,0,0.12)` | Lapisan di atas peta |
| Landing | `cream-100` / `stone-50` / `cream-200` | `#F8F5EE` / `#F7F5F0` / `#F4F4F0` | Tombol CTA; latar seksi; Kartu Demo |
| | `navy-ink` / `navy-900` / `navy-night` / `navy-hero` | `#081D3C` / `#0F1B3D` / `#0B1021` / `#172338` | Tinta; marquee dan band; seksi demo; lapisan hero |
| | `ink-80` / `ink-60` / `ink-50` / `ink-20` | navy-ink 0.8 / 0.6 / 0.5 / 0.2 | Body; teks langkah; eyebrow kurung; garis |
| | `maroon-700` / `amber-700` | `#860F23` / `#B45309` | Judul italic; ✦ marquee |
| | `gray-600` / `faq-eyebrow` | `#4B5563` / `#374863` | Pengantar dan jawaban FAQ; eyebrow FAQ |
| | `hero-button` / `hero-sub` / `hero-muted` | `rgba(36,40,48,0.67)` / `#F0EFF1` / `#ABB0B8` | Header hero |
| | `footer-text` / `footer-muted` / `footer-line` | `#CDD1D8` / `#A0A5AB` / putih 0.18 | Footer |
| | `stone-50-80` / `demo-frame` | krem 0.8 / `#0A101D` | Teks krem di atas gelap; bingkai foto demo |

### 3.2 Semantic per tema

| Token | `map` | `editorial` | Pemakaian |
|---|---|---|---|
| `surface.page` | `drawer-bg` | `stone-50` | Latar halaman |
| `surface.glass` | `glass-40` + blur | `glass-50` | Panel di atas peta |
| `surface.raised` | `slate-50` | `cream-200` | Kartu terangkat |
| `surface.inverse` | `slate-800` | `navy-900` | Permukaan gelap |
| `text.primary` | `slate-800` | `navy-ink` | Judul |
| `text.strong` | `ink-900` | `navy-900` | Nama layer/persona; pertanyaan FAQ |
| `text.body` | `slate-700` | `ink-80` | Kalimat isi |
| `text.secondary` | `slate-500` | `gray-600` | Pendukung |
| `text.muted` | `slate-400` | `ink-50` | Label redup |
| `accent` | `cyan-500` | `maroon-700` | Aksen |
| `border.glass` / `border.subtle` | `glass-60` / `slate-200` | `ink-20` | Garis |
| `focus.ring` | `cyan-500` | `navy-ink` | Fokus `[Improvisasi]` |
| `status.danger` / `.warning` / `.success` / `.info` | `rose-600` / `orange-600` / `green-600` / `cyan-500` | `maroon-700` / `amber-700` / `navy-ink` / `navy-ink` | `[Improvisasi]` |

### 3.3 Warna data peta `[Dari Desain]`

| Layer | Gambar di peta | Legenda inline di kartu |
|---|---|---|
| Historis & Risiko | Poligon `map-rose`, garis 3px, isi 0.3 | Kotak 12px `rose-500-30`/`rose-500`, teks `rose-600` *Area Merah di Peta* |
| Ekosistem Mikro | Titik `map-green` isi 0.8, garis putih 3px | Titik 14px `green-500` bergaris putih, teks `green-600` *Titik Hijau di Peta* |
| Inklusivitas | Titik `map-blue` isi 0.8, garis putih 3px | Titik `blue-500`, teks `blue-600` *Titik Biru di Peta* |
| Mobilitas & Transit | KRL Bogor/Rangkasbitung/Cikarang putus-putus, LRT dan MRT penuh; stasiun lingkaran putih bergaris hitam | Garis 16 × 4 `orange-500`, teks `orange-600` (lihat 12.4) |
| Mesin Waktu | `map-slate` 4px, dash "5 10" | Garis putus `slate-600` *Garis Putus-putus di Peta* |
| Legalitas Lahan | Poligon `map-violet`, garis 3px, isi 0.3 | Kotak `purple-500-30`/`purple-500`, teks `purple-600` *Area Ungu di Peta* |
| Rute Commute | `cyan-route` 4px, dash "8 8" (sampling) | — |
| Pin rumah / tujuan | `cyan-500` / `amber-pin` | — |
| Basemap | Tile OpenStreetMap standar, tidak diwarnai ulang (K5) | — |

### 3.4 Makna warna

| Warna | Artinya |
|---|---|
| Cyan | Aktif/dipilih; rumah dan rute |
| Rose | Skor persona (bintang); risiko (area merah) |
| Kuning | Rekomendasi Top 3; aksen Inklusivitas |
| Oranye | Mobilitas; tujuan perjalanan |
| Hijau, biru, ungu | Kategori data layer |
| Slate | Teks dan netral |
| Marun, navy | Judul dan tinta landing |

---

## 4. Tipografi `[Dari Desain]`

| Keluarga | Font | Dipakai di |
|---|---|---|
| `sans` | Plus Jakarta Sans 400/500/600/700/800 | Aplikasi dan drawer |
| `fraunces` | Fraunces, axis `SOFT 0, WONK 1` | Judul seksi landing |
| `playfair` | Playfair Display | Hero, kicker, wordmark header |
| `inter` | Inter | Body landing, marquee, tombol |
| `dmsans` | DM Sans | Tombol header dan subjudul hero |
| `georgia` | Georgia (sistem) | Nama di kartu persona, FAQ, tempat demo, angka langkah |
| `mono` | Consolas (sistem) | Label teknis demo *[ 01 ]*, *FIG. 01* |

Muat font secara lokal (dibundel), bukan dari Google Fonts, di produksi (`docs/RENCANA.md`). Angka tabular untuk waktu dan biaya `[Improvisasi]`.

### 4.1 Skala `map` (frame 1536)

| Nama | Ukuran/line-height | Bobot | Letter-spacing | Contoh |
|---|---|---|---|---|
| `app-title-xl` | 24/37.33 | 700 | — | Nama lokasi |
| `app-title` | 16/24 | 600 | — | *Detail Lokasi*, *Layer Peta* |
| `app-search` / `app-metric` | 16/24 | 400 | — | Search; *19mnt* |
| `popup-title` | 16/20.8 | 400 | — | Judul popup |
| `app-body-strong` | 14/20 | 600 | — | *Kecocokan Gaya Hidup*, nama persona |
| `app-body-medium` | 14/20 | 500 | — | *Trans. Publik*, tombol reset |
| `app-body` | 14/20 | 400 | — | Alamat, kesimpulan, judul Top 3 |
| `app-card-title` | 14/14 | 600 | — | Nama layer |
| `popup-body` | 12.8/17.9 | 400 | — | Isi popup |
| `app-card-desc` | 12/16 | 400 | — | Deskripsi layer, alasan Top 3 |
| `app-eyebrow` | 12/16 | 500 (KESIMPULAN 600) | 0.6px, kapital | *AREA TERPILIH* |
| `app-caption` | 12/18 | 500 | — | Label pill |
| `app-caption-strong` | 12/16 | 600 | — | Chip, biaya |
| `app-legend` | 10/15 | 400 | — | Legenda, keterangan moda |
| `app-badge` | 10/15 | 500 | kapital | *PROFIL ANDA* |
| `app-overline` | 10/15 | 600 | 0.5px, kapital | *TOP 3 REKOMENDASI* |

**Drawer (1440):** nama 23/29 800; judul 19/24 600; judul kartu 17/22 600; deskripsi 17/23.36; tab 15/20 500 (terpilih 14); deskripsi kartu 15/19.5.

### 4.2 Skala `editorial` (1440)

| Nama | Font | Ukuran/line-height | Bobot / gaya | Contoh |
|---|---|---|---|---|
| `ed-hero` | Playfair | 108/108, −4.5px | 400 | *Hunian yang cocok.* |
| `ed-display` | Fraunces | 88/88 | 400 | *Menata Kota Bersama.* |
| `ed-display-sm` | Fraunces | 80/76.8 (CTA 76/73) | 400 | *Hal yang perlu kamu tahu.* |
| `ed-heading` | Fraunces | 64/61.44 (60/57.6) | 400 | *Empat Cara Memandang Suatu Kota.* |
| `ed-subheading` | Fraunces | 48/46 | 400 | *Eksplorasi data, bukan cuma iklan.* |
| `ed-section-title` / `ed-italic` | Fraunces | 36/40 | 400 / italic marun | *Sumber Data Terbuka*; *Spasial* |
| `ed-italic-sm` / `ed-tile` | Fraunces | 30/36 | italic / 600 | *Requirement Search*; nama tile |
| `ed-intro` | Fraunces | 24/23 | 400 | *Mengurai Visi,* |
| `ed-kicker` / `ed-brand` | Playfair | 24 / 23.4, 2.26px | 600 italic / 600 | Kicker; wordmark |
| `ed-numeral` | Georgia | 112/112, −5.6px | italic | *01* |
| `ed-faq` | Georgia | 30/36 | 400 | Pertanyaan FAQ |
| `ed-card-name` | Georgia | 20/28 | 700 | Nama persona |
| `ed-vision-title` / `ed-lead` | Inter | 47/62.8 / 37.7/45.2 | 500 / 400 | *The Vision* |
| `ed-marquee` / `ed-step-title` | Inter | 20/24 / 20/28 | 600 kapital / 500 | Marquee; *Kumpulkan* |
| `ed-eyebrow` | Inter | 19.3/30, 1.93px | 600 kapital | *FITUR UTAMA* |
| `ed-answer` / `ed-hero-sub` | Inter / DM Sans | 18/29.25 / 18/27 | 400 | Jawaban FAQ; subjudul hero |
| `ed-tab` | Inter | 16/24, 4px | 400 kapital | *TITIK* |
| `ed-body` | Inter | 15/24.38 | 400 | Body |
| `ed-link` / `ed-step-text` | Inter | 14/20, 0.7px / 14/22.75 | 700 kapital / 400 | *PELAJARI* |
| `ed-button` | Inter | 13.3/19, 1.33px | 700 kapital | *MULAI CARI HUNIAN* |
| `ed-bracket` | Inter | 12/16, 3.6px | 600 kapital | *[ CARA KERJA ]* |
| `ed-note` / `ed-footer` | Inter | 12/19.5 / 12.9/23.3 | 500 / 400 | Catatan demo; footer |
| `ed-overline` / `ed-caption` | Inter | 10.4/15.5, 1.34px / 10.6/17 | 700 kapital / 400 | Label footer; disclaimer |

---

## 5. Tata Letak, Spasi & Ukuran

**Skala spasi:** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 80 · 96 · 128 px (`space-1` … `space-32`).

**Grid landing (1440).** Seksi padding samping 80px; kolom fitur 3 × 413px; padding seksi 96–144px atas-bawah; hero 773px + marquee 64px; Kartu Demo 1152px di tengah.

**Peta overlay aplikasi (frame 1536 × 770).** `[Dari Desain]` kecuali ditandai.

```
x:0  24      88                544              992          1192   1512 1536
 ┌──────────────────────────────────────────────────────────────────────────┐ y:0
 │ (≡)48px  ┌──────────┐   ┌──── Search bar ±448 × 62 (pill) ────┐ ┌──────┐ │ y:24
 │          │ Detail   │   │ Top 3 / Commute tumbuh ke bawah     │ │Layer │ │
 │          │ Lokasi   │   └─────────────────────────────────────┘ │Peta  │ │
 │          │ 384 px   │                                           │320px │ │
 │          │ r 32     │      label pill · popup (auto-pan)        │r 24  │ │
 │          │ x 88 *   │                                           │kanan │ │
 │          └──────────┘ [+/−] x 484 *                             └──────┘ │
 │ ┌ Estimasi ±352, kiri 40, bawah 32 ┐            Leaflet | © OpenStreetMap │
 └──────────────────────────────────────────────────────────────────────────┘ y:770
```

**Aturan agar semua kontrol terjangkau** `[Improvisasi]`:

| Keadaan | Aturan |
|---|---|
| Point Inspector terbuka | Di Figma panel mulai di x 24, sama dengan hamburger. Saat terbuka, panel digeser ke x 88 (48 + 2 × 20); zoom pindah ke `left: 484px`; search bar di-center terhadap area x 472–1192. |
| Kartu Estimasi tampil | Zoom naik ke atas kartu (`bottom` = 32 + tinggi kartu + 12px). |
| Popup terbuka | `autoPan` dengan padding kiri-atas [88, 110] dan kanan-bawah [344, 24]. |
| Drawer atau dialog | Semua overlay di bawah scrim; fokus terkunci. |
| Inspector dan Estimasi bersamaan | Estimasi pindah ke kanan Inspector (x 484). |

**Layar lain** `[Improvisasi]`. Lebih pendek dari 770px: Layer Peta dan Detail Lokasi men-scroll isinya. Lebih lebar: panel tetap menempel di tepi dengan jarak sama. Di bawah 1280px lebar: Layer Peta boleh diciutkan menjadi tombol 48px bergaya hamburger dengan ikon `layers`. Aplikasi untuk desktop (SRS).

---

## 6. Radius, Elevasi, Kaca, Z-Index & Opasitas

### 6.1 Radius dan bayangan `[Dari Desain]`

| Token | Nilai | Pemakaian |
|---|---|---|
| `radius-xs` | 4px | Kotak legenda, kotak tahun, zoom |
| `radius-check` | 4.5px | Checkbox drawer |
| `radius-lg` | 20px | Kotak ikon layer, kartu foto persona |
| `radius-xl` | 24px | Layer Peta, baris persona, opsi moda, kotak slider, baris Commute |
| `radius-2xl` | 32px | Detail Lokasi, Kartu Commute, Kartu Estimasi, search terbuka |
| `radius-3xl` | 36px | Kartu layer, Kesimpulan Singkat, hamburger |
| `radius-drawer-card` / `radius-drawer-tab` | 35 / 21px | Kartu persona terpilih; tab terpilih |
| `radius-pill` | 9999px | Search bar, pill, badge, toggle, tombol |
| `radius-none` | 0 | Kartu dan foto landing |
| `shadow-panel` | `0 8px 32px rgba(0,0,0,0.1)` | Panel kaca |
| `shadow-floating` | `0 8px 30px rgba(0,0,0,0.12)` | Hamburger |
| `shadow-popup` | `0 10px 30px rgba(0,0,0,0.1)` | Popup |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | Kartu di dalam panel |
| `shadow-pill` | `0 4px 15px rgba(0,0,0,0.05)` | Label pill |
| `shadow-photo` | `0 20px 40px rgba(15,27,61,0.12)` | Kartu foto persona |
| `shadow-frame` | `0 30px 60px -15px rgba(15,23,42,0.1)` | Foto Vision, bingkai demo |

### 6.2 Resep kaca `[Dari Desain]`

| Elemen | Latar | Garis | Blur | Bayangan |
|---|---|---|---|---|
| Panel (search, Layer Peta, Detail, Commute, Estimasi) | `glass-40` | 1px `glass-60` | 5px | `shadow-panel` |
| Hamburger 48px | `glass-80` | 1px `glass-60` | 20px | `shadow-floating` |
| Kesimpulan Singkat | `glass-40` | 1px `glass-50` | 6px | `shadow-sm` |
| Label pill | `glass-70` | 1px `glass-80` | 6px | `shadow-pill`, opasitas 0.9 |
| Popup | `glass-85` | 1px `glass-90` | 8px | `shadow-popup` |
| Kartu layer aktif / mati | `glass-80` / `glass-40` | putih / transparan | — | `shadow-sm` / — |
| Scrim drawer | `scrim` | — | 3.6px | — |

```css
.nr-glass {
  background: rgba(255, 255, 255, 0.4);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nr-glass { background: rgba(255, 255, 255, 0.88); } /* fallback terdekat */
}
```

### 6.3 Opasitas dan z-index

Opasitas: baris persona non-sesi 0.5 `[Dari Desain]`; label pill 0.9; isi poligon 0.3; fitur di luar filter 0.35 `[Improvisasi]`; nonaktif 0.5 `[Improvisasi]`.

| Lapisan | Nilai | Isi |
|---|---|---|
| Pane Leaflet overlay / marker / tooltip / popup | 400 / 600 / 650 / 700 | Bawaan Leaflet 1.9 |
| Kontrol Leaflet | 800 | Zoom, atribusi |
| `z-panel` / `z-search` / `z-floating` | 1000 / 1010 / 1020 | Panel; search, Top 3, Commute; hamburger dan zoom |
| `z-drawer` / `z-dialog` / `z-toast` | 1100 / 1200 / 1300 | Drawer; dialog; toast |

---

## 7. Motion `[Improvisasi]`

| Elemen | Gerak |
|---|---|
| Point Inspector, Estimasi | Geser 16px + fade, 200ms ease-out; keluar 150ms |
| Drawer | Geser dari kiri 240ms ease-out; scrim fade 200ms |
| Dialog Onboarding | Fade + skala 0.98→1, 200ms |
| Dropdown Top 3 | Tinggi membuka 160ms ease-out |
| Search ↔ Commute | Crossfade 160ms |
| Kartu layer aktif, toggle | 160ms ease-out |
| Fly-to (FR-07) | `map.flyTo(latlng, 15, { duration: 1.2 })` |
| Marquee landing | 40 detik per putaran, berhenti saat hover |

`prefers-reduced-motion: reduce`: semua transisi mati; fly-to diganti `setView`; marquee diam.

---

## 8. Ikonografi & Simbol Peta

**Pustaka.** Lucide 0.460.0 (paket vanilla `lucide` atau data path tertanam), stroke 2 pada kotak 24, ujung membulat. `[Dari Desain]` — path ikon di Figma identik dengan Lucide.

| Tempat | Ikon | Ukuran, warna |
|---|---|---|
| Hamburger | `menu` | 20px `slate-700` |
| Search / toggle Commute | `search` / `person-standing` | 20px / 18px `slate-600` |
| Judul Commute Simulator | `route` | 18px `cyan-500` |
| Historis, Ekosistem, Mesin Waktu | `waves`, `coffee`, `clock` | 16px `ink-900` |
| Inklusivitas | `accessibility` di kotak `yellow-100` | 16px `ink-900` |
| Mobilitas | `bus-front` | 16px `orange-600` |
| Legalitas | `shield-check` | 16px `green-600` |
| Persona | `train-front`, `car-front`, `coffee`, `leaf` | 16px putih |
| Pin tempat | `map-pin` | 24px `star-rose` |
| Pin Commute | `map-pin`, `navigation` | 16px putih di 28px |
| Moda | `bus-front`, `car` | 20px |
| Tab drawer | `circle-user`, `map`, `info` | 18px |
| Checkbox tercentang | `plus` | 16px putih (persis desain) |
| Tutup | `x` | 16–20px `slate-500` |
| Landing | `arrow-up-right`, `plus`/`minus`, ikon sosial | 16 / 28 / 18px |
| Improvisasi | `circle-alert`, `triangle-alert`, `search-x`, `loader-circle`, `layers` | 18–20px |

**Logo.** Ikon rumah NalarRuang (Figma node 163:4022) dan ✦ marquee (`#B45309`) disalin sebagai SVG ke grup aset **Logo** di design system.

**Tiga komponen skor** (semua dipertahankan):

| Komponen | Bentuk | Skor 0 `[Improvisasi]` |
|---|---|---|
| Bintang Point Inspector | 3 × `star` 16px, isi `star-rose`, garis `star-line` 1.33, kosong isi `slate-200` | Tiga bintang kosong + *0 dari 3* |
| Bintang Top 3 | Satu `star` `star-top3` di lingkaran 24px `star-top3-20` | Tidak berlaku |
| Belah ketupat demo landing | 3 × kotak 6px diputar 45°, `slate-900`; kosong garis `ink-20`; garis progres 1px | Tiga kosong, garis kosong |

---

## 9. Komponen Aplikasi

Semua komponen tersedia sebagai komponen React di design system (`window.NalarRuang`, 37 komponen, props di README tiap komponen) dan kelas CSS di `components/bundle.css` (`nr-`). Nilai di bawah adalah frame 1536.

### 9.1 Panel Kaca
`[Dari Desain]` · UI01. Resep 6.2. Satu permukaan kaca per panel.

### 9.2 Tombol Hamburger
`[Dari Desain]` · FR-18. 48px, radius 36, `glass-80`, blur 20, `shadow-floating`, `menu` 20px; posisi 24,24. Hover putih `[Improvisasi]`. `aria-label="Buka menu"`, `aria-expanded`. Selalu `z-floating`.

### 9.3 Search Bar
`[Dari Desain]` teks bebas; mode checkbox `[Improvisasi]` · FR-05, FR-15, FR-16, UI02.
- ±448 × 62px pill, resep panel. `search` 20px, input 16/24 `slate-800`, placeholder *Ketik 'Daerah asri di Bogor'...* `placeholder`. Toggle: padding 10, `glass-30`, garis `glass-40`, bayangan `0 1px 3px rgba(0,0,0,.1)`, `person-standing` 18px `slate-600`; aktif ikon `cyan-500` latar putih.
- Mode checkbox: panel bergaya Top 3 dengan *PILIH KOTA*, tab pill kota, *PERSONA*, kartu checkbox ringkas, *Pakai persona sesi*.
- `role="combobox"`, Enter/↓/Esc.

```html
<div class="w-[448px] rounded-full bg-white/40 border border-white/60 backdrop-blur-[5px] shadow-panel">
  <div class="flex h-[62px] items-center gap-3 pl-5 pr-[11px] text-slate-600">
    <i data-lucide="search" class="size-5"></i>
    <input class="flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-[rgba(69,85,108,0.8)]"
           placeholder="Ketik 'Daerah asri di Bogor'..." role="combobox" aria-expanded="false" aria-label="Cari kawasan hunian">
    <button class="grid place-items-center rounded-full p-2.5 bg-white/30 border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.1)] aria-pressed:bg-white aria-pressed:text-cyan-500"
            aria-pressed="false" aria-label="Beralih ke Commute Simulator"><i data-lucide="person-standing" class="size-[18px]"></i></button>
  </div>
</div>
```

### 9.4 Dropdown Top 3
`[Dari Desain]` · FR-06, FR-07, BR-1. Search menjadi radius 32. Area daftar `glass-30`, blur 6, garis atas `glass-40`. Label `app-overline`. Tepat tiga baris: lingkaran 24px `star-top3-20` + bintang `star-top3`, judul 14/20 `slate-800`, alasan 12/16 `slate-500` satu baris. Hover/terpilih `glass-40` `[Improvisasi]`. `role="listbox"`, "Peringkat 1 dari 3, …".

### 9.5 Kartu Commute Simulator
`[Dari Desain]` hasil; kosong dan mengisi `[Improvisasi]` · FR-10, FR-16, UC-06. ±448px, radius 32, resep panel. Kepala `route` `cyan-500` + *Commute Simulator* 14/20 600 `slate-700` + `x`. Baris radius 24, padding 12.8, `slate-50` opasitas 0.8 (terisi 1): pin 28px `cyan-500`/`amber-pin`, label 12/16 500 kapital `slate-500`, isi 12/16.5 `slate-700`. *Reset & Pilih Ulang*: 36px pill `cream-button`, garis `slate-200`, `shadow-sm`, 14/20 500 `slate-600`. Kosong: *Ketik alamat atau pilih di peta* + *Pilih di peta*; reset nonaktif.

### 9.6 Kartu Estimasi Perjalanan
`[Dari Desain]` · FR-11, K2. ±352px, radius 32, resep panel, kiri 40 bawah 32. *Estimasi Perjalanan* 14/20 600; chip `slate-100` 12/16 600 `slate-400`. Opsi moda radius 24, padding 12.8, `slate-50`, garis `slate-200`: ikon 40px putih `shadow-sm`, judul 14/20 500, keterangan 10/15 `slate-500`, waktu 16/24, biaya 12/16 600 `slate-500`. Terpilih `cyan-mode` (sampling). Tidak tersedia: *Tidak tersedia* `status-warning` `[Improvisasi]`.

```html
<section class="w-[352px] rounded-[32px] bg-white/40 border border-white/60 backdrop-blur-[5px] shadow-panel px-[17px] py-[15px] flex flex-col gap-4" aria-label="Estimasi perjalanan">
  <header class="flex items-center justify-between">
    <h2 class="text-sm font-semibold text-slate-800">Estimasi Perjalanan</h2>
    <span class="rounded-[20px] bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-400">2.1 km</span>
  </header>
  <button class="flex items-center gap-4 rounded-3xl bg-slate-50 border border-slate-200 p-[12.8px] text-left aria-pressed:bg-cyan-mode" aria-pressed="true">
    <span class="grid size-10 place-items-center rounded-[20px] bg-white shadow-sm"><i data-lucide="bus-front" class="size-5"></i></span>
    <span class="flex-1"><span class="block text-sm font-medium text-slate-800">Trans. Publik</span>
      <span class="block text-[10px] leading-[15px] text-slate-500">Berdasarkan tarif resmi KRL</span></span>
    <span class="text-right tabular-nums"><span class="block text-base text-slate-700">19mnt</span>
      <span class="block text-xs font-semibold text-slate-500">Rp 3.000</span></span>
  </button>
</section>
```

### 9.7 Point Inspector "Detail Lokasi"
`[Dari Desain]`; varian titik, ringkasan layer, multi-persona `[Improvisasi]` · FR-08, FR-09, FR-17, BR-9–11, UC-04, UC-05.
- 384px, radius 32, resep panel. Kepala *Detail Lokasi* 16/24 600 + tutup lingkaran 32px `slate-100`, garis bawah `glass-60`, padding 16/20. Isi padding 20/12, jarak 24. Blok tempat: `map-pin` 24px `star-rose`; label 12/16 500 tracking 0.6px `ink-label`; nama 24/37.33 700; alamat 14/20 `slate-500`. *Kecocokan Gaya Hidup* 14/20 600; empat baris persona; ringkasan layer; kesimpulan.
- *AREA TERPILIH* untuk poligon; *TITIK TERPILIH* untuk titik `[Improvisasi]`.
- Posisi: Figma x 24 top 24 bottom 24; perilaku x 88 (bagian 5).

```html
<aside class="fixed left-[88px] top-6 bottom-6 w-96 rounded-[32px] bg-white/40 border border-white/60 backdrop-blur-[5px] shadow-panel flex flex-col overflow-hidden" aria-labelledby="inspector-nama">
  <header class="flex items-center justify-between px-5 pt-4 pb-[16.8px] border-b border-white/60">
    <h2 class="text-base font-semibold text-slate-800">Detail Lokasi</h2>
    <button aria-label="Tutup detail lokasi" class="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-500"><i data-lucide="x" class="size-4"></i></button>
  </header>
  <div class="flex flex-col gap-6 overflow-y-auto px-3 pt-5 pb-4">
    <div class="flex gap-4 px-2">
      <i data-lucide="map-pin" class="mt-5 size-6 text-star-rose"></i>
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.6px] text-ink-label">Area terpilih</p>
        <h3 id="inspector-nama" class="text-2xl leading-[37.33px] font-bold text-slate-800">Jembatan 1</h3>
        <p class="text-sm text-slate-500">Rawalumbu, Bekasi</p>
      </div>
    </div>
    <!-- Baris Skor Persona (9.8), ringkasan layer, Kesimpulan (9.10) -->
  </div>
</aside>
```

### 9.8 Baris Skor Persona
`[Dari Desain]`; multi-persona dan skor 0 `[Improvisasi]` · FR-09, FR-14, BR-9, BR-11.

| Varian | Tampilan |
|---|---|
| Persona sesi | Padding 12.8, radius 24, `slate-50`, garis `slate-200`; ikon putih dalam lingkaran `slate-800` (padding 6, radius 20); nama 14/20 600 `ink-900`; badge |
| Non-sesi | Tanpa latar; lingkaran ikon `slate-300`; opasitas 0.5 |
| Skor 0 | Tiga bintang kosong + *0 dari 3* 10/15 `slate-500` |

`aria-label="Commuter, 3 dari 3 bintang, profil anda"` (label yang sama ada di layer Figma).

### 9.9 Badge *PROFIL ANDA*
`[Dari Desain]`. Padding 2/8, pill, `cyan-500-20`, teks 10/15 500 `cyan-500` kapital. Di setiap persona sesi.

### 9.10 Kartu Kesimpulan Singkat
`[Dari Desain]`; multi-persona dan data tidak lengkap `[Improvisasi]` · FR-17, UC-05. Padding 16.8, radius 36, `glass-40`, blur 6, garis `glass-50`, `shadow-sm`. Label 12/16 600 tracking 0.6px `slate-500`; kalimat 14/20 `slate-700` (template 12.3). Data tidak lengkap: 12/16 `status-warning`.

### 9.11 Panel Layer Peta + Kartu Layer
`[Dari Desain]`; memuat dan gagal `[Improvisasi]` · FR-03, UC-02, D2.
- Panel: 320px, padding 20, jarak 12, radius 24, resep panel, kanan 24 atas 24. *Layer Peta* 16/24 600.
- Kartu: padding 9.8/10.8, radius 36, jarak 12. Mati `glass-40`; aktif `glass-80` + garis putih + `shadow-sm`. Ikon 16px di kotak 36px radius 20. Nama 14/14 600 `ink-900`; deskripsi 12/16 `slate-500`; legenda 10/15 (3.3).
- Toggle 32 × 16: nyala `cyan-500`, mati `slate-200`, knob 12px putih.
- Slider tahun: ±262px, padding 8.8/12.8/18.4, `slate-100`, garis `slate-200`, radius 24; kotak tahun putih garis `cyan-500-20` radius 4 12/16 `cyan-500`; track `slate-300` 6px.
- Gagal: *Layer gagal dimuat.* `status-danger` + *Coba lagi* `cyan-500`, toggle nonaktif. Memuat: skeleton.

```html
<div class="flex items-start gap-3 rounded-[36px] bg-white/80 border border-white px-[10.8px] py-[9.8px] shadow-sm">
  <span class="grid size-9 place-items-center rounded-[20px] bg-yellow-100 text-ink-900"><i data-lucide="accessibility" class="size-4"></i></span>
  <span class="flex flex-1 flex-col gap-1 pt-0.5">
    <span class="text-sm leading-[14px] font-semibold text-ink-900">Inklusivitas</span>
    <span class="text-xs text-slate-500">Aksesibilitas dan fasilitas umum.</span>
    <span class="flex items-center gap-1.5 text-[10px] leading-[15px] text-blue-600"><span class="size-3.5 rounded-full border border-white bg-blue-500 shadow-sm"></span>Titik Biru di Peta</span>
  </span>
  <button role="switch" aria-checked="true" aria-label="Inklusivitas" class="relative mt-0.5 h-4 w-8 rounded-full bg-cyan-500"></button>
</div>
```

### 9.12 Label Pill Peta
`[Dari Desain]`. Padding 6.8/12.8, pill, `glass-70`, blur 6, garis `glass-80`, `shadow-pill`, opasitas 0.9, 12/18 500 `ink-900`. Tooltip Leaflet permanen.

### 9.13 Popup POI
`[Dari Desain]`; *Lihat detail* `[Improvisasi]` · FR-08, UC-04. ±348px, radius 20, `glass-85`, blur 8, garis `glass-90`, `shadow-popup`, padding 14.8/25.8/14.8/21.8; judul 16/20.8 `ink-popup`; isi 12.8/17.9; tutup Leaflet `leaflet-close`. Satu seleksi dengan Inspector; isi dari data.

### 9.14 Drawer Menu + Tab
`[Dari Desain]` (frame `Desktop - 6`, 1440) · FR-18, FR-19, D4. 400px, `drawer-bg`, scrim `rgba(0,0,0,.12)` + blur 3.6. Nama 23 800 `drawer-brand`. Tab: 15 500 `drawer-tab`; terpilih putih, garis `drawer-tab-line`, 124 × 42, radius 21, 14 `drawer-tab-active`. Judul 19 600 `drawer-heading`; deskripsi 17/23.36 `drawer-muted`. Kartu persona 339 × 99 radius 35; terpilih `drawer-card-bg` + garis 2px `drawer-card-line`, judul `drawer-check-selected`; checkbox 25px radius 4.5 garis `drawer-checkbox-line`, tercentang terisi `drawer-card-line` dengan `plus` putih. Minimal satu persona (BR-7). `role="dialog" aria-modal`, `role="tablist"`.

### 9.15 Dialog Onboarding Persona
`[Improvisasi]` dari Drawer tab Persona · UI00, FR-13, FR-14, BR-7, K4. 400px di tengah, `drawer-bg`, radius 32, `shadow-panel`, scrim. Judul *Pilih Persona Kamu*; deskripsi *Pilih satu atau lebih persona yang mewakili keseharianmu. Kamu bisa mengubahnya kapan saja lewat menu.*; empat kartu; tombol *Mulai Jelajahi Peta* 42px radius 21 `cyan-500` (nonaktif sampai ada pilihan). Peringatan *Pilih minimal satu persona dulu, ya.* `status-danger` `role="alert"`. Pilihan di `sessionStorage` (FR-14).

### 9.16 Isi Tab Legenda dan Tentang
`[Improvisasi]` · FR-20, FR-21. Legenda: satu baris per layer, rincian jalur Mobilitas (12.4), istilah. Tentang: visi, sumber data, disclaimer, identitas tim. Gaya teks drawer.

### 9.17 Kontrol Zoom
`[Dari Desain]` · FR-01. Bawaan Leaflet 1.9 (30px). Atribusi wajib. Posisi dinamis (bagian 5).

### 9.18 Simbol Peta
`[Dari Desain]`; highlight/dim dan marker rekomendasi `[Improvisasi]`. Nilai 3.3; kode 14.2.

### 9.19 Toast, Loading, Empty & Error
`[Improvisasi]` · UC-01–07. Toast: pill kaca, titik status 8px, 14/20 500 `slate-700`, tengah bawah, 4 detik. State: kaca radius 36, padding 16.8, ikon 20px di kotak 36px `glass-80` (`search-x` `slate-500`, `triangle-alert` `status-warning`, `circle-alert` `status-danger`), judul 14/20 600, teks 12/16 `slate-500`. Loading: skeleton pill `glass-80` berdenyut 1.2s. Microcopy 12.2.

---

## 10. Komponen Landing Page

Semua `[Dari Desain]` (frame `Landing Pagee`, 1440) · K1, D8. Tema `editorial`.

| Komponen | Nilai Figma | Perilaku |
|---|---|---|
| Header | Tombol *MENU ∷* dan *Menuju Peta* DM Sans 15 (tracking 2.64) / 11.3 (1.5), latar `hero-button`, tinggi 41.4; logo rumah 31px + *NalarRuang* Playfair 600 23.4 tracking 2.26 | *Menuju Peta* ke Visual Explorer |
| Hero | 773px, foto berlapis `navy-hero`; kicker Playfair 600 italic 24 dengan × DM Sans `hero-muted`; judul Playfair 108/108 −4.5 putih; subjudul DM Sans 18/27 `hero-sub`; *SCROLL* vertikal | — |
| Marquee | 64px `navy-900`, padding 20/46, Inter 600 20 kapital putih, ✦ 20px `#B45309` | 40 detik, berhenti saat hover `[Improvisasi]` |
| Judul seksi | Pengantar Fraunces 24/23; judul Fraunces 88/88, 64/61.44, 60/57.6, 48/46, 80/76.8; eyebrow Inter 600 19.3 tracking 1.93; kurung Inter 600 12 tracking 3.6 `ink-50` | Diakhiri titik |
| Kolom fitur | 3 × 413px, padding 64/32, garis 0.8px dashed `ink-20`; Fraunces italic 36/40 marun; Inter 15/24.38 `ink-80` lebar 280 | — |
| The Vision | Inter 500 47/62.8; Inter 37.7/45.2 `navy-ink`; foto dalam bingkai `slate-50` garis `ink-20` padding 12.8 `shadow-frame` | — |
| Kartu foto persona | 280 × 380 radius 20 (tengah 306 × 415 radius 21.9), `shadow-photo`; gradasi navy 0.95→0.7→0; Georgia 700 20/28 `stone-50`; Inter 14/20 `stone-50-80`; rotasi −9°, −1.8°, 1.6°, 6.4° | — |
| Kartu fitur | Padding 48; foto 4:3 garis dashed `ink-20`; Fraunces italic 30/36 marun; Inter 15/24.38; *PELAJARI* Inter 700 14/20 tracking 0.7 + panah 16px | — |
| Tile layer | ±228px, gradasi navy, Fraunces 600 30/36 putih | — |
| Sumber data | Fraunces 36/40; logo resmi + nama Georgia; *BUKA PETA INTERAKTIF* bergaris bawah | — |
| Kartu langkah | 4 kolom tinggi 460, padding 32, garis 0.8 `ink-20`, foto pudar 0.3; Inter 500 20/28; Inter 14/22.75 `ink-60`; Georgia italic 112 tracking −5.6 `ink-20`; kartu 04 `navy-900` + foto, teks `stone-50` | — |
| Kartu Demo | Seksi `navy-night` padding 96/48; kartu `cream-200` 1152px padding 128/96, jarak 96; tag Consolas 10 `slate-400` + Inter 700 9 tracking 1.8; foto dalam bingkai `demo-frame`; tempat Georgia 30/36 −0.75; tab Inter 16/24 tracking 4, garis 1.6 `ink-20`; skor Inter 700 10 tracking 2 + belah ketupat + garis progres; catatan `glass-50` garis kiri `ink-20`, Consolas 8, Inter 500 12/19.5 `slate-700` | Tab mengganti skor `[Improvisasi]` |
| FAQ | Judul Fraunces 80/76.8 + eyebrow Inter 700 11.2 tracking 1.456 `faq-eyebrow`; garis atas 1.6, antar-item 0.8 `ink-20`; pertanyaan Georgia 30/36 `navy-900` padding 32; ikon +/− 28px; jawaban Inter 18/29.25 `gray-600` lebar 672 | Satu terbuka `[Improvisasi]` |
| Band CTA + footer | `navy-900` + foto 0.3 + gradasi; Fraunces 76/73 `stone-50`; Inter 19/30.9 `stone-50-80`; tombol pill `cream-100` Inter 700 13.3 tracking 1.33 `navy-ink`; footer 3 kolom 1.5:1:0.6, garis `footer-line`, label Inter 700 10.4 tracking 1.34 `footer-muted`, teks Inter 12.9/23.3 `footer-text`, ikon sosial 37px; dasar disclaimer Inter 10.6/17 | Email contoh sampai domain ditetapkan (OQ-09 PRD) |

Jawaban FAQ `[Ditetapkan]` mengikuti `prd.md` US-26.

---

## 11. Pola (Patterns)

1. **Landing → peta → onboarding.** Tombol CTA → Visual Explorer → Dialog Onboarding bila sesi belum punya persona → peta dengan semua layer mati.
2. **Pencarian → Top 3 → fly-to → Inspector.** Enter → skeleton → tepat tiga hasil → pilih → fly-to, marker + label pill, Point Inspector terbuka.
3. **Klik peta → popup → Inspector (satu seleksi).** Popup ringkas; *Lihat detail* atau klik area kosong mengganti isi Inspector.
4. **Toggle Commute.** `person-standing` → Kartu Commute kosong → dua titik → rute + Kartu Estimasi → tutup kembali ke search bar.
5. **Mengubah persona dari drawer.** Centang → badge, kesimpulan, dan Top 3 diperbarui tanpa reload; toast.
6. **Beberapa layer.** Legenda muncul per kartu aktif; Mesin Waktu memunculkan slider; panel scroll. Highlight/dim 0.35 (FR-02).
7. **Loading, empty, error, data tidak lengkap.** Skeleton, kartu state, catatan kesimpulan, toast.

Kanvas contoh (https://claude.ai/artifact/LtCEm8pdhnp5MUtQ2bTtJY) memperlihatkan pola 2, 1 (onboarding), 4, dan 5.

---

## 12. Konten & Microcopy

### 12.1 Nada
Santai, *kamu/-mu*, kalimat pendek; judul kecil kapital; nama fitur tetap Inggris; tanpa emoji. `[Dari Desain]`

**Katalog desain (kutip persis).** *Ketik 'Daerah asri di Bogor'...* · *TOP 3 REKOMENDASI* · *Detail Lokasi* · *AREA TERPILIH* · *Kecocokan Gaya Hidup* · *PROFIL ANDA* · *KESIMPULAN SINGKAT* · *Buat gaya hidup Social & Vibe: Sangat mendukung aktivitasmu!* · *Layer Peta* · deskripsi enam layer · *Tahun 2029* · *Commute Simulator* · *LOKASI RUMAH* · *LOKASI TUJUAN* · *Reset & Pilih Ulang* · *Estimasi Perjalanan* · *Trans. Publik* · *Mobil Pribadi* · *Estimasi kemacetan Jabodetabek* · *Ubah Preferensi Persona* · *Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.* · deskripsi empat persona (termasuk *aksesjalan*) · seluruh teks landing.

### 12.2 Microcopy keadaan `[Improvisasi]`

| Keadaan (UC) | Judul | Teks |
|---|---|---|
| Tidak ditemukan (UC-03) | *Belum ada kawasan yang cocok* | *Coba longgarkan kata kunci atau pilih kota lain.* |
| Data tidak tersedia (UC-04) | *Data belum tersedia di sini* | *Layer ini belum punya data untuk lokasi yang kamu pilih.* |
| Layer gagal (UC-02) | *Layer gagal dimuat* | *Periksa koneksi, lalu coba lagi.* |
| Estimasi tidak tersedia (UC-06) | *Tidak tersedia* | *Coba titik yang lebih dekat ke jalan* |
| Data tidak lengkap (UC-05) | — | *Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.* |
| Gagal simpan preferensi (UC-07) | — | *Gagal menyimpan preferensi. Coba pilih lagi.* |
| Onboarding kosong (BR-7) | — | *Pilih minimal satu persona dulu, ya.* |
| Preferensi tersimpan | — | *Preferensi persona tersimpan untuk sesi ini.* |
| Commute kosong | — | *Ketik alamat atau pilih di peta* · *Pilih di peta* |

### 12.3 Template kesimpulan
*Buat gaya hidup [Persona]: [frasa]* — 3 *Sangat mendukung aktivitasmu!* `[Dari Desain]` · 2 *Cukup mendukung aktivitasmu.* · 1 *Kurang mendukung aktivitasmu.* · 0 *Belum mendukung aktivitasmu.* `[Improvisasi]`

### 12.4 Legenda inline
Format *[Bentuk] [Warna] di Peta*. Mobilitas di Figma bertuliskan *Garis Oranye di Peta*, padahal peta menggambar lima warna jalur; teksnya menjadi *Garis Warna Jalur di Peta* `[Improvisasi]` dan tab Legenda merinci *KRL Bogor Line · merah putus-putus*, *KRL Rangkasbitung Line · hijau putus-putus*, *KRL Cikarang Line · biru putus-putus*, *LRT Jabodebek · ungu*, *MRT · oranye*, *Stasiun · lingkaran putih bergaris hitam*.

### 12.5 Teks yang diisi data `[Ditetapkan]`
Keterangan sumber estimasi sesuai rute (mis. *Berdasarkan tarif resmi KRL* hanya bila rute memakai KRL); popup berisi atribut data dan sumbernya; disclaimer landing juga di tab Tentang.

---

## 13. Aksesibilitas Perilaku

Tidak ada perubahan warna, ukuran, atau efek atas nama aksesibilitas.

| Area | Aturan |
|---|---|
| Fokus | Cincin 2px `focus.ring`, offset 2px, hanya `:focus-visible` |
| Drawer, dialog | `role="dialog" aria-modal="true"`; fokus terkunci; Esc menutup; fokus kembali ke pemicu |
| Top 3 | Combobox + listbox; ↑/↓, Enter, Esc; dibacakan dengan peringkat |
| Toggle / slider | `role="switch" aria-checked`; `input range` + `aria-valuetext` |
| Tab | `role="tablist"`/`tab`/`tabpanel`; ←/→ |
| Skor | "Commuter, 3 dari 3 bintang, profil anda"; ikon `aria-hidden` |
| Kontrol peta | Tombol berlabel; marker dapat difokus dan dibuka dengan Enter |
| Status | Toast `role="status"`/`alert`; loading `aria-busy` |
| Gerak | `prefers-reduced-motion` (bagian 7) |

---

## 14. Panduan Implementasi

Stack mengikuti `docs/RENCANA.md`: Laravel + Inertia + React + Tailwind + Leaflet. Design system interaktif menyediakan **37 komponen React** (`window.NalarRuang`, React 18, tanpa JSX) dan `bundle.css`; komponen itu bisa dipindahkan ke `resources/js/Components/` sebagai titik awal. Markup di dokumen ini HTML + Tailwind yang portabel ke JSX (`class` → `className`). Tanpa shadcn/ui atau Radix. Belum ada kode, jadi tema ditulis untuk **Tailwind CSS v4** `[TBD OQ-02]`.

### 14.1 Tema Tailwind v4

```css
/* resources/css/app.css */
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-fraunces: "Fraunces", Georgia, serif;
  --font-playfair: "Playfair Display", Georgia, serif;
  --font-inter: "Inter", system-ui, sans-serif;
  --font-dmsans: "DM Sans", system-ui, sans-serif;
  --font-georgia: Georgia, "Times New Roman", serif;
  --font-mono: Consolas, ui-monospace, monospace;

  /* slate dan warna UI: palet bawaan Tailwind v4 sudah identik (slate, green, blue, orange, purple, rose, yellow) */
  --color-ink-900: #132332;  --color-ink-label: #4e6071;  --color-ink-popup: #333333;
  --color-cyan-500: #00a8dd; --color-cyan-route: #3cb7ec; --color-cyan-mode: #9bd6e9;
  --color-cream-button: #fefaed; --color-amber-pin: #ee8700;
  --color-star-rose: #f88698; --color-star-line: #dfd7c2; --color-star-top3: #fcc618;
  /* data peta (palet v3) */
  --color-map-rose: #f43f5e; --color-map-green: #22c55e; --color-map-blue: #3b82f6;
  --color-map-violet: #8b5cf6; --color-map-slate: #64748b;
  --color-transit-krl-bogor: #e11d48; --color-transit-krl-rangkasbitung: #16a34a;
  --color-transit-krl-cikarang: #2563eb; --color-transit-lrt: #9333ea; --color-transit-mrt: #f97316;
  /* drawer */
  --color-drawer-bg: #f9f8f9; --color-drawer-brand: #343e50; --color-drawer-heading: #525b6a;
  --color-drawer-muted: #99a5b5; --color-drawer-card-title: #697485; --color-drawer-tab: #8795a9;
  --color-drawer-tab-active: #4bc1e7; --color-drawer-tab-line: #efeff1; --color-drawer-check-selected: #3bbbe3;
  --color-drawer-card-line: #16aedf; --color-drawer-card-bg: #ebf3f7; --color-drawer-checkbox-line: #a8bbdb;
  /* landing */
  --color-cream-100: #f8f5ee; --color-stone-50: #f7f5f0; --color-cream-200: #f4f4f0;
  --color-navy-ink: #081d3c;  --color-navy-900: #0f1b3d; --color-navy-night: #0b1021; --color-navy-hero: #172338;
  --color-maroon-700: #860f23; --color-amber-700: #b45309; --color-faq-eyebrow: #374863;
  --color-footer-text: #cdd1d8; --color-footer-muted: #a0a5ab; --color-demo-frame: #0a101d;

  --radius-xl: 24px; --radius-2xl: 32px; --radius-3xl: 36px;
  --shadow-panel: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  --shadow-floating: 0 8px 30px 0 rgba(0, 0, 0, 0.12);
  --shadow-popup: 0 10px 30px 0 rgba(0, 0, 0, 0.1);
  --shadow-pill: 0 4px 15px 0 rgba(0, 0, 0, 0.05);
  --shadow-photo: 0 20px 40px 0 rgba(15, 27, 61, 0.12);
}

[data-theme="map"] {
  --text-primary: var(--color-slate-800); --text-body: var(--color-slate-700);
  --text-secondary: var(--color-slate-500); --accent: var(--color-cyan-500);
  --focus-ring: var(--color-cyan-500); --status-danger: var(--color-rose-600);
  --status-warning: var(--color-orange-600); --status-success: var(--color-green-600);
}
[data-theme="editorial"] {
  --text-primary: var(--color-navy-ink); --text-body: rgb(8 29 60 / 0.8);
  --text-secondary: var(--color-gray-600); --accent: var(--color-maroon-700);
  --focus-ring: var(--color-navy-ink); --status-danger: var(--color-maroon-700);
  --status-warning: var(--color-amber-700); --status-success: var(--color-navy-ink);
}

@utility nr-glass {
  background: rgb(255 255 255 / 0.4);
  backdrop-filter: blur(5px);
  border: 1px solid rgb(255 255 255 / 0.6);
  box-shadow: var(--shadow-panel);
}
```

Daftar token lengkap: Lampiran B dan `tokens.json` di design system.

### 14.2 Leaflet

```js
// resources/js/Map/styles.js — satu-satunya tempat menyentuh L (CLAUDE.md)
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export const layerStyle = {
  historis:   () => ({ color: css('--color-map-rose'), weight: 3, fillColor: css('--color-map-rose'), fillOpacity: 0.3 }),
  legalitas:  () => ({ color: css('--color-map-violet'), weight: 3, fillColor: css('--color-map-violet'), fillOpacity: 0.3 }),
  mesinWaktu: () => ({ color: css('--color-map-slate'), weight: 4, dashArray: '5 10' }),
};
export const transitStyle = {
  'krl-bogor':         () => ({ color: css('--color-transit-krl-bogor'), weight: 4, dashArray: '10 8' }),
  'krl-rangkasbitung': () => ({ color: css('--color-transit-krl-rangkasbitung'), weight: 4, dashArray: '10 8' }),
  'krl-cikarang':      () => ({ color: css('--color-transit-krl-cikarang'), weight: 4, dashArray: '10 8' }),
  lrt:                 () => ({ color: css('--color-transit-lrt'), weight: 4 }),
  mrt:                 () => ({ color: css('--color-transit-mrt'), weight: 6 }),
};
export const poi = (colorVar) => ({ radius: 8, color: '#fff', weight: 3, fillColor: css(colorVar), fillOpacity: 0.8 });
export const station = { radius: 7, color: '#000', weight: 3, fillColor: '#fff', fillOpacity: 1 };
export const commuteRoute = () => ({ color: css('--color-cyan-route'), weight: 4, dashArray: '8 8' });
export const dimmed = { opacity: 0.35, fillOpacity: 0.1 };           // FR-02 [Improvisasi]

// Label pill: L.tooltip({ permanent: true, direction: 'top', offset: [0, -10], className: 'nr-pill' })
// Popup: L.popup({ className: 'nr-popup', autoPanPaddingTopLeft: [88, 110], autoPanPaddingBottomRight: [344, 24] })
// Basemap: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
```

### 14.3 Konvensi
- Kelas aplikasi `nr-`, landing `ed-` (sama dengan `bundle.css`).
- Jangan menulis hex, radius, atau bayangan di luar token.
- `data-theme="map"` untuk Visual Explorer, `data-theme="editorial"` untuk landing.

### 14.4 Checklist "sesuai Figma" untuk code review
- [ ] Nilai dari token; tidak ada hex baru.
- [ ] Ukuran mengikuti frame 1536 (aplikasi) atau 1440 (drawer, landing).
- [ ] Posisi overlay sesuai bagian 5; hamburger dan zoom tidak tertutup.
- [ ] Microcopy dikutip persis (12.1) atau dari katalog 12.2.
- [ ] Persona sesi memakai badge dan kesimpulan yang sama, berapa pun jumlahnya.
- [ ] Legenda inline sesuai simbol yang digambar.
- [ ] Bandingkan berdampingan dengan Figma atau `docs/design/`.
- [ ] Keyboard dan `prefers-reduced-motion` diuji.

---

## 15. Open Questions

| ID | Pertanyaan | Dampak | Pemilik | Tenggat |
|---|---|---|---|---|
| OQ-01 | ~~Nama font landing~~ | Terjawab dari Figma: Fraunces, Playfair Display, Inter, DM Sans, Georgia, Consolas | — | Selesai |
| OQ-02 | Versi Tailwind saat scaffolding (WBS 1.2.4)? | Bila v3, tema 14.1 dipindah ke `tailwind.config.js` | Farrel, Izdihar | Scaffolding |
| OQ-03 | ~~Nilai pasti dari Figma~~ | Terjawab; sisa nilai sampling: `cyan-route`, `cyan-mode`, `drawer-bg`, jalur KRL/LRT | — | Selesai |
| OQ-04 | ~~Pustaka ikon~~ | Terjawab: Lucide | — | Selesai |
| OQ-05 | Nama singkat enam layer untuk UI (TBD-08)? | Judul kartu layer dan tile landing | Nur'Afia | Sprint 1 |
| OQ-06 | Sumber data biaya perjalanan (K2)? | Isi biaya di Kartu Estimasi | Farrel, Galih | Sebelum Sprint 3 |
| OQ-07 | Legalitas Lahan: persil atau zonasi RDTR (K6)? | Legenda dan popup Legalitas | Galih | Sebelum layer Legalitas |
| OQ-08 | *aksesjalan* di deskripsi Driver: tetap atau *akses jalan*? Kartu foto landing menulis *akses jalan*. | Microcopy drawer dan onboarding | Nur'Afia | Sprint 1 |
| OQ-09 | Detail Lokasi dan hamburger bertumpuk di x 24 pada Figma; apakah pergeseran panel ke x 88 disetujui desainer? | Posisi panel saat terbuka | Nur'Afia | Sprint 3 |
| OQ-10 | Nilai sampling (rute Commute, opsi moda terpilih, latar drawer, jalur KRL/LRT) bisa dijadikan style/variabel di Figma? | Kepastian 5 token | Nur'Afia | Sprint 1 |

### Kandidat Pengembangan Lanjutan
Tidak ada.

---

## 16. Lampiran

### A. Matriks Traceability

| Komponen | Status | Frame Figma | UI | FR | UC | Sprint |
|---|---|---|---|---|---|---|
| Panel Kaca, Hamburger | Dari Desain | semua aplikasi | UI01 | FR-01, FR-18 | — | 1 |
| Search Bar (teks) / (checkbox) | Dari Desain / Improvisasi | Top 3 Rekomendasi | UI02 | FR-05, FR-16 / FR-15 | UC-03 | 2 |
| Dropdown Top 3 | Dari Desain | Top 3 Rekomendasi | UI02 | FR-06, FR-07 | UC-03 | 2 |
| Kartu Commute (hasil / kosong) | Dari Desain / Improvisasi | simulator | UI02 | FR-10 | UC-06 | 3 |
| Kartu Estimasi | Dari Desain | simulator | UI04 | FR-11 | UC-06 | 3 |
| Point Inspector (wilayah / titik, ringkasan layer) | Dari Desain / Improvisasi | all, VISUAL EXPLORER, layer | UI03 | FR-08, FR-09 | UC-04 | 3 |
| Baris Skor Persona, Badge, Bintang | Dari Desain | all | UI03 | FR-09, FR-14 | UC-05 | 3 |
| Multi-persona, skor 0 | Improvisasi | — | UI03 | FR-14, FR-17 | UC-05 | 3 |
| Kartu Kesimpulan | Dari Desain / Improvisasi | all | UI03 | FR-17 | UC-05 | 3 |
| Panel Layer, Kartu Layer, Toggle | Dari Desain | 6 frame layer | UI01 | FR-03 | UC-02 | 1–3 |
| Kartu Layer gagal / memuat | Improvisasi | — | UI01 | FR-03 | UC-02 | 1 |
| Slider Tahun | Dari Desain | visioner | UI01 | FR-04 | UC-02 | 3 |
| Label Pill, Popup, Simbol Peta, Zoom | Dari Desain | semua layer | UI01 | FR-01, FR-03, FR-08 | UC-04 | 1 |
| Highlight/dim | Improvisasi | — | UI01 | FR-02 | UC-02 | 2 |
| Drawer + Kartu Checkbox Persona | Dari Desain | Desktop - 6 | UI04 | FR-18, FR-19 | UC-07 | 3 |
| Dialog Onboarding | Improvisasi | — | UI00 | FR-13, FR-14 | UC-01 | 3 |
| Tab Legenda, Tentang | Improvisasi | — | UI04 | FR-20, FR-21 | — | 3 |
| Toast, Loading, Empty, Error | Improvisasi | — | — | — | UC-01–07 | 1–3 |
| 13 komponen landing | Dari Desain | Landing Pagee | — | — (K1, D8) | — | 3 |

### B. Daftar token
Tercantum di 3.1, 3.2, 4, 5, dan 6; lengkap sebagai `tokens.json` di design system: **118 warna** (99 primitive, 19 semantic), **58 gaya teks**, 12 spasi, 10 radius, 7 bayangan, 6 blur, 5 opasitas, 11 z-index. Asal: Figma, kecuali yang ditandai (sampling).

### C. Variasi Desain dan Versi Kanonik

| Komponen | Variasi | Kanonik | Alasan |
|---|---|---|---|
| Ikon toggle Commute | `person-standing` (frame 1536, 6 frame) vs `route` (frame 1440, 3 frame) | `person-standing` | Mayoritas frame dan SRS UI02 |
| Ukuran frame aplikasi | 1536 (nilai bulat) vs 1440 (0.9375×) | 1536 | Nilai asli desainer; 1440 hasil perkecil |
| Radius panel Layer Peta | 24 (1536) vs 28.7 (1440, diskalakan) | 24 | Frame 1536 |
| Posisi Point Inspector | x 24 (Figma) | x 88 saat terbuka | Hamburger tertutup (masalah fungsi, OQ-09) |
| Legenda Mobilitas | *Garis Oranye di Peta* vs lima warna jalur | *Garis Warna Jalur di Peta* + rincian | Teks mengikuti gambar |

Bukan variasi, semuanya dipertahankan: bintang kuning Top 3, bintang rose Point Inspector, belah ketupat demo landing.

### D. Catatan Rekonsiliasi

| # | Topik | Keputusan |
|---|---|---|
| 1 | Stack: prompt design system meminta tanpa React; `docs/RENCANA.md` memilih Inertia + React | Ikuti `RENCANA.md` (keputusan pengguna 27 Sep 2026). Komponen design system berupa React 18; markup dokumen portabel; tanpa shadcn/Radix. |
| 2 | Posisi search bar, panel layer, tombol tutup Inspector, bentuk menu (SRS UI01, FR-08) | Ikuti desain (D1–D4). |
| 3 | Tipografi (SRS B03 hanya Plus Jakarta Sans) | Aplikasi Plus Jakarta Sans; landing memakai font Figma (K3). |
| 4 | Dua palet | Satu set primitive, dua tema. |
| 5 | Persona jamak | Komponen sama diulang per persona sesi (D6). |
| 6 | Estimasi biaya | Masuk mengikuti desain (K2); sumber data OQ-06. |
| 7 | Landing page | Masuk cakupan (K1, D8). |
| 8 | Nilai versi 1.0 (sampling) vs Figma | Diganti nilai Figma. Perubahan terbesar: latar panel putih 0.4 (bukan 0.6), blur 5px (bukan 24), radius kartu layer 36 (bukan 20), baris non-sesi 0.5 (bukan 0.4), teks legenda memakai tingkat 600, warna data peta palet Tailwind v3. |
| 9 | Ukuran landing di prompt (1331 × 8000) vs berkas (1440 × 8650) | Ukuran berkas dipakai. |

### E. Glosarium

| Istilah | Arti |
|---|---|
| Basemap | Peta dasar (tile OpenStreetMap) di bawah semua layer |
| Layer | Lapisan data spasial yang bisa dinyalakan/dimatikan |
| Titik / Wilayah | Geometri point / poligon; menentukan metode skor |
| Fly-to | Animasi kamera peta menuju lokasi |
| Glassmorphism | Gaya panel putih transparan dengan blur latar |
| Frame 1536 / 1440 | Ukuran artboard Figma; 1536 bernilai asli, 1440 diperkecil |
| Persona sesi | Persona yang dipilih pengguna untuk sesi browser ini |
| Token | Nilai desain bernama yang dipakai ulang |
| Tema | Kumpulan nilai semantic: `map` atau `editorial` |
| Popup / Label pill | Kartu saat fitur diklik / label nama fitur di peta |
| Skeleton | Bentuk pengganti isi saat memuat |
