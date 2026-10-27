"""
Selang keberangkatan (headway) TransJakarta per rute -> data/transit/headway_tj.csv

Sumber: GTFS resmi TransJakarta (gtfs.transjakarta.co.id), berkas frequencies.txt. Dipakai untuk waktu tunggu
di Commute Simulator (temuan C-03, C-05), menggantikan konstanta tunggu yang sama untuk semua rute.

Kolom: kode_rute, nama_rute, jenis_layanan, trip_id, arah, mulai, selesai, headway_menit, tunggu_rata2_menit.
tunggu_rata2_menit = headway / 2 (penumpang datang acak).

Selang KRL, MRT, dan LRT tidak ada di GTFS rel Opentransum (hanya satu perjalanan contoh per lintas), jadi
dicatat manual dari sumber resmi di data/transit/headway_rel.csv.

Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/olah_jadwal_transit.py
GTFS disimpan di storage/app/tarik/gtfs_tj.zip (sama dengan tarik_data.py) sehingga jalan ulang tidak mengunduh lagi.
"""
import csv
import io
import os
import urllib.request
import zipfile

GTFS_TJ = 'https://gtfs.transjakarta.co.id/files/file_gtfs.zip'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
CACHE = 'storage/app/tarik/gtfs_tj.zip'
KELUAR = 'data/transit/headway_tj.csv'


def gtfs():
    if not os.path.exists(CACHE):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        req = urllib.request.Request(GTFS_TJ, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=300) as r, open(CACHE, 'wb') as f:
            f.write(r.read())
    return zipfile.ZipFile(CACHE)


def baca(z, nama):
    return list(csv.DictReader(io.TextIOWrapper(z.open(nama), encoding='utf-8-sig')))


def main():
    z = gtfs()
    rute = {r['route_id']: r for r in baca(z, 'routes.txt')}
    trip = {t['trip_id']: t for t in baca(z, 'trips.txt')}
    baris = []
    for f in baca(z, 'frequencies.txt'):
        t = trip.get(f['trip_id'])
        if not t:
            continue
        r = rute.get(t['route_id'], {})
        h = int(f['headway_secs']) / 60
        baris.append({
            'kode_rute': r.get('route_short_name') or t['route_id'], 'nama_rute': r.get('route_long_name'),
            'jenis_layanan': r.get('route_desc'), 'trip_id': f['trip_id'],
            'arah': t.get('trip_headsign') or t.get('trip_short_name'), 'mulai': f['start_time'][:5],
            'selesai': f['end_time'][:5], 'headway_menit': round(h, 1), 'tunggu_rata2_menit': round(h / 2, 1),
        })
    baris.sort(key=lambda b: (b['kode_rute'], b['trip_id'], b['mulai']))
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(baris[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(baris)
    hs = sorted(b['headway_menit'] for b in baris)
    print(f'{KELUAR}: {len(baris)} baris, {len({b["kode_rute"] for b in baris})} rute, '
          f'headway median {hs[len(hs) // 2]} menit')


if __name__ == '__main__':
    main()
