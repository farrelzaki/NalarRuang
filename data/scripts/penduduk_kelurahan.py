"""
Estimasi jumlah penduduk per kelurahan -> data/penduduk/penduduk_2025_kelurahan.csv  (kebutuhan B-09)

Dipakai untuk menormalkan jumlah POI OSM (fasilitas per 10.000 penduduk), supaya kawasan yang rajin dipetakan
tidak terlihat lebih ramai daripada kenyataannya (evaluasi sumber data, temuan I-04).

Sumber utama: WorldPop Global2 R2025A, Indonesia 2025, constrained 100 m (penduduk per sel di area terbangun),
lisensi CC BY 4.0. Atribusi: "WorldPop (www.worldpop.org), R2025A". Ini estimasi model, bukan data registrasi.
Jumlah per kelurahan = jumlah sel yang pusatnya di dalam poligon kelurahan (data/geojson/demo/wilayah.geojson).

Pembanding: Data Kependudukan Bersih (DKB) Semester 2 2024 Sudin Dukcapil Jakarta Pusat (PDF publik, 44 kelurahan),
satu-satunya tabel per kelurahan resmi yang terbuka tanpa permohonan. Hasil pembandingnya ditulis ke
data/penduduk/pembanding_jakarta_pusat.csv.

Butuh: Python 3 + numpy, rasterio, shapely; pdftotext (poppler) untuk pembanding.
Jalankan dari akar repo:  python data/scripts/penduduk_kelurahan.py
"""
import csv
import json
import os
import re
import subprocess
import urllib.request

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
from shapely.geometry import shape

UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
WORLDPOP = ('https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2025/IDN/v1/100m/constrained/'
            'idn_pop_2025_CN_100m_R2025A_v1.tif')
DKB_JP = ('https://kependudukancapil.jakarta.go.id/sudin-jp/assets/repo/informasi-publik/informasi-kependudukan/'
          'DKB_S2_2024.pdf')
CACHE = 'storage/app/tarik/penduduk'
WILAYAH = 'data/geojson/demo/wilayah.geojson'
KELUAR = 'data/penduduk'


def unduh(url, nama):
    os.makedirs(CACHE, exist_ok=True)
    berkas = f'{CACHE}/{nama}'
    if not os.path.exists(berkas):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=1800) as r, open(berkas + '.part', 'wb') as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
        os.replace(berkas + '.part', berkas)
    return berkas


def hitung_worldpop():
    with open(WILAYAH, encoding='utf-8') as f:
        wilayah = json.load(f)['features']
    baris = []
    with rasterio.open(unduh(WORLDPOP, 'idn_pop_2025_CN_100m_R2025A_v1.tif')) as src:
        for fitur in wilayah:
            g = shape(fitur['geometry'])
            win = from_bounds(*g.bounds, transform=src.transform).round_offsets().round_lengths()
            win = win.intersection(rasterio.windows.Window(0, 0, src.width, src.height))
            data = src.read(1, window=win, masked=True)
            if data.size == 0:
                total = 0.0
            else:
                tr = src.window_transform(win)
                luar = geometry_mask([fitur['geometry']], out_shape=data.shape, transform=tr, invert=False)
                total = float(np.ma.masked_array(data, mask=np.ma.getmaskarray(data) | luar).sum() or 0)
            pr = fitur['properties']
            luas_km2 = g.area * (111.32 * 110.57) * np.cos(np.radians(g.centroid.y))
            baris.append({'kode_kemendagri': (pr.get('atribut') or {}).get('kode_kemendagri'), 'nama': pr.get('nama'),
                          'kecamatan': pr.get('kecamatan'), 'kota': pr.get('kota'), 'penduduk_2025_est': round(total),
                          'luas_km2': round(luas_km2, 2), 'kepadatan_per_km2': round(total / luas_km2) if luas_km2 else ''})
    return baris


def pembanding(baris):
    teks = subprocess.run(['pdftotext', '-layout', unduh(DKB_JP, 'DKB_S2_2024_jakarta_pusat.pdf'), '-'],
                          capture_output=True, text=True).stdout
    resmi = {}
    bagian = teks[teks.find('PER-KELURAHAN'):]
    for line in bagian.splitlines():
        m = re.match(r'\s*(?:KEL\.\s*)?([A-Z][A-Z .\'-]+?)\s{2,}([\d.,\s]+)$', line)
        if not m or m.group(1).strip().startswith(('KEC', 'JAKARTA', 'KELURAHAN', 'TOTAL')):
            continue
        angka = [int(x.replace(',', '').replace('.', '')) for x in m.group(2).split()]
        if len(angka) >= 12:
            resmi[m.group(1).strip().title()] = angka[-1]   # kolom terakhir: WNI + WNA, L+P
    est = {b['nama'].lower(): b['penduduk_2025_est'] for b in baris if b['kota'] == 'Jakarta Pusat'}
    hasil = []
    for nama, n in sorted(resmi.items()):
        e = est.get(nama.lower())
        hasil.append({'kelurahan': nama, 'dkb_s2_2024': n, 'worldpop_2025': e if e is not None else '',
                      'rasio_worldpop_dkb': round(e / n, 2) if e else ''})
    return hasil


def tulis(nama, baris):
    with open(f'{KELUAR}/{nama}', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(baris[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(baris)


def main():
    os.makedirs(KELUAR, exist_ok=True)
    baris = hitung_worldpop()
    tulis('penduduk_2025_kelurahan.csv', baris)
    total = sum(b['penduduk_2025_est'] for b in baris)
    print(f'{len(baris)} kelurahan, total estimasi {total:,}')
    banding = pembanding(baris)
    if banding:
        tulis('pembanding_jakarta_pusat.csv', banding)
        r = [b['rasio_worldpop_dkb'] for b in banding if b['rasio_worldpop_dkb'] != '']
        print(f'pembanding Jakarta Pusat: {len(banding)} kelurahan, rasio median {sorted(r)[len(r) // 2] if r else "-"}')


if __name__ == '__main__':
    main()
