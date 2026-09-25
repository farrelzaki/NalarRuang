# ADR-0002: Pakai Inertia + React di atas Laravel

- **Status:** Diterima
- **Tanggal:** 2026-09-25
- **Rujukan SRS/WBS:** SRS B01, SW02; WBS 1.2.3, 1.2.4

## Konteks

SRS B01 dan SW02 menyebut "Laravel (backend), Tailwind CSS dengan pustaka peta
Leaflet (frontend)" tanpa menyebut kerangka kerja JavaScript. WBS 1.2.4
menyebut "boilerplate Laravel + Tailwind CSS". Di sisi lain, Project Charter
dan Deskripsi Proyek menyebut **React**, dan Charter menugaskan Nur'Afia untuk
"mengimplementasikan komponen UI React".

Antarmuka yang diminta SRS bukan halaman statis: dialog onboarding, search bar
dua mode, panel layer, Point Inspector, dan persona yang bisa diubah tanpa
memuat ulang halaman (FR-19). Semuanya berbagi state (persona sesi, layer
aktif, pin commute) di satu halaman peta.

## Keputusan

Kami memakai **Laravel + Inertia.js + React**, dengan Leaflet dan Tailwind.
Inertia merender halaman React dari rute Laravel; data yang sering berubah
(layer per bounding box, search, inspect, commute) tetap lewat endpoint REST
JSON sesuai FR-12 dan COM02.

## Konsekuensi

Lebih baik:

- State antarmuka yang saling terkait dikelola satu kerangka kerja, bukan
  JavaScript lepas di Blade.
- Sesuai rencana peran Nur'Afia di Charter.
- Satu repo, satu deploy, satu autentikasi CSRF; tidak perlu dua proyek.
- Tetap memenuhi SRS: Laravel, Tailwind, dan Leaflet semuanya dipakai.

Lebih buruk:

- Menambah dua dependensi utama (Inertia, React) yang tidak disebut SRS.
- Leaflet bersifat imperatif; perlu disiplin supaya hanya disentuh dari
  `resources/js/Map/`, tidak dari setiap komponen.
- Anggota yang belum mengenal React perlu waktu belajar di Sprint 1.

## Alternatif yang ditolak

- **Blade + Alpine.js** — paling dekat dengan bunyi SRS, tetapi state lintas
  panel (persona, layer, pin) akan tersebar di banyak komponen kecil tanpa
  pusat. Bertentangan dengan rencana React di Charter.
- **SPA React terpisah + Laravel API murni** — dua proyek, dua deploy, dan
  CORS, untuk tim yang staging-nya layanan gratis. Tidak ada keuntungan yang
  sebanding.
- **Livewire** — tim frontend merencanakan React; Livewire juga kurang cocok
  dengan peta Leaflet yang harus mempertahankan state di klien.
