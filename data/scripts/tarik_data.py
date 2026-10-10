"""
Tarik data terbuka untuk seluruh Jabodetabek -> data/geojson/demo/ (dimuat oleh DemoPetaSeeder).

Sumber yang ditarik otomatis (keputusan kelompok, docs/RENCANA.md bagian 2a):
  - Batas desa/kelurahan: Badan Informasi Geospasial (geoservices.big.go.id, layanan ArcGIS REST BATAS_DESAKEL_AR)
  - POI, ruang hijau, fasilitas disabilitas, trotoar, rel, gerbang tol: OpenStreetMap (Overpass API)
  - Stasiun KRL/MRT/LRT dan halte TransJakarta untuk routing: Commute Data API (api.commute.shiorilabs.id, ODbL-1.0)
  - Semua halte TransJakarta dan halte ramah kursi roda: GTFS resmi TransJakarta (gtfs.transjakarta.co.id)
  - Halte Biskita Trans Pakuan: opentransum (JSON terbuka)
Layer yang menurut keputusan kelompok diolah manual (Mesin Waktu, Legalitas) tidak disentuh.
Kualitas udara per kelurahan masih NILAI CONTOH sampai IQAir API (butuh kunci) dipasang.

Butuh: Python 3 (pustaka standar), psql PostgreSQL 17 + PostGIS di database `nalarruang`.
Jalankan dari akar repo:  python data/scripts/tarik_data.py
Hasil unduhan disimpan di storage/app/tarik/ sehingga jalan ulang tidak mengunduh lagi.
"""
import csv
import io
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import zipfile

PSQL = os.environ.get('PSQL', r'C:\Program Files\PostgreSQL\17\bin\psql.exe')
DB = ['-h', '127.0.0.1', '-U', 'postgres', '-d', os.environ.get('DB_DATABASE', 'nalarruang')]
CACHE = 'storage/app/tarik'
KELUAR = 'data/geojson/demo'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
COMMUTE = 'https://api.commute.shiorilabs.id'
BISKITA = 'https://cdn.opentransum.randspace0.com/transport-data/transpakuan.json'
GTFS_TJ = 'https://gtfs.transjakarta.co.id/files/file_gtfs.zip'
BIG_DESA = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_DESAKEL_AR/MapServer/0/query'

# Nama kabupaten/kota di data BIG (WADMKK) -> nama kota yang dipakai aplikasi.
KOTA_BIG = {
    'Kota Administrasi Jakarta Pusat': 'Jakarta Pusat', 'Kota Administrasi Jakarta Utara': 'Jakarta Utara',
    'Kota Administrasi Jakarta Barat': 'Jakarta Barat', 'Kota Administrasi Jakarta Selatan': 'Jakarta Selatan',
    'Kota Administrasi Jakarta Timur': 'Jakarta Timur', 'Kota Bogor': 'Kota Bogor', 'Bogor': 'Kabupaten Bogor',
    'Kota Depok': 'Kota Depok', 'Kota Tangerang': 'Kota Tangerang', 'Tangerang': 'Kabupaten Tangerang',
    'Kota Tangerang Selatan': 'Kota Tangerang Selatan', 'Kota Bekasi': 'Kota Bekasi', 'Bekasi': 'Kabupaten Bekasi',
}

# Relasi OSM admin_level 5 di Jabodetabek -> nama kota yang dipakai aplikasi (QueryParser mengenali kata kuncinya).
WILAYAH = {
    7625977: 'Jakarta Pusat', 7626002: 'Jakarta Utara', 7626001: 'Jakarta Barat', 5802438: 'Jakarta Selatan', 5802441: 'Jakarta Timur',
    14745927: 'Kota Bogor', 14762112: 'Kabupaten Bogor', 14525364: 'Kota Depok',
    7641583: 'Kota Tangerang', 7641584: 'Kabupaten Tangerang', 7641582: 'Kota Tangerang Selatan',
    14509733: 'Kota Bekasi', 14765575: 'Kabupaten Bekasi',
}


# ---------------------------------------------------------------- unduh
def unduh(url, nama, data=None, timeout=300):
    os.makedirs(CACHE, exist_ok=True)
    berkas = f'{CACHE}/{nama}'
    if os.path.exists(berkas) and os.path.getsize(berkas) > 0:
        return open(berkas, 'rb').read()
    for coba in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                isi = r.read()
            open(berkas, 'wb').write(isi)
            return isi
        except Exception as e:
            print(f'  ulang {nama} ({coba + 1}): {e}', flush=True)
            time.sleep(15 * (coba + 1))
    raise RuntimeError(f'Gagal mengunduh {nama}')


