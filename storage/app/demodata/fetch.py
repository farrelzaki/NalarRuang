"""Unduh data nyata untuk layer contoh demo: OSM (Overpass) dan InaRISK.
Disimpan mentah di raw/, diolah build.py menjadi GeoJSON."""
import json, os, sys, time, urllib.request, urllib.parse, ssl, math

UA = 'NalarRuang-student-project/0.1 (farrelmzaki77 at gmail)'
OVERPASS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
os.makedirs('raw', exist_ok=True)

JABO = (-6.80, 106.40, -6.05, 107.25)      # jalur rel, stasiun, tol se-Jabodetabek
FOKUS = (-6.56, 106.70, -6.28, 106.92)     # detail: Bogor utara – Depok – Jakarta Selatan

def bb(b): return f'({b[0]},{b[1]},{b[2]},{b[3]})'

def overpass(name, q, timeout=180):
    out = f'raw/{name}.json'
    if os.path.exists(out) and os.path.getsize(out) > 100:
        print('cache', name); return
    data = urllib.parse.urlencode({'data': f'[out:json][timeout:{timeout}];{q}'}).encode()
    for attempt in range(6):
        url = OVERPASS[attempt % len(OVERPASS)]
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA})
            body = urllib.request.urlopen(req, timeout=timeout + 30).read()
            if body[:1] != b'{': raise RuntimeError(body[:120])
            open(out, 'wb').write(body)
            print('ok', name, len(body), url); return
        except Exception as e:
            print('retry', name, url, str(e)[:120]); time.sleep(8)
    print('GAGAL', name)

J, F = bb(JABO), bb(FOKUS)
jobs = {
    'rel': f'way["railway"="rail"]["service"!~"yard|siding|spur"]["usage"!~"industrial|military"]{J};out geom;',
    'krl': f'relation["route"="train"]{J};out body;',
    'mrt_lrt': f'(relation["route"="subway"]{J};relation["route"="light_rail"]{J};);out geom;',
    'stasiun': f'(node["railway"="station"]{J};node["public_transport"="station"]["train"="yes"]{J};);out;',
    'konstruksi': f'(way["railway"="construction"]{J};way["construction"~"rail|subway|light_rail"]{J};way["highway"="construction"]["construction"="motorway"]{J};);out geom;',
    'tol': f'node["barrier"="toll_booth"]{J};out;',
    'kelurahan': f'relation["boundary"="administrative"]["admin_level"="7"]{F};out geom;',
    'rth': f'(way["leisure"="park"]{F};way["landuse"~"^(forest|recreation_ground|village_green|cemetery)$"]{F};way["leisure"="golf_course"]{F};);out geom;',
    'poi': f'(node["amenity"~"^(cafe|restaurant|fast_food)$"]{F};nwr["shop"="mall"]{F};);out center;',
    'akses': f'(node["wheelchair"="yes"]{F};way["footway"="sidewalk"]{F};);out geom;',
    'halte': f'node["highway"="bus_stop"]{F};out;',
    'permukiman': f'way["landuse"="residential"]["name"]{F};out geom;',
}
only = sys.argv[1:] or list(jobs)
for k in [x for x in only if x in jobs]:
    overpass(k, jobs[k]); time.sleep(3)

# InaRISK: indeks bahaya banjir, area fokus, proyeksi Web Mercator
if 'banjir' in only or not sys.argv[1:]:
    out = 'raw/banjir.png'
    if not os.path.exists(out):
        R = 6378137
        def merc(lat, lng):
            return R * math.radians(lng), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
        x0, y0 = merc(FOKUS[0], FOKUS[1]); x1, y1 = merc(FOKUS[2], FOKUS[3])
        w = 1600; h = int(w * (y1 - y0) / (x1 - x0))
        url = ('https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR/ImageServer/exportImage'
               f'?bbox={x0},{y0},{x1},{y1}&bboxSR=3857&imageSR=3857&size={w},{h}&format=png32&f=image')
        for attempt in range(4):
            try:
                body = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=180, context=ssl._create_unverified_context()).read()
                if body[:4] != b'\x89PNG': raise RuntimeError(body[:120])
                open(out, 'wb').write(body); json.dump({'bbox': FOKUS, 'w': w, 'h': h}, open('raw/banjir.json', 'w'))
                print('ok banjir', len(body)); break
            except Exception as e:
                print('retry banjir', str(e)[:120]); time.sleep(8)
