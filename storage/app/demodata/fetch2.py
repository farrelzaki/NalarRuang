"""Unduh per petak (grid) untuk query Overpass yang berat, lalu gabungkan elemen unik."""
import json, os, sys, time, urllib.request, urllib.parse

UA = 'NalarRuang-student-project/0.1 (farrelmzaki77 at gmail)'
SERVER = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
JABO = (-6.80, 106.40, -6.05, 107.25)
FOKUS = (-6.56, 106.70, -6.28, 106.92)

def petak(b, n):
    s, w, nn, e = b
    for i in range(n):
        for j in range(n):
            yield (s + (nn - s) * i / n, w + (e - w) * j / n, s + (nn - s) * (i + 1) / n, w + (e - w) * (j + 1) / n)

def tanya(q, timeout=90):
    data = urllib.parse.urlencode({'data': f'[out:json][timeout:{timeout}];{q}'}).encode()
    for k in range(9):
        url = SERVER[k % len(SERVER)]
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, data=data, headers={'User-Agent': UA}), timeout=timeout + 30).read()
            if body[:1] == b'{':
                return json.loads(body)['elements']
            raise RuntimeError(body[:80])
        except Exception as ex:
            print('  ulang', url.split('/')[2], str(ex)[:60], flush=True); time.sleep(5)
    raise RuntimeError('gagal')

JOBS = {
    'kota': (FOKUS, 1, 'relation["boundary"="administrative"]["admin_level"="5"]{b};out geom;'),
    'kecamatan': (FOKUS, 2, 'relation["boundary"="administrative"]["admin_level"="6"]{b};out geom;'),
    'rth': (FOKUS, 3, '(way["leisure"="park"]{b};way["landuse"~"^(forest|recreation_ground|village_green|cemetery)$"]{b};way["leisure"="golf_course"]{b};);out geom;'),
    'poi': (FOKUS, 3, '(node["amenity"~"^(cafe|restaurant|fast_food)$"]{b};nwr["shop"="mall"]{b};);out center;'),
    'akses': (FOKUS, 2, '(node["wheelchair"="yes"]{b};way["footway"="sidewalk"]{b};);out geom;'),
    'halte': (FOKUS, 2, 'node["highway"="bus_stop"]{b};out;'),
    'permukiman': (FOKUS, 3, 'way["landuse"="residential"]["name"]{b};out geom;'),
    'konstruksi': (JABO, 2, '(way["railway"="construction"]{b};way["construction"~"rail|subway|light_rail"]{b};way["highway"="construction"]["construction"="motorway"]{b};);out geom;'),
    'mrt_lrt': (JABO, 2, '(relation["route"="subway"]{b};relation["route"="light_rail"]{b};);out geom;'),
    'rel': (JABO, 3, 'way["railway"="rail"]["service"!~"yard|siding|spur"]["usage"!~"industrial|military"]{b};out geom;'),
    'krl': (JABO, 2, 'relation["route"="train"]{b};out body;'),
}

for nama in (sys.argv[1:] or list(JOBS)):
    out = f'raw/{nama}.json'
    if os.path.exists(out):
        print('ada', nama); continue
    bbox, n, pola = JOBS[nama]
    elemen = {}
    for p in petak(bbox, n):
        b = f'({p[0]:.4f},{p[1]:.4f},{p[2]:.4f},{p[3]:.4f})'
        for el in tanya(pola.replace('{b}', b)):
            elemen[(el['type'], el['id'])] = el
        print(' petak ok', nama, len(elemen), flush=True)
        time.sleep(2)
    json.dump({'elements': list(elemen.values())}, open(out, 'w', encoding='utf-8'))
    print('ok', nama, len(elemen), flush=True)
