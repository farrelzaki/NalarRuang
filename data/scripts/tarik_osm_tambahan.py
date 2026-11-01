"""
Tarik data OSM tambahan dari hasil uji pengguna -> data/geojson/osm_tambahan/

Satu tarikan, satu tanggal snapshot, untuk empat kebutuhan (dokumen Kebutuhan Data Scraping, Daftar B):
  B-01 non_hunian.geojson.gz   area yang bukan tempat tinggal: bandara/landasan, perairan, makam, militer,
                               serta garis jalan tol (untuk di-buffer). Menutup temuan I-09.
  B-02 ruang_hijau.geojson.gz  taman/hutan kota/kebun dengan tag asli dan luas m2, supaya plaza stasiun dan
                               rumput bandara bisa dibuang saat menghitung skor Zen. Menutup temuan I-07.
  B-03 gazetteer.csv           nama tempat untuk kotak cari: landmark (RS, kampus, mal, wisata, stasiun,
                               kantor pemerintah, nama kawasan) dan nama jalan. Menutup temuan N-03, N-04.
  B-10 hiburan.geojson.gz      bioskop, teater, pusat seni, gelanggang olahraga, pusat kebugaran.

Sumber: OpenStreetMap, ekstrak provinsi DKI Jakarta, Jawa Barat, dan Banten dari download.openstreetmap.fr
(diperbarui harian), lisensi ODbL (wajib atribusi "(c) OpenStreetMap contributors"). Server Overpass tidak
dipakai karena terlalu sering timeout untuk area seluas Jabodetabek.
Area: kotak Jabodetabek; pemotongan ke batas kelurahan dilakukan saat dimuat ke PostGIS.
Luas dihitung dengan proyeksi ekuirektangular lokal (galat < 1% di lintang Jakarta).

Butuh: Python 3 + osmium (pip install osmium). Jalankan dari akar repo:  python data/scripts/tarik_osm_tambahan.py
Ekstrak (+-500 MB) disimpan di storage/app/tarik/osm_pbf/; hapus berkasnya untuk mengambil snapshot baru.
"""
import csv
import datetime
import gzip
import json
import math
import os
import urllib.request

import osmium

UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
EKSTRAK = 'https://download.openstreetmap.fr/extracts/asia/indonesia/{}.osm.pbf'
PROVINSI = ['jakarta', 'west_java', 'banten']
CACHE = 'storage/app/tarik/osm_pbf'
KELUAR = 'data/geojson/osm_tambahan'
BBOX = (106.35, -6.85, 107.25, -5.95)   # barat, selatan, timur, utara (Jabodetabek + tepi)

LANDMARK = {
    'amenity': {'hospital', 'university', 'college', 'school', 'townhall', 'place_of_worship', 'marketplace'},
    'shop': {'mall', 'department_store'},
    'tourism': {'attraction', 'museum', 'zoo', 'theme_park', 'hotel'},
    'leisure': {'stadium', 'park', 'golf_course'},
    'office': {'government'}, 'historic': {'monument', 'memorial'},
    'railway': {'station', 'halt'}, 'aeroway': {'aerodrome'},
    'place': {'neighbourhood', 'suburb', 'quarter', 'village', 'hamlet'},
}
JALAN = {'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street'}
HIBURAN = {'amenity': {'cinema', 'theatre', 'arts_centre', 'community_centre'},
           'leisure': {'sports_centre', 'fitness_centre', 'bowling_alley', 'water_park', 'ice_rink', 'swimming_pool'}}
HIJAU = {'leisure': {'park', 'garden', 'nature_reserve', 'playground', 'recreation_ground'},
         'landuse': {'forest', 'recreation_ground', 'village_green', 'grass', 'meadow'},
         'natural': {'wood', 'scrub', 'grassland'}}


def cocok(t, aturan):
    return any(t.get(k) in v for k, v in aturan.items())


def bukan_hunian(t):
    return (t.get('aeroway') in ('aerodrome', 'runway', 'apron', 'taxiway') or t.get('natural') == 'water' or 'water' in t
            or t.get('landuse') in ('reservoir', 'basin', 'cemetery', 'military') or t.get('amenity') == 'grave_yard')


def unduh():
    os.makedirs(CACHE, exist_ok=True)
    for prov in PROVINSI:
        berkas = f'{CACHE}/{prov}.osm.pbf'
        if not os.path.exists(berkas):
            print('mengunduh', prov, flush=True)
            req = urllib.request.Request(EKSTRAK.format(prov), headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=1800) as r, open(berkas + '.part', 'wb') as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
            os.replace(berkas + '.part', berkas)
        yield berkas


