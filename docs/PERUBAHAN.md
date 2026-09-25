# Catatan Perubahan terhadap SRS dan WBS

Kelompok 4 — Developer Rumah · NalarRuang · IPB University

---

## Dasar dokumen ini

Acuan resmi proyek ini adalah **SRS v1.0** dan **WBS & WBS Dictionary**
(`docs/sumber/`). Implementasi boleh menyimpang dari keduanya, dengan syarat
**setiap penyimpangan didokumentasikan**. Dokumen ini adalah pemenuhan syarat
tersebut.

Kami memilih tidak menulisnya sebagai catatan bebas, melainkan memakai format
**Architecture Decision Record (ADR)** dari Michael Nygard — standar yang lazim
dipakai industri untuk merekam keputusan arsitektur. Setiap penyimpangan berdiri
sebagai satu berkas dengan empat bagian tetap: **Konteks, Keputusan,
Konsekuensi, Alternatif yang ditolak.**

Alasannya sederhana. Kalau dosen atau PM bertanya "kenapa tidak sesuai SRS?"
di Sprint Review, kami tidak ingin menjawab dengan ingatan. Kami ingin menunjuk
sebuah catatan yang ditulis **pada saat keputusan diambil**, lengkap dengan apa
yang kami ketahui saat itu dan apa yang kami korbankan.

## Cara membaca

Setiap ADR punya status:

| Status | Arti |
| --- | --- |
| `Diusulkan` | Sedang dipertimbangkan, belum dilaksanakan. |
| `Diterima` | Berlaku. Kode mengikuti keputusan ini. |
| `Ditolak` | Dipertimbangkan lalu tidak dipilih. Tetap disimpan, karena alasan penolakan sama berharganya. |
| `Digantikan oleh ADR-XXXX` | Pernah berlaku, kini diganti keputusan lain. |

**ADR tidak pernah dihapus dan tidak pernah disunting setelah `Diterima`.**
Kalau keputusan berubah, tulis ADR baru yang menggantikannya. Riwayat yang
bisa dihapus bukan riwayat.

## Daftar keputusan

| No | Judul | Status | Dampak terhadap SRS/WBS |
| --- | --- | --- | --- |
| [0001](perubahan/0001-acuan-srs-wbs-bukan-charter.md) | Jadikan SRS dan WBS acuan, bukan Project Charter | Diterima | Tidak mengubah SRS/WBS; menetapkan bahwa selisih dengan Charter mengikuti keduanya |
| [0002](perubahan/0002-laravel-inertia-react.md) | Pakai Inertia + React di atas Laravel | Diterima | **Menambah Inertia dan React**, yang tidak disebut SRS B01/SW02 |

## Kapan wajib menulis ADR baru

Tulis ADR kalau keputusanmu memenuhi salah satu:

- Berbeda dari yang tertulis di SRS atau WBS, sekecil apa pun.
- Mengubah angka atau aturan yang ditetapkan (Top 3, skala 0–3 bintang, cakupan
  Jabodetabek, jadwal sprint).
- Mengubah cara pengguna berinteraksi dengan sistem.
- Mengganti atau membuang teknologi yang disebut namanya di SRS.
- Menutup sebuah TBD dari SRS Lampiran B atau `docs/PLAN.md`.

**Tidak perlu** ADR untuk: pilihan nama variabel, struktur folder, pustaka
pembantu kecil yang tidak disebut SRS, atau perbaikan bug.

## Membuat ADR baru

Salin `perubahan/0000-template.md`, beri nomor urut berikutnya, isi keempat
bagiannya, lalu tambahkan barisnya ke tabel di atas. Judul ditulis sebagai
frasa perintah yang pendek, seperti pesan commit.

**Bagian "Alternatif yang ditolak" jangan dikosongkan.** Bagian itulah yang
membedakan sebuah keputusan dari sekadar hal yang kebetulan terjadi, dan
bagian itu pula yang paling sering ditanyakan di Sprint Review.
