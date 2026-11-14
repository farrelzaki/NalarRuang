"""Gabungkan jaringan rencana JUTPI3 (ModaHub) dengan fase dan tahun dari video rujukan dan proyek.csv.

Masukan (data/mesin_waktu/):
  jutpi3_modahub.geojson   garis per lin + stasiun, diunduh dari ModaHub (dataset plan2045), CC BY-NC 4.0
  fase_video_jutpi3.csv    fase dan tahun yang dibaca dari video https://youtu.be/DNarc_hZMXY
  proyek.csv / .geojson    proyek kurasi tim (tahun dari berita resmi), menang bila tersedia
Keluaran:
  proyek_jutpi3.geojson    garis per fase, siap dibaca DataNyataSeeder (layer mesin_waktu)

Aturan tahun: proyek.csv (berita resmi, lebih baru) > video > 2045 untuk fase/lin tanpa tahun ("Rencana 2045").
Fase yang sudah punya garis OSM di proyek.geojson dilewati agar tidak dobel. Fase yang sudah beroperasi dilewati.

    python data/scripts/gabung_jutpi3.py
"""
import csv
import json
import math
from pathlib import Path

DIR = Path(__file__).resolve().parents[1] / 'mesin_waktu'
TAHUN_RENCANA = 2045
VIDEO = 'https://youtu.be/DNarc_hZMXY'
SUMBER_JUTPI = 'JUTPI3 2045 via ModaHub (CC BY-NC 4.0)'

# Nama di video -> nama stasiun di ModaHub (bila beda).
ALIAS = {
    'Bandara Soekarno-Hatta': 'Bandara Soetta Terminal 1&2',
    'Pulo Gebang': 'Pulogebang',
    'Jatimulya': 'Jati Mulya',
    'Dukuh Atas': None,  # banyak varian; dicari dengan awalan
}

# Ujung fase yang kosong di CSV (label video terlalu kecil), dilengkapi dari urutan lin di ModaHub.
UJUNG_TAMBAHAN = {18: ('Pesing', 'Kota BNI'), 19: ('Fatmawati', 'Pantai Indah Kapuk'), 28: (None, None)}

# Lin rencana ModaHub yang tidak muncul di video (video hanya MRT/LRT); kereta ikut, bus tidak.
LIN_TAMBAHAN = {
    'ER': ('Eastern Ring Line (Nambo - Tanjung Priok)', 'krl'),
    'WR': ('Western Ring Line (Citayam - Parung Panjang)', 'krl'),
    'JIS': ('JIS Line (Jatinegara - Tanjung Priok)', 'krl'),
    'ICT JG': ('Jonggol Local Line (Cianjur - Mekarsari)', 'krl'),
    'ICT LW': ('Leuwiliang Local Line (Bojong Gede - Rangkasbitung)', 'krl'),
    'TB': ('Tram Bogor (Sukaraja - Bangka)', 'lrt'),
}


def jarak_m(a, b):
    lat = math.radians((a[1] + b[1]) / 2)
    return math.hypot((b[0] - a[0]) * 111320 * math.cos(lat), (b[1] - a[1]) * 110570)


def proyeksi(garis, titik):
    """Jarak sepanjang garis (meter) dari titik terdekat pada garis ke awal garis."""
    terbaik, sepanjang, kumulatif = (float('inf'), 0.0), 0.0, 0.0
    lat = math.radians(titik[1])
    kx, ky = 111320 * math.cos(lat), 110570
    for a, b in zip(garis, garis[1:]):
        ax, ay, bx, by = a[0] * kx, a[1] * ky, b[0] * kx, b[1] * ky
        px, py = titik[0] * kx, titik[1] * ky
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
        d = math.hypot(ax + t * dx - px, ay + t * dy - py)
        if d < terbaik[0]:
            terbaik = (d, kumulatif + t * math.sqrt(L2))
        kumulatif += math.sqrt(L2)
    return terbaik


def potong(garis, s0, s1):
    """Bagian garis antara jarak s0 dan s1 (meter), diinterpolasi di kedua ujung."""
    if s0 > s1:
        s0, s1 = s1, s0
    hasil, kumulatif = [], 0.0
    for a, b in zip(garis, garis[1:]):
        L = jarak_m(a, b)
        awal, akhir = kumulatif, kumulatif + L
        if akhir >= s0 and awal <= s1 and L > 0:
            t0, t1 = max(0.0, (s0 - awal) / L), min(1.0, (s1 - awal) / L)
            p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0]
            p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]
            if not hasil:
                hasil.append(p0)
            hasil.append(p1)
        kumulatif = akhir
    return [[round(x, 6), round(y, 6)] for x, y in hasil]


