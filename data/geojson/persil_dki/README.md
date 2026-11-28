# Bidang tanah DKI Jakarta (`layer_id = persil`)

`persil_dki.ndjson.gz`: 109.002 bidang, satu per baris: `{"a": atribut, "g": EWKB heksadesimal (SRID 4326)}`.
Dimuat `DemoPetaSeeder::imporPersil()`.

**Sumber.** Hasil pencarian manual tim dari berbagai sumber publik, termasuk ATR/BPN (izin dikonfirmasi tim,
14 Nov 2026). Diekspor 28 Nov 2026 dari basis data lokal.

**Isi atribut.** Zona tata ruang (`namzon_1`, `kodzon_1`, `kodszn_1`), `kdb`, `klb`, `kdh`, luas (`luasha`, hektare),
kelurahan/kecamatan/kota, dan `objectid`. Atribut lain (daftar kegiatan yang diizinkan, dll.) dibuang agar muat di
Heroku Postgres; geometri disederhanakan sekitar 0,5 m.

**Batasan.** Data ini **tidak memuat status hak atas tanah, NIB, atau pemilik**. Jangan menampilkannya sebagai
bukti kepemilikan atau sertifikat.
