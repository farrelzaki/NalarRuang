"""Olah data mentah (raw/) menjadi GeoJSON demo di data/geojson/demo/.
Geometri nyata (OSM, InaRISK). Atribut yang tidak ada sumbernya ditandai "contoh"."""
import json, math, os, hashlib
import numpy as np, cv2

OUT = os.path.join('..', '..', '..', 'data', 'geojson', 'demo')
os.makedirs(os.path.join(OUT, 'fitur'), exist_ok=True)

def baca(n):
    p = f'raw/{n}.json'
    return json.load(open(p, encoding='utf-8'))['elements'] if os.path.exists(p) else []

def r6(x): return round(x, 6)
def fitur(geom, **p): return {'type': 'Feature', 'geometry': geom, 'properties': p}
def tulis(nama, fs):
    json.dump({'type': 'FeatureCollection', 'features': fs}, open(os.path.join(OUT, nama), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(nama, len(fs))
def hash01(s): return int(hashlib.md5(str(s).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

def dp(pts, tol):
    """Douglas–Peucker pada [lng,lat] (toleransi derajat)."""
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-12
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + b[0] * a[1] - b[1] * a[0]) / L
        if d > dmax: i, dmax = k, d
    if dmax <= tol: return [a, b]
    return dp(pts[:i + 1], tol)[:-1] + dp(pts[i:], tol)

def ring_dp(r, tol=0.00004):
    if len(r) < 8: return r
    m = len(r) // 2
    out = dp(r[:m + 1], tol)[:-1] + dp(r[m:], tol)
    if out[0] != out[-1]: out.append(out[0])
    return out if len(out) >= 4 else r

def stitch(ways):
    ways = [w[:] for w in ways if len(w) > 1]; rings = []
    while ways:
        ring = ways.pop(0); ubah = True
        while ubah and ring[0] != ring[-1]:
            ubah = False
            for i, w in enumerate(ways):
                if w[0] == ring[-1]: ring += w[1:]
                elif w[-1] == ring[-1]: ring += w[::-1][1:]
                elif w[-1] == ring[0]: ring = w[:-1] + ring
                elif w[0] == ring[0]: ring = w[::-1][:-1] + ring
                else: continue
                ways.pop(i); ubah = True; break
        if ring[0] == ring[-1] and len(ring) >= 4: rings.append(ring)
    return rings

def inside(pt, ring):
    x, y = pt; c = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c

def luas(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2

def kota_dari(lng, lat):
    if lng < 106.765 and lat > -6.40: return 'Kota Tangerang Selatan'
    if lat > -6.365: return 'Jakarta Selatan' if lng < 106.84 else 'Jakarta Timur'
    if lat > -6.445 and 106.71 < lng < 106.92: return 'Kota Depok'
    return 'Kabupaten Bogor'

# ---------- Wilayah (kelurahan) ----------
wilayah = []
kel_rings = []
for e in baca('kelurahan'):
    outer = [[[r6(n['lon']), r6(n['lat'])] for n in m['geometry']] for m in e.get('members', []) if m['type'] == 'way' and m.get('role') in ('outer', '') and 'geometry' in m]
    rings = [ring_dp(r) for r in stitch(outer)]
    if not rings: continue
    nama = e['tags'].get('name')
    if not nama: continue
    for awal in ('Kelurahan ', 'Desa ', 'Kel. '):
        if nama.startswith(awal): nama = nama[len(awal):]
    utama = max(rings, key=luas)
    cx = sum(p[0] for p in utama) / len(utama); cy = sum(p[1] for p in utama) / len(utama)
    kel_rings.append((nama, rings, cx, cy))

# batas kota/kabupaten dan kecamatan asli (OSM admin_level 5 dan 6)
def batas(nama_berkas):
    hasil = []
    for e in baca(nama_berkas):
        if e['type'] != 'relation': continue
        outer = [[[n['lon'], n['lat']] for n in m['geometry']] for m in e.get('members', []) if m['type'] == 'way' and m.get('role') in ('outer', '') and 'geometry' in m]
        rings = stitch(outer)
        if rings and e['tags'].get('name'): hasil.append((e['tags']['name'], rings))
    return hasil
KOTA = batas('kota'); KEC = batas('kecamatan')
def cari(batas_list, lng, lat):
    for nama, rings in batas_list:
        if any(inside((lng, lat), r) for r in rings): return nama
    return None
def rapikan_kota(n):
    if not n: return None
    n = n.replace('Kota Administrasi ', '')
    peta = {'Kab Bogor': 'Kabupaten Bogor', 'Kab. Bogor': 'Kabupaten Bogor', 'Bogor': 'Kota Bogor', 'Depok': 'Kota Depok', 'Tangerang Selatan': 'Kota Tangerang Selatan', 'Tangerang': 'Kota Tangerang', 'Bekasi': 'Kota Bekasi'}
    return peta.get(n, n)

# fasilitas untuk tipe kawasan dan kualitas udara contoh
stasiun_pts = [(n['lon'], n['lat']) for n in baca('stasiun') if n['type'] == 'node']
rth_raw = [w for w in baca('rth') if w['type'] == 'way' and 'geometry' in w]
rth_pts = [(sum(g['lon'] for g in w['geometry']) / len(w['geometry']), sum(g['lat'] for g in w['geometry']) / len(w['geometry'])) for w in rth_raw]
poi_raw = baca('poi')
poi_pts = [((e.get('lon') or e.get('center', {}).get('lon')), (e.get('lat') or e.get('center', {}).get('lat'))) for e in poi_raw]
poi_pts = [p for p in poi_pts if p[0]]

for nama, rings, cx, cy in kel_rings:
    def hitung(pts): return sum(1 for p in pts if any(inside(p, r) for r in rings))
    n_st, n_rth, n_poi = hitung(stasiun_pts), hitung(rth_pts), hitung(poi_pts)
    kota = rapikan_kota(cari(KOTA, cx, cy)) or kota_dari(cx, cy)
    kecamatan = cari(KEC, cx, cy)
    tipe = 'Permukiman dekat stasiun' if n_st else 'Pusat aktivitas' if n_poi >= 8 else 'Kawasan hijau' if n_rth >= 3 else 'Permukiman'
    if 'Jakarta' in kota:
        udara = 'tidak_sehat' if hash01(nama) < 0.6 else 'kurang_sehat'
    else:
        udara = 'sehat' if n_rth >= 2 or hash01(nama) < 0.25 else 'kurang_sehat'
    wilayah.append(fitur({'type': 'MultiPolygon', 'coordinates': [[r] for r in rings]},
                         nama=nama, kecamatan=kecamatan, kota=kota, tipe_kawasan=tipe, kualitas_udara=udara,
                         atribut={'sumber_batas': 'OSM', 'kualitas_udara': 'contoh', 'stasiun': n_st, 'rth': n_rth, 'poi': n_poi}))
tulis('wilayah.geojson', wilayah)

# ---------- Historis & Risiko: poligon banjir dari raster InaRISK ----------
fs = []
if os.path.exists('raw/banjir.png'):
    meta = json.load(open('raw/banjir.json'))
    s, w, n, e = meta['bbox']; W, H = meta['w'], meta['h']
    R = 6378137
    y0 = R * math.log(math.tan(math.pi / 4 + math.radians(n) / 2)); y1 = R * math.log(math.tan(math.pi / 4 + math.radians(s) / 2))
    def ke_lnglat(px, py):
        lng = w + (e - w) * px / W
        my = y0 + (y1 - y0) * py / H
        lat = math.degrees(2 * math.atan(math.exp(my / R)) - math.pi / 2)
        return [r6(lng), r6(lat)]
    img = cv2.imread('raw/banjir.png', cv2.IMREAD_UNCHANGED)
    abu = img[:, :, 0].astype(np.float32); alfa = img[:, :, 3] if img.shape[2] == 4 else np.full(abu.shape, 255, np.uint8)
    abu = cv2.GaussianBlur(np.where(alfa > 0, abu, 0), (5, 5), 0)
    ada = cv2.GaussianBlur((alfa > 0).astype(np.float32), (5, 5), 0)
    for kelas, batas in (('rendah', 1), ('sedang', 85), ('tinggi', 170)):
        topeng = ((ada > 0.5) & (abu >= batas)).astype(np.uint8) * 255
        kontur, hier = cv2.findContours(topeng, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hier is None: continue
        for i, c in enumerate(kontur):
            if hier[0][i][3] != -1 or cv2.contourArea(c) < 12: continue
            c = cv2.approxPolyDP(c, 1.0, True)
            luar = [ke_lnglat(int(p[0][0]), int(p[0][1])) for p in c]
            if len(luar) < 4: continue
            luar.append(luar[0])
            lubang = []
            j = hier[0][i][2]
            while j != -1:
                h = cv2.approxPolyDP(kontur[j], 1.0, True)
                if cv2.contourArea(h) > 12 and len(h) >= 3:
                    r = [ke_lnglat(int(p[0][0]), int(p[0][1])) for p in h]; r.append(r[0]); lubang.append(r)
                j = hier[0][j][0]
            fs.append(fitur({'type': 'Polygon', 'coordinates': [luar] + lubang}, layer_id='historis_risiko', jenis='banjir', nama=f'Bahaya banjir {kelas}', sumber='InaRISK (BNPB)', atribut={'kelas': kelas}))
tulis('fitur/historis_risiko.geojson', fs)

# ---------- Ekosistem Mikro ----------
fs = []
for wy in rth_raw:
    r = ring_dp([[r6(g['lon']), r6(g['lat'])] for g in wy['geometry']])
    if r[0] != r[-1] or len(r) < 4: continue
    t = wy.get('tags', {})
    fs.append(fitur({'type': 'Polygon', 'coordinates': [r]}, layer_id='ekosistem', jenis='rth', nama=t.get('name'), sumber='OSM', atribut={'kategori': t.get('leisure') or t.get('landuse')}))
KATEGORI = {'cafe': 'Kafe', 'restaurant': 'Restoran', 'fast_food': 'Makanan cepat saji'}
for el in poi_raw:
    lon = el.get('lon') or el.get('center', {}).get('lon'); lat = el.get('lat') or el.get('center', {}).get('lat')
    if lon is None: continue
    t = el.get('tags', {})
    fs.append(fitur({'type': 'Point', 'coordinates': [r6(lon), r6(lat)]}, layer_id='ekosistem', jenis='poi', nama=t.get('name'), sumber='OSM', atribut={'kategori': 'Mal' if t.get('shop') == 'mall' else KATEGORI.get(t.get('amenity'), 'Tempat makan')}))
tulis('fitur/ekosistem.geojson', fs)

# ---------- Inklusivitas ----------
fs = []
for el in baca('akses'):
    t = el.get('tags', {})
    if el['type'] == 'node':
        fs.append(fitur({'type': 'Point', 'coordinates': [r6(el['lon']), r6(el['lat'])]}, layer_id='inklusivitas', jenis='akses', nama=t.get('name'), sumber='OSM', atribut={}))
    elif el['type'] == 'way' and 'geometry' in el:
        fs.append(fitur({'type': 'LineString', 'coordinates': dp([[r6(g['lon']), r6(g['lat'])] for g in el['geometry']], 0.00002)}, layer_id='inklusivitas', jenis='trotoar', nama=t.get('name'), sumber='OSM', atribut={}))
tulis('fitur/inklusivitas.geojson', fs)

# ---------- Mobilitas & Transit ----------
fs = []
def lin_dari(tags):
    teks = ' '.join(str(tags.get(k, '')) for k in ('name', 'ref', 'name:id', 'from', 'to')).lower()
    for kunci, lin in (('bogor', 'bogor'), ('nambo', 'bogor'), ('rangkas', 'rangkas'), ('cikarang', 'cikarang'), ('bekasi', 'cikarang')):
        if kunci in teks: return lin
    return 'lain'
lin_way = {}
for rel in baca('krl'):
    if rel['type'] != 'relation': continue
    t = rel.get('tags', {})
    if 'krl' not in ' '.join(str(v) for v in t.values()).lower() and 'commuter' not in ' '.join(str(v) for v in t.values()).lower(): continue
    lin = lin_dari(t)
    for m in rel.get('members', []):
        if m['type'] == 'way':
            if lin_way.get(m['ref'], 'lain') == 'lain': lin_way[m['ref']] = lin
for wy in baca('rel'):
    if wy['type'] != 'way' or 'geometry' not in wy: continue
    lin = lin_way.get(wy['id'])
    if not lin: continue  # hanya rel yang dilalui KRL
    fs.append(fitur({'type': 'LineString', 'coordinates': dp([[r6(g['lon']), r6(g['lat'])] for g in wy['geometry']], 0.00002)}, layer_id='mobilitas', jenis='krl', nama=f'KRL Lin {lin.capitalize()}' if lin != 'lain' else 'KRL lintas lain', sumber='OSM', atribut={'lin': lin}))
for rel in baca('mrt_lrt'):
    if rel['type'] != 'relation': continue
    t = rel.get('tags', {})
    jenis = 'mrt' if t.get('route') == 'subway' else 'lrt'
    for m in rel.get('members', []):
        if m['type'] == 'way' and 'geometry' in m and m.get('role') in ('', 'forward', 'backward', None):
            fs.append(fitur({'type': 'LineString', 'coordinates': dp([[r6(g['lon']), r6(g['lat'])] for g in m['geometry']], 0.00002)}, layer_id='mobilitas', jenis=jenis, nama=t.get('name'), sumber='OSM', atribut={}))
seen = set()
for n in baca('stasiun'):
    if n['type'] != 'node' or n['id'] in seen: continue
    seen.add(n['id']); t = n.get('tags', {})
    if not t.get('name'): continue
    st = t.get('station', '')
    moda = 'mrt' if st == 'subway' or 'mrt' in t.get('network', '').lower() else 'lrt' if st == 'light_rail' else 'krl'
    fs.append(fitur({'type': 'Point', 'coordinates': [r6(n['lon']), r6(n['lat'])]}, layer_id='mobilitas', jenis='stasiun', nama=t['name'].replace('Stasiun ', ''), sumber='OSM', atribut={'moda': moda}))
for n in baca('halte'):
    t = n.get('tags', {})
    fs.append(fitur({'type': 'Point', 'coordinates': [r6(n['lon']), r6(n['lat'])]}, layer_id='mobilitas', jenis='halte', nama=t.get('name'), sumber='OSM', atribut={}))
seen = set()
for n in baca('tol'):
    t = n.get('tags', {})
    k = (t.get('name'), round(n['lat'], 3), round(n['lon'], 3))
    if k in seen: continue
    seen.add(k)
    fs.append(fitur({'type': 'Point', 'coordinates': [r6(n['lon']), r6(n['lat'])]}, layer_id='mobilitas', jenis='tol', nama=t.get('name') or 'Gerbang tol', sumber='OSM', atribut={}))
tulis('fitur/mobilitas.geojson', fs)

# ---------- Mesin Waktu ----------
fs = []
for wy in baca('konstruksi'):
    if wy['type'] != 'way' or 'geometry' not in wy: continue
    t = wy.get('tags', {})
    tahun = 2026 + int(hash01(t.get('name') or wy['id']) * 5)
    jenis_proyek = t.get('construction') or t.get('railway')
    fs.append(fitur({'type': 'LineString', 'coordinates': dp([[r6(g['lon']), r6(g['lat'])] for g in wy['geometry']], 0.00002)}, layer_id='mesin_waktu', jenis='proyek', nama=t.get('name') or ('Jalan tol dalam pembangunan' if jenis_proyek == 'motorway' else 'Jalur rel dalam pembangunan'), tahun=tahun, sumber='OSM (target tahun: contoh)', atribut={'status': 'Dalam pembangunan'}))
tulis('fitur/mesin_waktu.geojson', fs)

# ---------- Legalitas Lahan (status contoh di atas bidang permukiman OSM) ----------
fs = []
STATUS = ['SHM', 'SHM', 'HGB', 'HGB', 'SHGB dalam proses', 'Girik']
for wy in baca('permukiman'):
    if wy['type'] != 'way' or 'geometry' not in wy: continue
    r = ring_dp([[r6(g['lon']), r6(g['lat'])] for g in wy['geometry']])
    if r[0] != r[-1] or len(r) < 4: continue
    t = wy.get('tags', {})
    fs.append(fitur({'type': 'Polygon', 'coordinates': [r]}, layer_id='legalitas', jenis='legal', nama=t.get('name'), sumber='OSM (status: contoh)', atribut={'status': STATUS[int(hash01(wy['id']) * len(STATUS))], 'peruntukan': 'Permukiman'}))
tulis('fitur/legalitas.geojson', fs)
