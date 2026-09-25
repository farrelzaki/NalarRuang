# Desain Antarmuka

Status: **placeholder** · Diisi di tahap 2 setelah prototipe Figma tersedia (TBD-02, WBS 1.2.1.3)

---

Sampai desain Figma masuk, satu-satunya pegangan adalah batasan di SRS. Semua
yang tertulis di bawah **wajib**, karena berasal langsung dari SRS v1.0.
Selebihnya jangan ditebak; tunggu desainnya.

## Batasan yang sudah pasti

| Sumber | Batasan |
| --- | --- |
| SRS B03, 5.4 | **Satu tipografi: Plus Jakarta Sans.** Tidak ada font kedua, termasuk untuk angka atau ikon teks. |
| SRS B03 | Responsif untuk **desktop**. Mobile native di luar cakupan. |
| SRS B02 | Seluruh teks antarmuka dalam **Bahasa Indonesia**. |
| SRS 5.4 | Bisa dipakai pengguna baru tanpa pelatihan. |

## Komponen dari SRS 3.1

| ID | Komponen | Yang sudah ditetapkan SRS |
| --- | --- | --- |
| UI00 | Dialog onboarding persona | Checkbox multi-pilih 4 persona, deskripsi singkat tiap persona, minimal satu wajib dicentang (Business Rule 7) |
| UI01 | Visual Explorer | Search bar di **pojok kanan atas**, hamburger menu, panel filter 6 layer di **kanan bawah**, timeline slider Mesin Waktu |
| UI02 | Search bar | Dua ikon: **kaca pembesar** (Requirement Search) dan **orang berjalan** (toggle ke Commute Simulator, dua kolom input). Pola seperti Google Maps |
| UI03 | Panel Point Inspector | Side-panel, **tombol tutup di sisi kiri**, skor bintang 0–3 empat persona, auto-summary untuk persona sesi |
| UI04 | Panel Commute Simulator | Estimasi jarak & waktu dua moda berdampingan |
| UI05 | Hamburger menu | Tiga sub-menu: Pengaturan Preferensi Persona, Legenda, Deskripsi Aplikasi |

## Perilaku yang sudah ditetapkan

- Filter aktif **menyorot** area relevan dan **meredupkan** sisanya (FR-02).
- Memilih rekomendasi memicu animasi **fly-to** (FR-07).
- Mengubah persona dari menu **tidak** memuat ulang halaman (FR-19).
- Titik tanpa data menampilkan "data tidak tersedia" (UC-04); skor dengan data
  kurang menampilkan catatan "data tidak lengkap" (UC-05), **bukan** 0 bintang.

## Belum ditentukan

- Palet warna, termasuk skema warna indeks risiko (asumsi WBS 1.4.3).
- Nama singkat enam layer (TBD-08).
- Ukuran, jarak, dan tata letak persis.
- Ikon dan legenda simbol peta.
