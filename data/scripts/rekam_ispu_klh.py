"""
Rekam ISPU per jam dari stasiun KLH di Jabodetabek -> data/udara/ispu_klh/YYYY-MM.csv

Situs ISPU KLH (https://ispu.kemenlh.go.id) hanya menampilkan nilai hari ini per jam, tanpa arsip.
Skrip ini dijalankan dua kali sehari (sekitar 12.30 dan 23.50 WIB) supaya semua jam tercatat, lalu
baris yang sudah ada dilewati, jadi aman dijalankan berulang.

Cara ambil: API yang dipanggil peta publik situs itu sendiri, tanpa login. Token pembaca dibaca saat
jalan dari berkas JavaScript publik situs, tidak disimpan di repo. Satu permintaan daftar stasiun +
satu permintaan per stasiun Jabodetabek (12 stasiun per 25 Okt 2026), dengan jeda antar-permintaan.

Nilai yang disimpan adalah angka ISPU (indeks 0-500) per parameter, persis seperti di situs,
bukan konsentrasi. Kolom: waktu (WIB), id_stasiun, nama, kota, lat, lon, pm25, pm10, o3, no2, so2, co, hc.

Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/rekam_ispu_klh.py
"""
import csv
import json
import os
import re
import sys
import time
import urllib.request

SITUS = 'https://ispu.kemenlh.go.id'
API = SITUS + '/apiweb'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
KELUAR = 'data/udara/ispu_klh'
JEDA = 2.0
JABODETABEK = re.compile(r'jakarta|bogor|depok|bekasi|tangerang', re.I)
PARAMETER = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'hc']
KOLOM = ['waktu', 'id_stasiun', 'nama', 'kota', 'lat', 'lon'] + PARAMETER


def get(url, headers=None, json_=True):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return json.loads(data) if json_ else data.decode('utf-8', 'ignore')


def token_publik():
    """Token pembaca yang dipakai aplikasi peta publik, dibaca dari bundel JS-nya (berganti saat situs dirilis ulang)."""
    html = get(SITUS + '/app/', json_=False)
    main = re.search(r'src="(main\.[0-9a-f]+\.js)"', html)
    if not main:
        raise RuntimeError('bundel main.*.js tidak ditemukan di halaman aplikasi ISPU')
    js = get(SITUS + '/app/' + main.group(1), json_=False)
    m = re.search(r'api:\{url:\[[^\]]*\],token:"([^"]+)"', js)
    if not m:
        raise RuntimeError('token pembaca tidak ditemukan; struktur situs ISPU mungkin berubah')
    return m.group(1)


def nilai(x):
    if isinstance(x, dict):
        x = x.get('nilai')
    if x in (None, '', '-', 'null'):
        return ''
    try:
        return int(float(x))
    except ValueError:
        return ''


def baris_stasiun(d):
    """Ubah jawaban /stasiun/detail menjadi baris per jam (hanya jam yang punya minimal satu nilai)."""
    hasil = []
    for i, waktu in enumerate(d.get('waktu_24') or []):
        b = {'waktu': waktu, 'id_stasiun': d['id_stasiun'], 'nama': d.get('nama'), 'kota': d.get('kota'),
             'lat': round(float(d['lat']), 6), 'lon': round(float(d['lon']), 6)}
        for p in PARAMETER:
            seri = d.get(f'{p}_24_rev') or []
            b[p] = nilai(seri[i]) if i < len(seri) else ''
        if any(b[p] != '' for p in PARAMETER):
            hasil.append(b)
    return hasil


def simpan(baris):
    per_bulan = {}
    for b in baris:
        per_bulan.setdefault(b['waktu'][:7], []).append(b)
    baru = 0
    for bulan, daftar in per_bulan.items():
        berkas = f'{KELUAR}/{bulan}.csv'
        ada = set()
        if os.path.exists(berkas):
            with open(berkas, newline='', encoding='utf-8') as f:
                ada = {(r['waktu'], r['id_stasiun']) for r in csv.DictReader(f)}
        tambah = [b for b in daftar if (b['waktu'], b['id_stasiun']) not in ada]
        if not tambah:
            continue
        tulis_judul = not os.path.exists(berkas)
        with open(berkas, 'a', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=KOLOM, lineterminator='\n')
            if tulis_judul:
                w.writeheader()
            w.writerows(sorted(tambah, key=lambda b: (b['waktu'], b['id_stasiun'])))
        baru += len(tambah)
    return baru


def main():
    os.makedirs(KELUAR, exist_ok=True)
    kepala = {'Authorization': 'Bearer ' + token_publik(), 'Content-Type': 'application/json'}
    stasiun = [s for s in get(API + '/stasiun', kepala)['rows'] if JABODETABEK.search(json.dumps(s))]
    if not stasiun:
        raise RuntimeError('tidak ada stasiun Jabodetabek di daftar; periksa API ISPU')
    semua, gagal = [], []
    for s in stasiun:
        time.sleep(JEDA)
        try:
            rows = get(f"{API}/stasiun/detail/id/{s['id_stasiun']}", kepala).get('rows') or []
            if rows:
                semua += baris_stasiun(rows[0])
        except Exception as e:  # satu stasiun gagal tidak menghentikan stasiun lain
            gagal.append(f"{s['id_stasiun']}: {e}")
    baru = simpan(semua)
    print(f'{len(stasiun)} stasiun, {len(semua)} baris dibaca, {baru} baris baru')
    if gagal:
        print('gagal:', '; '.join(gagal))
    if gagal and not semua:
        sys.exit(1)


if __name__ == '__main__':
    main()
