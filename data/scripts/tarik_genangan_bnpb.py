"""
Genangan banjir besar Januari-Maret 2020 dari BNPB -> data/geojson/genangan_bnpb_2020/  (pengganti A-03)

Pengganti titik Genangan Berulang DSDA, yang di Satu Data Jakarta berstatus Terbatas sehingga perlu izin.
Layer di sini dipublikasikan BNPB di layanan peta publik tanpa token (folder Banjir_Jakarta_2020), sama
dengan sumber InaRISK yang sudah dipakai layer banjir. Atribusi: BNPB.

  genangan_dki_jan2020.geojson    poligon genangan DKI 1-3 Januari 2020 (857 poligon)
  genangan_tangerang_2020.geojson poligon banjir Kota/Kab. Tangerang (pembaruan 23 Maret 2020)
  genangan_tangsel_2020.geojson   poligon banjir Tangerang Selatan 25 Maret 2020

Ini catatan satu kejadian besar, bukan peta kerawanan. Di aplikasi sebaiknya ditampilkan sebagai
"pernah tergenang saat banjir 2020", berdampingan dengan peta bahaya InaRISK.

Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/tarik_genangan_bnpb.py
"""
import json
import os
import time
import urllib.parse
import urllib.request

DASAR = 'https://gis.bnpb.go.id/server/rest/services/Banjir_Jakarta_2020/'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
KELUAR = 'data/geojson/genangan_bnpb_2020'
LAYER = {
    'genangan_dki_jan2020': 'GENANGAN_BANJIR_DKI_1_3_JANUARI_2020/MapServer/0',
    'genangan_tangerang_2020': 'Genangan_Tangsel/MapServer/0',
    'genangan_tangsel_2020': 'Genangan_Tangsel/MapServer/1',
}


def ambil(path, params):
    url = DASAR + path + '/query?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def bulat(c):
    return round(c, 6) if isinstance(c, (int, float)) else [bulat(x) for x in c]


def main():
    os.makedirs(KELUAR, exist_ok=True)
    ringkas = {}
    for nama, path in LAYER.items():
        # layanan ini tidak mendukung paginasi: ambil semua objectId dulu, lalu query per 500 id
        ids = sorted(ambil(path, {'where': '1=1', 'returnIdsOnly': 'true', 'f': 'json'}).get('objectIds') or [])
        total, fitur = len(ids), []
        for i in range(0, total, 500):
            d = ambil(path, {'objectIds': ','.join(map(str, ids[i:i + 500])), 'outFields': '*', 'outSR': 4326,
                             'f': 'geojson'})
            for f in d.get('features') or []:
                if f.get('geometry'):
                    f['geometry']['coordinates'] = bulat(f['geometry']['coordinates'])
                    fitur.append({'type': 'Feature', 'geometry': f['geometry'],
                                  'properties': {'sumber': 'BNPB', 'kejadian': nama, **(f.get('properties') or {})}})
            time.sleep(1)
        with open(f'{KELUAR}/{nama}.geojson', 'w', encoding='utf-8') as f:
            json.dump({'type': 'FeatureCollection', 'features': fitur}, f, ensure_ascii=False, separators=(',', ':'))
        ringkas[nama] = {'di_layanan': total, 'disimpan': len(fitur)}
        print(nama, ringkas[nama])
    with open(f'{KELUAR}/ringkasan.json', 'w', encoding='utf-8') as f:
        json.dump({'sumber': DASAR, 'atribusi': 'BNPB', **ringkas}, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
