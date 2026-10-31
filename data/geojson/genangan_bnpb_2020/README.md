# Genangan banjir 2020 (BNPB)

Pengganti titik Genangan Berulang DSDA (kebutuhan A-03), karena dataset DSDA di Satu Data Jakarta berstatus
Terbatas dan perlu izin. Sumber: layanan peta publik BNPB tanpa token, folder `Banjir_Jakarta_2020`
(lembaga yang sama dengan InaRISK di layer banjir). Atribusi: BNPB.
Dibuat dengan `python data/scripts/tarik_genangan_bnpb.py`. Dimuat oleh `database/seeders/DataNyataSeeder.php`.

| Berkas | Isi |
| --- | --- |
| `genangan_dki_jan2020.geojson` | 857 poligon genangan DKI saat banjir 1-3 Januari 2020 |
| `genangan_tangerang_2020.geojson` | 2 poligon kelurahan terdampak di Kota Tangerang (Maret 2020) |
| `genangan_tangsel_2020.geojson` | 2 poligon kelurahan terdampak di Tangerang Selatan (Maret 2020) |

- Ini catatan satu kejadian besar, bukan peta kerawanan. Tampilkan sebagai "pernah tergenang saat banjir 2020"
  berdampingan dengan peta bahaya InaRISK, bukan sebagai pengganti peta bahaya.
- Data Tangerang dan Tangerang Selatan hanya di tingkat kelurahan dan sangat sedikit.
- Arsip laporan warga PetaBencana.id tidak dipakai karena lisensinya tidak tertulis di situsnya.