def overpass(q, nama):
    kueri = f'[out:json][timeout:180];{q}'
    terakhir = None
    for ep in OVERPASS:
        try:
            isi = unduh(ep, nama, urllib.parse.urlencode({'data': kueri}).encode(), timeout=240)
            d = json.loads(isi)
            if 'remark' in d and 'error' in d['remark'].lower():
                raise RuntimeError(d['remark'])
            return d['elements']
        except Exception as e:
            terakhir = e
            if os.path.exists(f'{CACHE}/{nama}'):
                os.remove(f'{CACHE}/{nama}')
            print(f'  {ep} gagal: {e}', flush=True)
    raise RuntimeError(f'Overpass gagal untuk {nama}: {terakhir}')


# Relasi yang "area"-nya belum dibuat di server Overpass (kueri area kosong/tidak lengkap): pakai kotak batas,
# lalu fitur di luar Jabodetabek dibuang di PostGIS.
TANPA_AREA = {14509733, 14765575, 7641584}


def kotak(rid):
    b = next(e for e in overpass(f'rel({rid});out geom;', f'batas_{rid}.json') if e['type'] == 'relation')['bounds']
    return f"{b['minlat']},{b['minlon']},{b['maxlat']},{b['maxlon']}"


def filter_wilayah(rid, q, var='j'):
    """Awalan kueri dan q yang dibatasi ke kabupaten/kota rid (area atau kotak batas)."""
    if rid in TANPA_AREA:
        return q.replace(f'(area.{var})', f'({kotak(rid)})'), '_bbox'
    return f'rel({rid});map_to_area->.{var};' + q, ''


def per_wilayah(q, nama):
    """Jalankan kueri per kabupaten/kota agar tiap permintaan Overpass kecil; hasil digabung tanpa duplikat."""
    hasil, lihat = [], set()
    for rid in WILAYAH:
        kueri, akhiran = filter_wilayah(rid, q)
        for e in overpass(kueri, f'{nama}_{rid}{akhiran}.json'):
            k = (e['type'], e['id'])
            if k not in lihat:
                lihat.add(k)
                hasil.append(e)
    return hasil


def api(path):
    nama = 'commute_' + path.strip('/').replace('/', '_') + '.json'
    return json.loads(unduh(COMMUTE + path, nama))['data']


# ---------------------------------------------------------------- geometri dari Overpass
def garis_way(e):
    return [[round(p['lon'], 6), round(p['lat'], 6)] for p in e.get('geometry', [])]


def titik(e):
    if e['type'] == 'node':
        return [round(e['lon'], 6), round(e['lat'], 6)]
    c = e.get('center')
    return [round(c['lon'], 6), round(c['lat'], 6)] if c else None


def fitur(geom, **prop):
    return {'type': 'Feature', 'properties': prop, 'geometry': geom}


# ---------------------------------------------------------------- PostGIS
def psql(sql):
    r = subprocess.run([PSQL, *DB, '-v', 'ON_ERROR_STOP=1', '-At', '-q'], input=sql, capture_output=True, text=True, encoding='utf8')
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return r.stdout


def muat_tabel(tabel, baris):
    """Muat daftar dict ke tabel staging tarik.<tabel>(data jsonb) lewat \\copy."""
    berkas = os.path.abspath(f'{CACHE}/{tabel}.ndjson').replace(os.sep, '/')
    with open(berkas, 'w', encoding='utf8') as f:
        for b in baris:
            f.write(json.dumps(b, ensure_ascii=False) + '\n')
    psql(f"DROP TABLE IF EXISTS tarik.{tabel}; CREATE TABLE tarik.{tabel} (data jsonb);\n"
         f"\\copy tarik.{tabel}(data) FROM '{berkas}' WITH (FORMAT csv, QUOTE E'\\x01', DELIMITER E'\\x02')\n")


