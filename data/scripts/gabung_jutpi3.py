"""Gabungkan jaringan rencana JUTPI3 (ModaHub) dengan fase dan tahun dari video rujukan dan proyek.csv.

Masukan (data/mesin_waktu/):
  jutpi3_modahub.geojson   garis per lin + stasiun, diunduh dari ModaHub (dataset plan2045), CC BY-NC 4.0
  fase_video_jutpi3.csv    fase dan tahun yang dibaca dari video https://youtu.be/DNarc_hZMXY
  proyek.csv / .geojson    proyek kurasi tim (tahun dari berita resmi), menang bila tersedia
Keluaran:
  proyek_jutpi3.geojson    garis per fase, siap dibaca DataNyataSeeder (layer mesin_waktu)

Aturan tahun: proyek.csv (berita resmi, lebih baru) > video > 2045 untuk fase/lin tanpa tahun ("Rencana 2045").
Aturan garis: proyek rel di proyek.geojson memakai garis ModaHub per fase karena garis OSM-nya tidak pas
(LRT 1B hanya 1,8 dari 6 km; MRT 2A segmen 1 dan 2 memakai garis yang sama 17,6 km; MRT EW tahap I 48 km
padahal 25,6 km). Fitur pengganti membawa `menggantikan` = id proyek.csv, dan seeder melewati garis OSM-nya.
Proyek tol tetap memakai garis OSM. Fase yang sudah beroperasi dilewati.

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

# Fase video yang di proyek.csv dipecah per segmen: urut -> [(id proyek, dari, ke)].
PECAH = {6: [('mrt-2a-1', 'Bundaran HI', 'Harmoni'), ('mrt-2a-2', 'Harmoni', 'Kota')]}

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


STASIUN_ADA = DIR.parent / 'geojson' / 'demo' / 'fitur' / 'mobilitas.geojson'
JARAK_KE_GARIS_M = 120
JARAK_KE_STASIUN_ADA_M = 250


def stasiun_rencana(garis_fase, stasiun):
    """Stasiun ModaHub yang dilewati tiap fase; tahunnya = fase paling awal yang melewatinya.

    Stasiun yang sudah beroperasi (<= 250 m dari stasiun bermoda sama di layer Mobilitas) tidak ikut, jadi ujung
    fase yang menyambung ke jalur lama (mis. Bundaran HI, Velodrome) tidak digambar dua kali. Stasiun baru di
    titik transfer moda lain (mis. MRT Kota di dekat KRL Jakarta Kota) tetap ikut.
    """
    ada = [(f['geometry']['coordinates'], (f['properties'].get('atribut') or {}).get('moda'))
           for f in json.loads(STASIUN_ADA.read_text(encoding='utf-8'))['features']
           if f['properties'].get('jenis') == 'stasiun' and f['geometry']['type'] == 'Point']
    hasil = {}
    for g in garis_fase:
        p = g['properties']
        kode, garis = p.get('lin_modahub'), g['geometry']['coordinates']
        if not kode or len(garis) < 2:
            continue
        for s in stasiun:
            if kode not in s['properties']['lin']:
                continue
            xy = s['geometry']['coordinates']
            if proyeksi(garis, xy)[0] > JARAK_KE_GARIS_M or any(m == p['moda'] and jarak_m(xy, a) <= JARAK_KE_STASIUN_ADA_M for a, m in ada):
                continue
            kunci = s['properties']['stop_id']
            lama = hasil.get(kunci)
            if lama is None or p['tahun'] < lama['properties']['tahun']:
                hasil[kunci] = {
                    'type': 'Feature',
                    'properties': {
                        'id': kunci.split(':')[-1], 'nama': s['properties']['nama'], 'jenis': 'stasiun_rencana',
                        'moda': p['moda'], 'lin': p['nama'], 'tahun': p['tahun'], 'asal_tahun': p['asal_tahun'],
                        'status_okt_2026': p['status_okt_2026'], 'sumber': p['sumber'], 'tanggal_sumber': p['tanggal_sumber'],
                        'geometri': SUMBER_JUTPI,
                    },
                    'geometry': {'type': 'Point', 'coordinates': [round(xy[0], 6), round(xy[1], 6)]},
                }
    print(f'{len(hasil)} stasiun rencana')
    return list(hasil.values())


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

    def tambah(urut, r, kode, dari, ke, id_proyek, nama):
        props, garis = lin[kode]
        if dari and ke:
            s0, s1 = proyeksi(garis, cari_stasiun(dari, kode))[1], proyeksi(garis, cari_stasiun(ke, kode))[1]
            geom = potong(garis, s0, s1)
        else:
            geom = [[round(x, 6), round(y, 6)] for x, y in garis]
        # Tahun: proyek.csv bila ada targetnya, lalu video, lalu 2045.
        pr = proyek.get(id_proyek) if id_proyek else None
        if pr and pr['tahun_target']:
            tahun, asal = int(pr['tahun_target']), 'proyek.csv (berita resmi)'
        elif r['tahun_video']:
            tahun, asal = int(r['tahun_video']), 'video JUTPI3'
        else:
            tahun, asal = TAHUN_RENCANA, 'rencana JUTPI3 tanpa tahun'
        catatan = []
        if pr and pr.get('catatan') and pr['tahun_target']:
            catatan.append(pr['catatan'])
        if pr and not pr['tahun_target'] and r['tahun_video']:
            catatan.append('belum ada target resmi; tahun dari video JUTPI3' + (' (belum final)' if 'belum final' in r['status_video'] else ''))
        if pr and r['tahun_video'] and pr['tahun_target'] and pr['tahun_target'] != r['tahun_video']:
            catatan.append(f"video JUTPI3 menyebut {r['tahun_video']}")
        if not pr and 'belum final' in r['status_video']:
            catatan.append('tahun di video belum final')
        if tahun == TAHUN_RENCANA:
            catatan.append('rencana jangka panjang JUTPI3, belum ada tahun')
        keluar.append({
            'type': 'Feature',
            'properties': {
                'id': id_proyek or f'jutpi3-{urut:02d}',
                'menggantikan': id_proyek if id_proyek in punya_garis else None,
                'nama': (pr or {}).get('nama') or nama,
                'moda': r['moda'],
                'status_okt_2026': (pr or {}).get('status_okt_2026') or ('rencana' if tahun == TAHUN_RENCANA else r['status_video']),
                'sumber': (pr or {}).get('sumber') or VIDEO,
                'tanggal_sumber': (pr or {}).get('tanggal_sumber') or '2025-08-29',
                'catatan': '; '.join(catatan) or None,
                'tahun': tahun,
                'asal_tahun': asal,
                'geometri': SUMBER_JUTPI,
                'lin_modahub': kode,
            },
            'geometry': {'type': 'LineString', 'coordinates': geom},
        })
        laporan.append(f"{urut:>2} {keluar[-1]['properties']['nama']}: {tahun} ({asal}), {round(sum(jarak_m(geom[i-1], geom[i]) for i in range(1, len(geom))) / 1000, 1)} km")

    for r in csv.DictReader((DIR / 'fase_video_jutpi3.csv').open(encoding='utf-8')):
        urut = int(r['urut'])
        if r['status_video'] == 'beroperasi':
            continue
        kode = r['padanan_modahub']
        padanan = [x.strip() for x in r['padanan_proyek_csv'].split(';') if x.strip()]
        if urut in PECAH:
            for id_proyek, dari, ke in PECAH[urut]:
                tambah(urut, r, kode, dari, ke, id_proyek, '')
            continue
        dari, ke = r['dari'] or None, r['ke'] or None
        if urut in UJUNG_TAMBAHAN:
            dari, ke = UJUNG_TAMBAHAN[urut]
        id_proyek = padanan[0] if padanan else None
        nama = f"{r['lin']} {r['fase']}" + (f' ({dari} - {ke})' if dari and ke else '')
        # mrt-ew-2 mencakup tiga fase video; hanya fase pertama yang menggantikan, sisanya ikut tahunnya saja.
        if id_proyek and any(f['properties']['id'] == id_proyek for f in keluar):
            tambah(urut, r, kode, dari, ke, None, nama)
            keluar[-1]['properties'].update({k: v for k, v in proyek[id_proyek].items() if k in ('status_okt_2026', 'sumber', 'tanggal_sumber')})
            if proyek[id_proyek]['tahun_target']:
                keluar[-1]['properties'].update(tahun=int(proyek[id_proyek]['tahun_target']), asal_tahun='proyek.csv (berita resmi)')
                keluar[-1]['properties']['catatan'] = f"bagian dari {proyek[id_proyek]['nama']}; video JUTPI3 menyebut {r['tahun_video']}"
            keluar[-1]['properties']['nama'] = nama
            continue
        tambah(urut, r, kode, dari, ke, id_proyek, nama)
        # Proyek yang mencakup beberapa fase video (mrt-ew-2) diberi nama fase agar jelas bagian mana.
        if id_proyek and sum(id_proyek in x['padanan_proyek_csv'] for x in csv.DictReader((DIR / 'fase_video_jutpi3.csv').open(encoding='utf-8'))) > 1:
            keluar[-1]['properties']['catatan'] = '; '.join(filter(None, [f"bagian dari {proyek[id_proyek]['nama']}", keluar[-1]['properties']['catatan']]))
            keluar[-1]['properties']['nama'] = nama

    for kode, (nama, moda) in LIN_TAMBAHAN.items():
        props, garis = lin[kode]
        keluar.append({
            'type': 'Feature',
            'properties': {
                'id': f'jutpi3-{kode.lower().replace(" ", "-")}', 'nama': nama, 'moda': moda, 'status_okt_2026': 'rencana',
                'sumber': 'https://modahub.petakpeta.com', 'tanggal_sumber': '2025-07-01',
                'catatan': 'rencana jangka panjang JUTPI3, belum ada tahun; tidak ada di video rujukan',
                'tahun': TAHUN_RENCANA, 'asal_tahun': 'rencana JUTPI3 tanpa tahun', 'geometri': SUMBER_JUTPI,
                'lin_modahub': kode,
            },
            'geometry': {'type': 'LineString', 'coordinates': [[round(x, 6), round(y, 6)] for x, y in garis]},
        })
        laporan.append(f'   {nama}: {TAHUN_RENCANA}')

    keluar += stasiun_rencana(keluar, stasiun)
    (DIR / 'proyek_jutpi3.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': keluar}, ensure_ascii=False), encoding='utf-8')
    print('\n'.join(laporan))
    print(f'{len(keluar)} fitur -> proyek_jutpi3.geojson')


if __name__ == '__main__':
    main()
