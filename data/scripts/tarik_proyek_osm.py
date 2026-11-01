"""
Geometri proyek Mesin Waktu dari OSM -> data/mesin_waktu/proyek.geojson  (kebutuhan A-06)

Daftar proyek, status, dan tahun target dikurasi manual di data/mesin_waktu/proyek.csv dengan tautan sumber
(MRT Jakarta, Kementerian PU, berita). Skrip ini hanya mencari garisnya di OSM: way dengan
railway=construction|proposed atau highway=construction|proposed (beserta tag construction=*/proposed=*),
lalu mencocokkan namanya dengan kolom `kata_kunci_osm` (dipisah "|"; cocok bila SEMUA kata ada di nama).
Kolom kosong berarti belum ada garis di OSM untuk proyek itu.
Proyek tanpa garis yang cocok tetap ditulis tanpa geometri dan ditandai `geometri: belum ada`.

Semua garis kandidat juga disimpan (kandidat_osm.geojson) supaya tim bisa memeriksa dan memperbaiki pasangan.

Sumber geometri: OpenStreetMap, ekstrak provinsi yang sama dengan tarik_osm_tambahan.py (ODbL).
Butuh: Python 3 + osmium. Jalankan dari akar repo:  python data/scripts/tarik_proyek_osm.py
"""
import csv
import json
import os

import osmium

CACHE = 'storage/app/tarik/osm_pbf'
PROVINSI = ['jakarta', 'west_java', 'banten']
BBOX = (106.35, -6.85, 107.25, -5.95)
DAFTAR = 'data/mesin_waktu/proyek.csv'
KELUAR = 'data/mesin_waktu'


class Pembaca(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.f = osmium.geom.GeoJSONFactory()
        self.garis = {}

    def way(self, w):
        t = w.tags
        rail, jalan = t.get('railway'), t.get('highway')
        if rail not in ('construction', 'proposed') and jalan not in ('construction', 'proposed'):
            return
        sub = t.get('construction') or t.get('proposed') or ''
        if jalan and sub not in ('motorway', 'motorway_link', 'trunk', 'primary', ''):
            return  # jalan kecil yang sedang dibangun tidak relevan untuk Mesin Waktu
        try:
            g = json.loads(self.f.create_linestring(w))
        except Exception:
            return
        lon, lat = g['coordinates'][0]
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            return
        g['coordinates'] = [[round(x, 6), round(y, 6)] for x, y in g['coordinates']]
        nama = ' '.join(filter(None, [t.get('name'), t.get('official_name'), t.get('operator'), t.get('ref')]))
        self.garis[w.id] = {'type': 'Feature', 'geometry': g, 'properties': {
            'osm': f'way/{w.id}', 'nama': nama, 'jenis': 'rel' if rail else 'jalan',
            'status_osm': rail or jalan, 'sub': sub}}


def main():
    h = Pembaca()
    for prov in PROVINSI:
        h.apply_file(f'{CACHE}/{prov}.osm.pbf', locations=True, idx='flex_mem')
    kandidat = list(h.garis.values())
    with open(f'{KELUAR}/kandidat_osm.geojson', 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'features': kandidat}, f, ensure_ascii=False, separators=(',', ':'))

    with open(DAFTAR, encoding='utf-8') as f:
        proyek = list(csv.DictReader(f))
    keluar, ringkas = [], []
    for p in proyek:
        kunci = [k.strip().lower() for k in (p['kata_kunci_osm'] or '').split('|') if k.strip()]
        moda = p['moda']
        cocok = []
        for k in kandidat:
            nama = k['properties']['nama'].lower()
            jenis_cocok = (k['properties']['jenis'] == 'jalan') == (moda == 'tol')
            if jenis_cocok and kunci and all(kk in nama for kk in kunci):
                cocok.append(k['geometry']['coordinates'])
        prop = {kol: p[kol] for kol in ('id', 'nama', 'moda', 'status_okt_2026', 'sumber', 'tanggal_sumber', 'catatan')}
        prop['tahun'] = int(p['tahun_target']) if p['tahun_target'] else None
        prop['geometri'] = f'OSM ({len(cocok)} ruas)' if cocok else 'belum ada'
        keluar.append({'type': 'Feature', 'properties': prop,
                       'geometry': {'type': 'MultiLineString', 'coordinates': cocok} if cocok else None})
        ringkas.append(f"{p['id']}: {len(cocok)} ruas")
    with open(f'{KELUAR}/proyek.geojson', 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'features': keluar}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(kandidat)} garis kandidat; ' + '; '.join(ringkas))


if __name__ == '__main__':
    main()
