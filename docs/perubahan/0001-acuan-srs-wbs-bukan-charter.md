# ADR-0001: Jadikan SRS dan WBS acuan, bukan Project Charter

- **Status:** Diterima
- **Tanggal:** 2026-09-25
- **Rujukan SRS/WBS:** SRS 1.4, 2.1 (pergeseran nilai utama); WBS bagian B dan D

## Konteks

Tim punya tiga dokumen resmi yang isinya tidak sama:

| Hal | Project Charter (1 Sep) | SRS v1.0 (20 Sep) dan WBS |
| --- | --- | --- |
| Nilai utama | Mengatasi asimetri informasi properti | Personalisasi pencarian hunian berdasarkan gaya hidup |
| Layer MVP | 3: Banjir, Transportasi, Komersial Mikro | 6: Historis & Risiko, Ekosistem, Inklusivitas, Mobilitas, Mesin Waktu, Legalitas |
| Layer Inklusivitas & Legalitas | Di luar cakupan | Di dalam cakupan |
| Data | Pipeline Python otomatis, NLP scraping, MongoDB | Diolah di QGIS, diekspor GeoJSON, diimpor ke PostGIS |
| Fitur | Web Map, Layer Filter, Point Inspector | + Requirement Search, Persona Grading, Commute Simulator, onboarding persona |
| Jadwal | Demo 13 Okt / 10 Nov / 24 Nov, final 1 Des | Review 16 Okt / 6 Nov / 20 Nov, final 27 Nov |
| Sponsor | Karsa City Lab | Belum ada sponsor (WBS 1.1.1, SRS 2.4) |

SRS 1.4 dan 2.1 sendiri mencatat bahwa ia mengikuti WBS terbaru dan bahwa nilai
utama bergeser sejak Charter. Agen AI dan anggota tim yang membaca Charter lebih
dulu akan membangun sistem yang salah.

## Keputusan

Kami memakai **SRS v1.0 dan WBS** sebagai satu-satunya acuan cakupan, fitur,
teknologi, dan jadwal. Project Charter tetap disimpan di `docs/sumber/CHARTER.md`
sebagai riwayat, tetapi tidak dipakai untuk memutuskan apa pun. Kalau SRS dan
WBS bertentangan satu sama lain, berhenti dan tanyakan PM.

## Konsekuensi

Lebih baik:

- Satu sumber kebenaran. Tidak ada perdebatan "tapi di Charter tertulis...".
- Cakupan yang dibangun sama dengan yang akan diuji di UAT (WBS 1.5.2 menguji
  terhadap SRS).
- Tidak ada MongoDB dan pipeline NLP, dua komponen yang tidak punya work
  package dan tidak punya pemilik.

Lebih buruk:

- Cakupan justru **lebih besar** dari Charter: enam layer, bukan tiga, dengan
  jadwal empat hari lebih pendek. Layer Inklusivitas dan Legalitas berisiko
  datanya tipis.
- Anggaran di Charter (Mapbox, Google Distance Matrix, MongoDB Atlas) tidak
  lagi cocok dengan teknologi yang dipakai. Belum ada anggaran pengganti untuk
  mesin routing (TBD-ROUTE).

## Alternatif yang ditolak

- **Charter sebagai acuan** — sudah dinyatakan usang oleh SRS dan WBS sendiri,
  dan jadwalnya tidak cocok dengan kalender praktikum MPTI.
- **Gabungan keduanya** (fitur SRS + teknologi Charter) — menghasilkan MongoDB
  dan pipeline NLP tanpa pemilik dan tanpa waktu; tidak ada yang bisa
  menjelaskan kenapa komponen itu ada.
