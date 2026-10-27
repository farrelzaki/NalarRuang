"""
Halte dan rute bus kota Bodetabek di luar TransJakarta -> data/geojson/transit_bodetabek/  (kebutuhan A-08)

Sumber: Opentransum (cdn.opentransum.randspace0.com/transport-data), lisensi CC BY-NC; proyek ini non-komersial,
atribusi "Data transit: Opentransum". Yang diambil hanya layanan di Jabodetabek:
  - transpakuan.json   Biskita Trans Pakuan (Kota Bogor)
  - beken.json         Bus Bekasi Keren (Kota Bekasi)
  - mitradarat.json    hanya "Trans Tangerang Tayo" (Kota Tangerang); kota lain di berkas ini di luar Jabodetabek
Primajasa dan Metro Jabar Trans tidak diambil: antarkota / di luar Jabodetabek.

Hasil: halte.geojson (titik, dengan daftar koridor) dan rute.geojson (garis per koridor, jam operasi).
Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/tarik_bus_bodetabek.py
Unduhan disimpan di storage/app/tarik/opentransum/ sehingga jalan ulang tidak mengunduh lagi.
"""
import json
import os
import urllib.request

DASAR = 'https://cdn.opentransum.randspace0.com/transport-data/'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
CACHE = 'storage/app/tarik/opentransum'
KELUAR = 'data/geojson/transit_bodetabek'
LAYANAN = {'transpakuan': ('Biskita Trans Pakuan', 'Kota Bogor'), 'beken': ('Bus Bekasi Keren', 'Kota Bekasi'),
           'mitradarat': ('Trans Tangerang Tayo', 'Kota Tangerang')}
BBOX = (106.35, -6.85, 107.25, -5.95)


def ambil(nama):
    os.makedirs(CACHE, exist_ok=True)
    berkas = f'{CACHE}/{nama}.json'
    if not os.path.exists(berkas):
        req = urllib.request.Request(DASAR + nama + '.json', headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=120) as r, open(berkas, 'wb') as f:
            f.write(r.read())
    with open(berkas, encoding='utf-8') as f:
        return json.load(f)


def di_jabodetabek(lon, lat):
    return BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]


def main():
    os.makedirs(KELUAR, exist_ok=True)
    halte, rute, ringkas = {}, [], {}
    for nama, (operator, kota) in LAYANAN.items():
        d = ambil(nama)
        semua_rute = d['routes'] if isinstance(d['routes'], list) else list(d['routes'].values())
        if nama == 'mitradarat':
            semua_rute = [r for r in semua_rute if r.get('cityName') == operator]
        stops = d.get('stops') or {}
        dipakai = set()
        for r in semua_rute:
            garis = [[round(p[0], 6), round(p[1], 6)] for p in (r.get('shape') or [])]
            if not garis or not di_jabodetabek(*garis[0]):
                continue
            dipakai.update(r.get('stopIds') or [])
            rute.append({'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': garis}, 'properties': {
                'operator': operator, 'kota': kota, 'koridor': r.get('shortName') or r.get('kor'),
                'nama': r.get('fullName'), 'asal': r.get('origin'), 'tujuan': r.get('toward'),
                'jam_operasi': r.get('operatingHours'), 'beroperasi': r.get('isOperating')}})
        for sid in dipakai:
            s = stops.get(sid)
            if not s or not di_jabodetabek(s['lng'], s['lat']):
                continue
            halte[f'{nama}:{sid}'] = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [
                round(s['lng'], 6), round(s['lat'], 6)]}, 'properties': {
                'id': f'{nama}:{sid}', 'nama': s.get('name'), 'operator': operator, 'kota': kota,
                'koridor': s.get('corridors') or []}}
        ringkas[operator] = {'rute': sum(1 for r in rute if r['properties']['operator'] == operator),
                             'halte': sum(1 for h in halte.values() if h['properties']['operator'] == operator),
                             'data_diambil_opentransum': d.get('fetchedAt')}
    for nama, isi in (('halte', list(halte.values())), ('rute', rute)):
        with open(f'{KELUAR}/{nama}.geojson', 'w', encoding='utf-8') as f:
            json.dump({'type': 'FeatureCollection', 'features': isi}, f, ensure_ascii=False, separators=(',', ':'))
    with open(f'{KELUAR}/ringkasan.json', 'w', encoding='utf-8') as f:
        json.dump({'sumber': 'Opentransum, CC BY-NC', **ringkas}, f, ensure_ascii=False, indent=1)
    print(json.dumps(ringkas, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