def main():
    data = json.loads((DIR / 'jutpi3_modahub.geojson').read_text(encoding='utf-8'))
    lin, stasiun = {}, []
    for f in data['features']:
        p = f['properties']
        if p['jenis'] == 'lintasan':
            # Satu arah per lin cukup; ambil yang terpanjang.
            if p['kode'] not in lin or len(f['geometry']['coordinates']) > len(lin[p['kode']][1]):
                lin[p['kode']] = (p, f['geometry']['coordinates'])
        else:
            stasiun.append(f)

    def cari_stasiun(nama, kode):
        nama = ALIAS.get(nama, nama) or nama
        calon = [s for s in stasiun if kode in s['properties']['lin']]
        persis = [s for s in calon if s['properties']['nama'].lower() == nama.lower()]
        awal = [s for s in calon if s['properties']['nama'].lower().startswith(nama.lower())]
        pilihan = persis or awal
        if not pilihan:
            raise SystemExit(f'Stasiun "{nama}" tidak ada di lin {kode}')
        return pilihan[0]['geometry']['coordinates']

    proyek = {r['id']: r for r in csv.DictReader((DIR / 'proyek.csv').open(encoding='utf-8'))}
    punya_garis = {f['properties']['id'] for f in json.loads((DIR / 'proyek.geojson').read_text(encoding='utf-8'))['features'] if f['geometry']}

    keluar, laporan = [], []
    for r in csv.DictReader((DIR / 'fase_video_jutpi3.csv').open(encoding='utf-8')):
        urut = int(r['urut'])
        if r['status_video'] == 'beroperasi':
            continue
        padanan = [x.strip() for x in r['padanan_proyek_csv'].split(';') if x.strip()]
        if padanan and all(x in punya_garis for x in padanan):
            laporan.append(f'{urut:>2} lewati: sudah ada garis OSM ({", ".join(padanan)})')
            continue
        kode = r['padanan_modahub']
        props, garis = lin[kode]
        dari, ke = r['dari'] or None, r['ke'] or None
        if urut in UJUNG_TAMBAHAN:
            dari, ke = UJUNG_TAMBAHAN[urut]
        if dari and ke:
            s0, s1 = proyeksi(garis, cari_stasiun(dari, kode))[1], proyeksi(garis, cari_stasiun(ke, kode))[1]
            geom = potong(garis, s0, s1)
        else:
            geom = [[round(x, 6), round(y, 6)] for x, y in garis]

        # Tahun: proyek.csv bila ada targetnya, lalu video, lalu 2045.
        pr = proyek.get(padanan[0]) if padanan else None
        if pr and pr['tahun_target']:
            tahun, asal = int(pr['tahun_target']), 'proyek.csv (berita resmi)'
        elif r['tahun_video']:
            tahun, asal = int(r['tahun_video']), 'video JUTPI3'
        else:
            tahun, asal = TAHUN_RENCANA, 'rencana JUTPI3 tanpa tahun'
        nama = f"{r['lin']} {r['fase']}" + (f' ({dari} - {ke})' if dari and ke else '')
        catatan = []
        if pr and r['tahun_video'] and pr['tahun_target'] and pr['tahun_target'] != r['tahun_video']:
            catatan.append(f"video JUTPI3 menyebut {r['tahun_video']}")
        if 'belum final' in r['status_video']:
            catatan.append('tahun di video belum final')
        if tahun == TAHUN_RENCANA:
            catatan.append('rencana jangka panjang JUTPI3, belum ada tahun')
        keluar.append({
            'type': 'Feature',
            'properties': {
                'id': f'jutpi3-{urut:02d}',
                'nama': nama,
                'moda': r['moda'],
                'status_okt_2026': (pr or {}).get('status_okt_2026') or ('rencana' if tahun == TAHUN_RENCANA else r['status_video']),
                'sumber': (pr or {}).get('sumber') or VIDEO,
                'tanggal_sumber': (pr or {}).get('tanggal_sumber') or '2025-08-29',
                'catatan': '; '.join(catatan) or None,
                'tahun': tahun,
                'asal_tahun': asal,
                'geometri': SUMBER_JUTPI,
            },
            'geometry': {'type': 'LineString', 'coordinates': geom},
        })
        laporan.append(f'{urut:>2} {nama}: {tahun} ({asal}), {len(geom)} titik')

    for kode, (nama, moda) in LIN_TAMBAHAN.items():
        props, garis = lin[kode]
        keluar.append({
            'type': 'Feature',
            'properties': {
                'id': f'jutpi3-{kode.lower().replace(" ", "-")}', 'nama': nama, 'moda': moda, 'status_okt_2026': 'rencana',
                'sumber': 'https://modahub.petakpeta.com', 'tanggal_sumber': '2025-07-01',
                'catatan': 'rencana jangka panjang JUTPI3, belum ada tahun; tidak ada di video rujukan',
                'tahun': TAHUN_RENCANA, 'asal_tahun': 'rencana JUTPI3 tanpa tahun', 'geometri': SUMBER_JUTPI,
            },
            'geometry': {'type': 'LineString', 'coordinates': [[round(x, 6), round(y, 6)] for x, y in garis]},
        })
        laporan.append(f'   {nama}: {TAHUN_RENCANA}')

    (DIR / 'proyek_jutpi3.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': keluar}, ensure_ascii=False), encoding='utf-8')
    print('\n'.join(laporan))
    print(f'{len(keluar)} fitur -> proyek_jutpi3.geojson')


if __name__ == '__main__':
    main()
