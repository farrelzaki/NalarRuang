"""
Selang keberangkatan KRL per lintas dan jam -> data/transit/headway_krl.csv  (melengkapi A-07)

Sumber: API terbuka Comuline (api.comuline.com), yang menyalin jadwal resmi KAI Commuter. Jadwal di API itu
terakhir diperbarui Maret 2025 (kolom jadwal_diperbarui), jadi angkanya mencerminkan Gapeka saat itu; cek ulang
bila ada Gapeka baru.
Waktu di API dalam UTC dan dikonversi ke WIB (+7 jam).

Cara hitung: di satu stasiun acuan per lintas, hitung kereta penumpang yang berangkat per arah dalam tiap
rentang jam, lalu headway = panjang rentang / jumlah kereta. Kereta dinas (tidak angkut penumpang) dibuang.

Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/olah_jadwal_krl.py
"""
import collections
import csv
import json
import os
import urllib.request

API = 'https://api.comuline.com/v1/schedule/'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
CACHE = 'storage/app/tarik/comuline'
KELUAR = 'data/transit/headway_krl.csv'
# lintas -> (kode stasiun acuan, nama stasiun, potongan nama di kolom `line`)
ACUAN = {
    'Bogor': ('MRI', 'Manggarai', 'COMMUTER LINE BOGOR'),
    'Cikarang': ('THB', 'Tanah Abang', 'COMMUTER LINE CIKARANG'),
    'Rangkasbitung': ('THB', 'Tanah Abang', 'COMMUTER LINE RANGKASBITUNG'),
    'Tangerang': ('DU', 'Duri', 'COMMUTER LINE TANGERANG'),
    'Tanjung Priok': ('JAKK', 'Jakarta Kota', 'COMMUTER LINE TANJUNGPRIUK'),
    'Bandara (BST)': ('DU', 'Duri', 'COMMUTER LINE BST'),
}
RENTANG = [('pagi sibuk', 6, 9), ('siang', 9, 16), ('sore sibuk', 16, 19), ('malam', 19, 22)]


def jadwal(kode):
    os.makedirs(CACHE, exist_ok=True)
    berkas = f'{CACHE}/{kode}.json'
    if not os.path.exists(berkas):
        req = urllib.request.Request(API + kode, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(berkas, 'wb') as f:
            f.write(r.read())
    with open(berkas, encoding='utf-8') as f:
        return json.load(f)['data']


def main():
    baris = []
    for lintas, (kode, stasiun, nama_line) in ACUAN.items():
        data = [x for x in jadwal(kode) if x['line'] == nama_line]
        diperbarui = max(x['updated_at'][:10] for x in data) if data else ''
        for label, j0, j1 in RENTANG:
            per_arah = collections.Counter()
            for x in data:
                jam = (int(x['departs_at'][11:13]) + 7) % 24
                if j0 <= jam < j1:
                    per_arah[x['station_destination_id']] += 1
            # arah = tujuan akhir; tujuan yang sama arahnya (mis. Bogor dan Depok) digabung lewat jumlah terbesar dua arah
            jumlah = sorted(per_arah.values(), reverse=True)
            kereta = sum(jumlah) / 2 if len(jumlah) > 1 else sum(jumlah)
            menit = (j1 - j0) * 60
            baris.append({'lintas': lintas, 'stasiun_acuan': stasiun, 'rentang': f'{label} {j0:02d}.00-{j1:02d}.00',
                          'kereta_per_arah': round(kereta, 1),
                          'headway_menit': round(menit / kereta, 1) if kereta else '',
                          'jadwal_diperbarui': diperbarui})
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(baris[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(baris)
    for b in baris:
        print(b['lintas'], b['rentang'], b['headway_menit'])


if __name__ == '__main__':
    main()