def bulat(c):
    return round(c, 6) if isinstance(c, (int, float)) else [bulat(x) for x in c]


def dalam_kotak(g):
    c = g['coordinates']
    while isinstance(c[0], list):
        c = c[0]
    return BBOX[0] <= c[0] <= BBOX[2] and BBOX[1] <= c[1] <= BBOX[3]


class Pembaca(osmium.SimpleHandler):
    """Kumpulkan elemen yang relevan; poligon dirakit pyosmium dari way tertutup dan relasi multipolygon."""

    def __init__(self):
        super().__init__()
        self.f = osmium.geom.GeoJSONFactory()
        self.elemen = {}

    def simpan(self, kunci, tags, buat):
        if kunci in self.elemen:
            return
        try:
            g = json.loads(buat())
        except Exception:  # geometri rusak di OSM
            return
        g['coordinates'] = bulat(g['coordinates'])
        if dalam_kotak(g):
            self.elemen[kunci] = {'osm': kunci, 'tags': tags, 'geom': g}

    def node(self, n):
        if not n.tags:
            return
        t = dict(n.tags)
        if ('name' in t and cocok(t, LANDMARK)) or cocok(t, HIBURAN):
            self.simpan(f'node/{n.id}', t, lambda: self.f.create_point(n))

    def way(self, w):
        if 'highway' not in w.tags and 'aeroway' not in w.tags:
            return
        t = dict(w.tags)
        if (t.get('highway', '').startswith('motorway') or t.get('aeroway') in ('runway', 'taxiway')
                or ('name' in t and t.get('highway') in JALAN)):
            self.simpan(f'garis/way/{w.id}', t, lambda: self.f.create_linestring(w))

    def area(self, a):
        if not a.tags:
            return
        t = dict(a.tags)
        if bukan_hunian(t) or cocok(t, HIJAU) or ('name' in t and cocok(t, LANDMARK)) or cocok(t, HIBURAN):
            asal = 'way' if a.from_way() else 'relation'
            self.simpan(f'{asal}/{a.orig_id()}', t, lambda: self.f.create_multipolygon(a))


def baca_semua():
    h = Pembaca()
    for berkas in unduh():
        print('membaca', berkas, flush=True)
        h.apply_file(berkas, locations=True, idx='flex_mem')
    return list(h.elemen.values())


def luas_cincin(c):
    lat0 = math.radians(sum(p[1] for p in c) / len(c))
    k = 111320.0
    xy = [(p[0] * k * math.cos(lat0), p[1] * 110574.0) for p in c]
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(xy, xy[1:]))) / 2


def luas(g):
    if not g:
        return 0
    if g['type'] == 'Polygon':
        polis = [g['coordinates']]
    elif g['type'] == 'MultiPolygon':
        polis = g['coordinates']
    else:
        return 0
    return round(sum(luas_cincin(p[0]) - sum(luas_cincin(h) for h in p[1:]) for p in polis))


def pusat(g):
    if g['type'] == 'Point':
        return g['coordinates']
    c = g['coordinates']
    while isinstance(c[0][0], list):
        c = c[0]
    return [round(sum(p[0] for p in c) / len(c), 6), round(sum(p[1] for p in c) / len(c), 6)]


# ---------------------------------------------------------------- jenis
def jenis_non_hunian(t):
    if 'aeroway' in t:
        return 'bandara'
    if t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard':
        return 'makam'
    if t.get('landuse') == 'military':
        return 'militer'
    if t.get('highway', '').startswith('motorway'):
        return 'jalan_tol'
    return 'perairan'


def jenis_hijau(t):
    for k in ('leisure', 'landuse', 'natural'):
        if k in t:
            return f'{k}={t[k]}'
    return 'lain'


def jenis_landmark(t):
    for k in ('railway', 'aeroway', 'amenity', 'shop', 'tourism', 'leisure', 'office', 'historic', 'place'):
        if k in t:
            return f'{k}={t[k]}'
    return 'lain'


def tulis_gz(nama, fitur):
    with gzip.open(f'{KELUAR}/{nama}.geojson.gz', 'wt', encoding='utf-8') as g:
        json.dump({'type': 'FeatureCollection', 'features': fitur}, g, ensure_ascii=False, separators=(',', ':'))


