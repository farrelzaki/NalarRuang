"""
PM2.5 tahunan dari satelit per kelurahan -> data/udara/pm25_satelit_<tahun>_kelurahan.csv

Sumber: SatPM V6.GL.03, Atmospheric Composition Analysis Group (ACAG), Washington University in St. Louis.
  PM2.5 permukaan hasil satelit yang dikalibrasi dengan stasiun darat, grid 0,01 derajat (+-1 km), 1998-2024.
  Unduh bebas dari bucket S3 publik `satpmdata` (tanpa akun), lisensi CC BY 4.0.
  https://sites.wustl.edu/acag/datasets/surface-pm2-5  ·  https://registry.opendata.aws/satpmdata/
  Sitasi: makalah yang tercantum di halaman SatPM V6.GL.03 (https://www.satpm.org).

Cara hitung: rata-rata semua sel grid yang pusatnya jatuh di dalam poligon kelurahan
(data/geojson/demo/wilayah.geojson, batas BIG). Kelurahan yang lebih kecil dari satu sel memakai sel terdekat
dari titik di dalam poligonnya. Kolom `jumlah_sel` menunjukkan berapa sel yang dirata-rata.

Catatan mutu: dibanding 5 stasiun ISPU DKI (2024-2025), nilai satelit 1-9 ug/m3 lebih tinggi dan urutan
antarstasiun tidak sama. Pakai untuk pola besar (Jakarta vs pinggiran), bukan untuk membedakan dua kelurahan
yang bersebelahan.

Butuh: Python 3 + numpy, netCDF4, shapely  (pip install numpy netCDF4 shapely)
Jalankan dari akar repo:  python data/scripts/udara_satelit.py [tahun]     (bawaan 2024)
Berkas Asia (+-93 MB) disimpan di storage/app/tarik/satpm/ sehingga jalan ulang tidak mengunduh lagi.
"""
import csv
import json
import os
import sys
import urllib.request

import numpy as np
from netCDF4 import Dataset
from shapely.geometry import Point, shape
from shapely.prepared import prep

UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
CACHE = 'storage/app/tarik/satpm'
WILAYAH = 'data/geojson/demo/wilayah.geojson'
KELUAR = 'data/udara'
KOTAK = (106.35, -6.85, 107.25, -5.95)   # minLon, minLat, maxLon, maxLat Jabodetabek + tepi
BAKU_MUTU = 15.0                          # PM2.5 tahunan, PP 22/2021 Lampiran VII (ug/m3)


def unduh(tahun):
    os.makedirs(CACHE, exist_ok=True)
    nama = f'V6GL03.CNNPM25.AS.{tahun}01-{tahun}12.nc'
    berkas = f'{CACHE}/{nama}'
    if not os.path.exists(berkas):
        url = f'https://satpmdata.s3.amazonaws.com/V6GL03/CNNPM25/Annual/AS/{nama}'
        print('mengunduh', url)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=900) as r, open(berkas + '.part', 'wb') as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
        os.replace(berkas + '.part', berkas)
    return berkas


def potong(berkas):
    with Dataset(berkas) as nc:
        lat, lon = nc['lat'][:], nc['lon'][:]
        iy = np.where((lat >= KOTAK[1]) & (lat <= KOTAK[3]))[0]
        ix = np.where((lon >= KOTAK[0]) & (lon <= KOTAK[2]))[0]
        nilai = nc['PM25'][iy.min():iy.max() + 1, ix.min():ix.max() + 1]
        return np.asarray(lat[iy]), np.asarray(lon[ix]), np.ma.filled(nilai.astype(float), np.nan)


def main():
    tahun = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    lat, lon, v = potong(unduh(tahun))
    LON, LAT = np.meshgrid(lon, lat)
    with open(WILAYAH, encoding='utf-8') as f:
        wilayah = json.load(f)['features']

    baris = []
    for fitur in wilayah:
        g = shape(fitur['geometry'])
        p = prep(g)
        x0, y0, x1, y1 = g.bounds
        kandidat = np.argwhere((LON >= x0) & (LON <= x1) & (LAT >= y0) & (LAT <= y1))
        isi = [v[i, j] for i, j in kandidat if p.contains(Point(LON[i, j], LAT[i, j])) and not np.isnan(v[i, j])]
        if not isi:  # kelurahan lebih kecil dari satu sel
            c = g.representative_point()
            isi = [v[np.abs(lat - c.y).argmin(), np.abs(lon - c.x).argmin()]]
        rata = float(np.nanmean(isi))
        pr = fitur['properties']
        baris.append({
            'kode_kemendagri': (pr.get('atribut') or {}).get('kode_kemendagri'), 'nama': pr.get('nama'),
            'kecamatan': pr.get('kecamatan'), 'kota': pr.get('kota'), f'pm25_{tahun}_ugm3': round(rata, 1),
            'jumlah_sel': len(isi), 'kali_baku_mutu': round(rata / BAKU_MUTU, 2),
        })

    os.makedirs(KELUAR, exist_ok=True)
    keluar = f'{KELUAR}/pm25_satelit_{tahun}_kelurahan.csv'
    with open(keluar, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(baris[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(baris)
    a = np.array([b[f'pm25_{tahun}_ugm3'] for b in baris])
    print(f'{keluar}: {len(baris)} kelurahan, {a.min():.1f}-{a.max():.1f} ug/m3 (median {np.median(a):.1f})')


if __name__ == '__main__':
    main()