def ekspor(sql, keluar):
    """sql harus mengembalikan satu kolom: Feature GeoJSON (json) per baris."""
    baris = [json.loads(l) for l in psql(sql).splitlines() if l.strip()]
    with open(keluar, 'w', encoding='utf8') as f:
        json.dump({'type': 'FeatureCollection', 'features': baris}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  {keluar}: {len(baris)} fitur, {os.path.getsize(keluar) // 1024} KB')


# ---------------------------------------------------------------- langkah
def tarik_batas():
    """Batas desa/kelurahan resmi BIG (kode Kemendagri), dikueri per kabupaten/kota lewat ArcGIS REST."""
    print('Batas desa/kelurahan (BIG)...')
    baris = []
    for kk, kota in KOTA_BIG.items():
        mulai = 0
        while True:
            q = urllib.parse.urlencode({
                'where': f"WADMKK = '{kk}' AND WADMPR IN ('Daerah Khusus Ibukota Jakarta', 'Jawa Barat', 'Banten')",
                'outFields': 'WADMKD,WADMKC,KDEPUM,TIPADM', 'outSR': 4326, 'maxAllowableOffset': 0.00003,
                'resultOffset': mulai, 'resultRecordCount': 500, 'orderByFields': 'OBJECTID', 'f': 'geojson',
            })
            d = json.loads(unduh(f'{BIG_DESA}?{q}', f'big_{kk.replace(" ", "_")}_{mulai}.json'))
            fitur_ = d.get('features', [])
            for f in fitur_:
                a_ = f['properties']
                if f.get('geometry'):
                    baris.append({'kode': a_.get('KDEPUM'), 'nama': a_.get('WADMKD'), 'kecamatan': a_.get('WADMKC'), 'kota': kota, 'g': f['geometry']})
            if len(fitur_) < 500:
                break
            mulai += 500
        print(f'  {kota}: {sum(1 for x in baris if x["kota"] == kota)} desa/kelurahan', flush=True)
    muat_tabel('batas_mentah', baris)
    psql("""
    DROP TABLE IF EXISTS tarik.kel;
    CREATE TABLE tarik.kel AS
      SELECT data->>'kode' AS kode, 'kelurahan' AS tingkat, data->>'nama' AS nama, data->>'kecamatan' AS kecamatan, data->>'kota' AS kota,
             ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(data->'g'), 4326))), 3)) AS geom
      FROM tarik.batas_mentah;
    DELETE FROM tarik.kel WHERE geom IS NULL OR ST_IsEmpty(geom);
    CREATE INDEX ON tarik.kel USING gist (geom);
    DROP TABLE IF EXISTS tarik.jabodetabek;
    CREATE TABLE tarik.jabodetabek AS SELECT ST_Union(ST_Buffer(geom, 0.0005)) AS geom FROM tarik.kel;
    """)
    print('  wilayah:', psql('SELECT count(*) FROM tarik.kel').strip())


def gtfs_tj():
    """(halte, akses) dari GTFS resmi TransJakarta: halte BRT induk + halte tanpa induk; akses = wheelchair_boarding 1."""
    z = zipfile.ZipFile(io.BytesIO(unduh(GTFS_TJ, 'gtfs_tj.zip')))
    stops = list(csv.DictReader(io.TextIOWrapper(z.open('stops.txt'), 'utf-8-sig')))
    halte, akses = [], []
    for s_ in stops:
        try:
            lon, lat = round(float(s_['stop_lon']), 6), round(float(s_['stop_lat']), 6)
        except ValueError:
            continue
        geom = {'type': 'Point', 'coordinates': [lon, lat]}
        if s_.get('location_type') == '1' or (s_.get('location_type') in ('0', '') and not s_.get('parent_station')):
            halte.append(fitur(geom, layer_id='mobilitas', jenis='halte', nama=s_['stop_name'], sumber='GTFS TransJakarta',
                               atribut={'moda': 'transjakarta', 'gtfs': s_['stop_id']}))
        if s_.get('wheelchair_boarding') == '1' and s_.get('location_type') != '1':
            akses.append(fitur(geom, layer_id='inklusivitas', jenis='akses', nama=f"Halte {s_['stop_name']}", sumber='GTFS TransJakarta',
                               atribut={'kategori': 'Halte ramah kursi roda'}))
    print(f'  GTFS TransJakarta: {len(halte)} halte, {len(akses)} titik ramah kursi roda', flush=True)
    return halte, akses


def tarik_ekosistem():
    print('Ekosistem (OSM)...')
    poi = per_wilayah('(nwr(area.j)["amenity"~"^(cafe|restaurant|fast_food)$"];nwr(area.j)["shop"="mall"];);out center tags;', 'poi')
    rth = per_wilayah('(way(area.j)["leisure"~"^(park|garden|golf_course|recreation_ground)$"];way(area.j)["landuse"~"^(forest|cemetery|recreation_ground|village_green)$"];);out geom tags;', 'rth')
    kat = {'cafe': 'Kafe', 'restaurant': 'Restoran', 'fast_food': 'Makanan cepat saji'}
    hasil = []
    for e in poi:
        p = titik(e)
        if not p:
            continue
        t = e.get('tags', {})
        hasil.append(fitur({'type': 'Point', 'coordinates': p}, layer_id='ekosistem', jenis='poi', nama=t.get('name'), sumber='OSM',
                           atribut={'kategori': 'Mal' if t.get('shop') == 'mall' else kat.get(t.get('amenity'), 'Tempat makan')}))
    for e in rth:
        g = garis_way(e)
        if len(g) < 4 or g[0] != g[-1]:
            continue
        t = e.get('tags', {})
        hasil.append(fitur({'type': 'Polygon', 'coordinates': [g]}, layer_id='ekosistem', jenis='rth', nama=t.get('name'), sumber='OSM',
                           atribut={'kategori': t.get('leisure') or t.get('landuse')}))
    return hasil


def tarik_inklusivitas():
    print('Inklusivitas (OSM)...')
    akses = per_wilayah('nwr(area.j)["wheelchair"="yes"];out center tags;', 'akses')
    trotoar = per_wilayah('way(area.j)["footway"="sidewalk"];out geom tags;', 'trotoar')
    hasil = []
    for e in akses:
        p = titik(e)
        if p:
            hasil.append(fitur({'type': 'Point', 'coordinates': p}, layer_id='inklusivitas', jenis='akses', nama=e.get('tags', {}).get('name'), sumber='OSM', atribut={}))
    for e in trotoar:
        g = garis_way(e)
        if len(g) >= 2:
            hasil.append(fitur({'type': 'LineString', 'coordinates': g}, layer_id='inklusivitas', jenis='trotoar', nama=e.get('tags', {}).get('name'), sumber='OSM', atribut={}))
    return hasil + gtfs_tj()[1]


def lin_krl(nama):
    n = nama.lower()
    for kunci, lin in [('rangkas', 'rangkas'), ('bogor', 'bogor'), ('nambo', 'bogor'), ('cikarang', 'cikarang'), ('bekasi', 'cikarang'),
                       ('tangerang', 'tangerang'), ('priok', 'priok'), ('soekarno', 'bandara'), ('bandara', 'bandara')]:
        if kunci in n:
            return lin
    return 'lain'


def tarik_mobilitas():
    print('Mobilitas (OSM + Commute Data API + Biskita)...')
    rute = per_wilayah('rel(area.j)["route"~"^(train|subway|light_rail|monorail)$"];out body;', 'rel_rute')
    rel_ways = per_wilayah('way(area.j)["railway"~"^(rail|subway|light_rail|monorail)$"];out geom tags;', 'rel_ways')
    tol = per_wilayah('node(area.j)["barrier"="toll_booth"];out;', 'tol')

    # Way -> jenis/lin dari relasi rute KRL, MRT, LRT (rel jarak jauh/barang tidak diambil).
    info = {}
    for r in rute:
        t = r.get('tags', {})
        teks = ' '.join(str(t.get(k, '')) for k in ('name', 'network', 'operator', 'ref')).lower()
        if t.get('route') == 'subway' or 'mrt' in teks:
            jenis, lin = 'mrt', 'mrt'
        elif t.get('route') in ('light_rail', 'monorail') or 'lrt' in teks:
            jenis, lin = 'lrt', 'lrt'
        elif any(k in teks for k in ('commuter', 'krl', 'kci', 'commuterline')):
            jenis, lin = 'krl', lin_krl(t.get('name', ''))
        else:
            continue
        for m in r.get('members', []):
            if m['type'] == 'way':
                lama = info.get(m['ref'])
                # Ruas bersama: utamakan lin bernama dibanding "lain".
                if not lama or (lama[1] == 'lain' and lin != 'lain'):
                    info[m['ref']] = (jenis, lin, t.get('name'))
    hasil = []
    for e in rel_ways:
        if e['id'] not in info or e.get('tags', {}).get('railway') in ('platform', 'station', 'halt', 'stop'):
            continue
        jenis, lin, nama = info[e['id']]
        g = garis_way(e)
        if len(g) >= 2:
            hasil.append(fitur({'type': 'LineString', 'coordinates': g}, layer_id='mobilitas', jenis=jenis, nama=nama, sumber='OSM', atribut={'lin': lin}))

    # Stasiun dan halte resmi dari Commute Data API.
    lin_nama = {}
    for op in api('/operators'):
        for l in op.get('lines', []):
            lin_nama[f"{op['code']}:{l['lineCode']}"] = l['name']
    moda = {'KCI': 'krl', 'MRTJ': 'mrt', 'LRTJ': 'lrt', 'LRTJBDB': 'lrt'}
    for s in api('/stations'):
        if s.get('latitude') is None:
            continue
        geom = {'type': 'Point', 'coordinates': [s['longitude'], s['latitude']]}
        atr = {'kode': s['id'], 'operator': s['operator'], 'lin': [lin_nama.get(x, x) for x in s.get('lines', [])]}
        if s['operator'] in moda:
            hasil.append(fitur(geom, layer_id='mobilitas', jenis='stasiun', nama=s['name'], sumber='Commute Data Platform (ODbL)', atribut={**atr, 'moda': moda[s['operator']]}))
        elif s['operator'] == 'TJ':
            hasil.append(fitur(geom, layer_id='mobilitas', jenis='halte', nama=s['name'], sumber='Commute Data Platform (ODbL)', atribut={**atr, 'moda': 'transjakarta'}))

    # Halte TransJakarta lain dari GTFS; lewati yang < 80 m dari halte Commute Data API agar tidak dobel.
    resmi = [f['geometry']['coordinates'] for f in hasil if f['properties']['jenis'] == 'halte']
    dekat = lambda p: any(abs(p[0] - q[0]) < 0.0008 and abs(p[1] - q[1]) < 0.0008 for q in resmi)
    hasil += [h for h in gtfs_tj()[0] if not dekat(h['geometry']['coordinates'])]

    # Halte Biskita Trans Pakuan (Bogor).
    try:
        bk = json.loads(unduh(BISKITA, 'biskita.json'))
        hasil += halte_biskita(bk)
    except Exception as e:
        print('  Biskita dilewati:', e)

    for e in tol:
        hasil.append(fitur({'type': 'Point', 'coordinates': titik(e)}, layer_id='mobilitas', jenis='tol', nama=e.get('tags', {}).get('name'), sumber='OSM', atribut={}))
    return hasil


def halte_biskita(d):
    """Format JSON opentransum belum terdokumentasi: cari objek berkoordinat secara rekursif."""
    hasil, lihat = [], set()

    def jelajah(o, rute=None):
        if isinstance(o, dict):
            lat = o.get('lat', o.get('latitude'))
            lon = o.get('lng', o.get('lon', o.get('longitude')))
            nama = o.get('name') or o.get('nama') or o.get('stop_name')
            if isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and nama:
                kunci = (round(lat, 5), round(lon, 5))
                if kunci not in lihat and -6.8 < lat < -6.4 and 106.6 < lon < 107.0:
                    lihat.add(kunci)
                    hasil.append(fitur({'type': 'Point', 'coordinates': [round(lon, 6), round(lat, 6)]}, layer_id='mobilitas', jenis='halte', nama=nama,
                                       sumber='opentransum (Biskita Trans Pakuan)', atribut={'moda': 'biskita'}))
            for v in o.values():
                jelajah(v)
        elif isinstance(o, list):
            for v in o:
                jelajah(v)

    jelajah(d)
    print(f'  halte Biskita: {len(hasil)}')
    return hasil


def simpan_fitur(nama, daftar):
    """Muat ke staging, buang yang di luar Jabodetabek, lalu ekspor."""
    muat_tabel(f'f_{nama}', daftar)
    ekspor(f"""
      SELECT json_build_object('type','Feature','properties', f.data->'properties','geometry', ST_AsGeoJSON(g.geom, 6)::json)
      FROM tarik.f_{nama} f
      CROSS JOIN LATERAL (SELECT ST_SetSRID(ST_GeomFromGeoJSON(f.data->'geometry'), 4326) AS geom) g
      WHERE ST_IsValid(g.geom) AND ST_Intersects(g.geom, (SELECT geom FROM tarik.jabodetabek));
    """, f'{KELUAR}/fitur/{nama}.geojson')


def ekspor_wilayah():
    """Kelurahan + atribut turunan. kualitas_udara = CONTOH (deterministik, menunggu IQAir)."""
    print('Wilayah...')
    for t in ('ekosistem', 'mobilitas'):
        psql(f"""DROP TABLE IF EXISTS tarik.g_{t}; CREATE TABLE tarik.g_{t} AS
                 SELECT data->'properties'->>'jenis' AS jenis, data->'properties'->'atribut'->>'moda' AS moda,
                        ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(data->'geometry'), 4326)), CASE data->'geometry'->>'type' WHEN 'Point' THEN 1 WHEN 'LineString' THEN 2 ELSE 3 END) AS geom
                 FROM tarik.f_{t};
                 CREATE INDEX ON tarik.g_{t} USING gist (geom);""")
    ekspor("""
      WITH h AS (
        SELECT k.*,
          (SELECT count(*) FROM tarik.g_mobilitas m WHERE m.jenis = 'stasiun' AND ST_DWithin(m.geom::geography, k.geom::geography, 1200)) AS stasiun,
          (SELECT count(*) FROM tarik.g_ekosistem e WHERE e.jenis = 'rth' AND ST_Intersects(e.geom, k.geom)) AS rth,
          (SELECT count(*) FROM tarik.g_ekosistem e WHERE e.jenis = 'poi' AND ST_Intersects(e.geom, k.geom)) AS poi,
          (SELECT coalesce(sum(ST_Area(ST_Intersection(e.geom, k.geom))), 0) FROM tarik.g_ekosistem e WHERE e.jenis = 'rth' AND ST_Intersects(e.geom, k.geom)) / nullif(ST_Area(k.geom), 0) AS porsi_hijau
        FROM tarik.kel k
      )
      SELECT json_build_object('type','Feature','properties', json_build_object(
          'nama', nama, 'kecamatan', kecamatan, 'kota', kota,
          'tipe_kawasan', CASE WHEN stasiun > 0 THEN 'Permukiman dekat stasiun' WHEN porsi_hijau > 0.08 THEN 'Kawasan hijau' WHEN poi >= 15 THEN 'Pusat aktivitas' ELSE 'Permukiman' END,
          'kualitas_udara', CASE
              WHEN (('x' || substr(md5(nama || kota), 1, 4))::bit(16)::int % 100) + (CASE WHEN kota LIKE 'Jakarta%' THEN 25 ELSE 0 END) - (porsi_hijau * 150)::int < 30 THEN 'sehat'
              WHEN (('x' || substr(md5(nama || kota), 1, 4))::bit(16)::int % 100) + (CASE WHEN kota LIKE 'Jakarta%' THEN 25 ELSE 0 END) - (porsi_hijau * 150)::int < 80 THEN 'kurang_sehat'
              WHEN (('x' || substr(md5(nama || kota), 1, 4))::bit(16)::int % 100) + (CASE WHEN kota LIKE 'Jakarta%' THEN 25 ELSE 0 END) - (porsi_hijau * 150)::int < 118 THEN 'tidak_sehat'
              ELSE 'berbahaya' END,
          'atribut', json_build_object('sumber_batas', 'BIG', 'kode_kemendagri', kode, 'tingkat', tingkat, 'kualitas_udara', 'contoh', 'stasiun', stasiun, 'rth', rth, 'poi', poi)),
        'geometry', ST_AsGeoJSON(geom, 6)::json)
      FROM h ORDER BY kota, kecamatan, nama;
    """, f'{KELUAR}/wilayah.geojson')


def main():
    os.makedirs(CACHE, exist_ok=True)
    psql('CREATE SCHEMA IF NOT EXISTS tarik;')
    tarik_batas()
    ekosistem = tarik_ekosistem()
    inklusivitas = tarik_inklusivitas()
    mobilitas = tarik_mobilitas()
    simpan_fitur('ekosistem', ekosistem)
    simpan_fitur('inklusivitas', inklusivitas)
    simpan_fitur('mobilitas', mobilitas)
    ekspor_wilayah()
    psql('DROP SCHEMA tarik CASCADE;')
    print('Selesai. Muat ke basis data: php artisan db:seed --class=DemoPetaSeeder --force')


if __name__ == '__main__':
    sys.exit(main())
