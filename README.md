# NalarRuang

Platform WebGIS untuk menemukan **kawasan hunian ideal di Jabodetabek**
berdasarkan preferensi gaya hidup. Pengguna memilih satu atau lebih persona,
lalu NalarRuang menilai kawasan lewat enam layer data spasial.

| Persona | Mengutamakan |
| --- | --- |
| **Commuter** | Akses transit: stasiun, halte, trotoar |
| **Driver** | Akses jalan dan tol, SPBU |
| **Social & Vibe** | Kafe, restoran, hiburan |
| **Zen** | Keamanan, minim polusi dan banjir, ruang terbuka hijau |

Tanpa akun dan tanpa login. Preferensi persona hanya hidup selama sesi.

## Fitur

- **Visual Explorer** — peta interaktif dengan enam layer yang bisa dinyalakan
  sendiri-sendiri: Historis & Risiko, Ekosistem Mikro & Gaya Hidup,
  Inklusivitas, Mobilitas & Transit, Mesin Waktu, Legalitas Lahan.
- **Requirement Search** — cari dengan teks bebas, nama wilayah, atau pilihan
  kota + persona; hasilnya tepat Top 3 rekomendasi.
- **Smart Point Inspector + Persona Grading** — klik titik atau wilayah, lihat
  skor 0–3 bintang untuk keempat persona.
- **Commute Simulator** — estimasi jarak dan waktu tempuh Pin A ke Pin B untuk
  kendaraan pribadi dan transportasi publik.
- **Area jangkauan (isochrone)** — di Point Inspector, fasilitas utama persona
  dicari di dalam jangkauan jalan 10 menit (jalan kaki, sepeda, atau mobil).
- **Uji Lahan (FR-23)** — gambar batas lahan, lalu lihat zona RDTR, KDB/KLB/KDH,
  risiko banjir, kecocokan persona, dan estimasi kapasitas rumah tapak, kos, atau
  apartemen, lengkap dengan zona yang bisa disunting, gerbang/pintu, dan 3D.

## Tim

**Kelompok 4 — Developer Rumah** · Teknologi Rekayasa Perangkat Lunak, IPB University
Mata kuliah Sistem Informasi Geografis dan Manajemen Proyek Teknologi Informasi.

| Nama | Peran |
| --- | --- |
| Izdihar Izzan Wibowo | Project Manager |
| Raden Mas Galih Pradityo | System Analyst, backend |
| Nur'Afia Avanza | UI/UX Designer, frontend |
| Farrel Muhammad Zaki | Backend Developer |
| Adzkia Nifa Adha | Backend/GIS Developer |

## Stack

Laravel · Inertia.js · React · Leaflet · Tailwind CSS · PostgreSQL + PostGIS ·
three.js (pratinjau 3D Uji Lahan) · QGIS (pengolahan data) · font Plus Jakarta Sans dan Fraunces (lihat `design-system.md`)

Alasan tiap pilihan ada di [`docs/RENCANA.md`](docs/RENCANA.md). Versi yang dikunci
ditulis di [`CLAUDE.md`](CLAUDE.md) setelah scaffolding.

## Dokumentasi

Mulai dari **[`CLAUDE.md`](CLAUDE.md)** — penunjuk arah singkat untuk siapa pun,
manusia maupun agen AI, yang baru masuk ke repo ini.

| Dokumen | Isi |
| --- | --- |
| [`docs/RENCANA.md`](docs/RENCANA.md) | Acuan, stack, kalender sprint, siapa mengerjakan apa, keputusan terbuka |
| [`docs/SISTEM.md`](docs/SISTEM.md) | Arsitektur, kontrak API, dan batasan antarmuka |
| [`docs/KOLABORASI.md`](docs/KOLABORASI.md) | Aturan main tim, Git, dan agen AI |
| [`docs/sumber/`](docs/sumber/) | Dokumen resmi tim: SRS, WBS, Project Charter, deskripsi proyek |
| [`AGENTS.md`](AGENTS.md) | Alur kerja agen: checkpoint, persetujuan, pelaporan |

## Menjalankan

Butuh PHP 8.3 (ekstensi `pdo_pgsql`), Composer, Node, dan PostgreSQL dengan
PostGIS. Langkah lengkap (install, `.env`, migrasi, seeder data demo, `php artisan
serve`, `npm run dev`, tes) ada di bagian *Perintah* [`CLAUDE.md`](CLAUDE.md).
Pintasan demo: `/peta?persona=commuter,zen` mengisi persona sesi tanpa dialog.

## Status

Sprint 3 selesai dan fitur sudah dibekukan (20 Nov 2026); pekan 23–27 Nov adalah
Release Sprint, serah terima final 27 November 2026. Lihat
[`PROJECT_STATE.md`](PROJECT_STATE.md) untuk kondisi terkini.