def main():
    os.makedirs(KELUAR, exist_ok=True)
    elemen = baca_semua()
    ringkas = {'sumber': 'OpenStreetMap, ekstrak provinsi download.openstreetmap.fr (ODbL)', 'provinsi': PROVINSI,
               'bbox': BBOX, 'ditarik': datetime.date.today().isoformat(), 'jumlah_elemen_dibaca': len(elemen)}
    poligon = [e for e in elemen if e['geom']['type'] == 'MultiPolygon']
    garis = [e for e in elemen if e['geom']['type'] == 'LineString']
    titik = [e for e in elemen if e['geom']['type'] == 'Point']

    def osm(e):
        return e['osm'].replace('garis/', '')

    # B-01: poligon bukan hunian + garis tol dan landasan
    fitur = []
    for e in poligon + garis:
        t = e['tags']
        if e['geom']['type'] == 'LineString':
            if not (t.get('highway', '').startswith('motorway') or t.get('aeroway') in ('runway', 'taxiway')):
                continue
        elif not bukan_hunian(t):
            continue
        fitur.append({'type': 'Feature', 'geometry': e['geom'], 'properties': {
            'osm': osm(e), 'jenis': jenis_non_hunian(t), 'nama': t.get('name'), 'luas_m2': luas(e['geom'])}})
    tulis_gz('non_hunian', fitur)
    ringkas['non_hunian'] = {j: sum(1 for f in fitur if f['properties']['jenis'] == j) for j in sorted({f['properties']['jenis'] for f in fitur})}

    # B-02
    fitur = [{'type': 'Feature', 'geometry': e['geom'], 'properties': {
        'osm': osm(e), 'tag': jenis_hijau(e['tags']), 'nama': e['tags'].get('name'), 'luas_m2': luas(e['geom']),
        'akses': e['tags'].get('access')}} for e in poligon if cocok(e['tags'], HIJAU)]
    tulis_gz('ruang_hijau', fitur)
    ringkas['ruang_hijau'] = {'jumlah': len(fitur), 'bernama': sum(1 for f in fitur if f['properties']['nama']),
                              'luas_min_1000m2': sum(1 for f in fitur if f['properties']['luas_m2'] >= 1000)}

    # B-03
    baris, lihat = [], set()
    for e in titik + poligon:
        t = e['tags']
        if 'name' not in t or not cocok(t, LANDMARK):
            continue
        lon, lat = pusat(e['geom'])
        baris.append({'nama': t['name'], 'alias': t.get('alt_name') or t.get('short_name') or '',
                      'jenis': jenis_landmark(t), 'lon': lon, 'lat': lat, 'osm': osm(e)})
    for e in garis:
        t = e['tags']
        if 'name' not in t or t.get('highway') not in JALAN:
            continue
        lon, lat = pusat(e['geom'])
        kunci = (t['name'].lower(), round(lon, 2), round(lat, 2))   # satu baris per nama per sel +-1 km
        if kunci in lihat:
            continue
        lihat.add(kunci)
        baris.append({'nama': t['name'], 'alias': t.get('alt_name') or t.get('old_name') or '',
                      'jenis': 'highway=' + t['highway'], 'lon': lon, 'lat': lat, 'osm': osm(e)})
    baris.sort(key=lambda b: (b['jenis'].startswith('highway='), b['nama'].lower()))
    with open(f'{KELUAR}/gazetteer.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['nama', 'alias', 'jenis', 'lon', 'lat', 'osm'], lineterminator='\n')
        w.writeheader()
        w.writerows(baris)
    ringkas['gazetteer'] = {'landmark': sum(1 for b in baris if not b['jenis'].startswith('highway=')),
                            'jalan': sum(1 for b in baris if b['jenis'].startswith('highway='))}

    # B-10
    fitur = [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': pusat(e['geom'])}, 'properties': {
        'osm': osm(e), 'jenis': e['tags'].get('amenity') if e['tags'].get('amenity') in HIBURAN['amenity'] else e['tags'].get('leisure'),
        'nama': e['tags'].get('name')}} for e in titik + poligon if cocok(e['tags'], HIBURAN) and e['tags'].get('access') != 'private']
    tulis_gz('hiburan', fitur)
    ringkas['hiburan'] = {'jumlah': len(fitur), 'bernama': sum(1 for f in fitur if f['properties']['nama'])}

    with open(f'{KELUAR}/ringkasan.json', 'w', encoding='utf-8') as f:
        json.dump(ringkas, f, ensure_ascii=False, indent=1)
    print(json.dumps(ringkas, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
