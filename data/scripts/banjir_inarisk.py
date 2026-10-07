"""
Poligon bahaya banjir InaRISK (BNPB) untuk seluruh Jabodetabek -> data/geojson/demo/fitur/historis_risiko.geojson.

Sumber: ImageServer publik inarisk/INDEKS_BAHAYA_BANJIR (indeks 0..1, piksel ~100 m).
Kelas mengikuti InaRISK: rendah < 0,333 <= sedang < 0,666 <= tinggi.
Butuh: numpy, opencv-python, Pillow. Jalankan dari akar repo: python data/scripts/banjir_inarisk.py
"""
import io
import json
import os
import time
import urllib.request

import cv2
import numpy as np
from PIL import Image

LAYANAN = 'https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR/ImageServer/exportImage'
# Jabodetabek (lon/lat), dibagi petak agar tiap permintaan kecil.
BARAT, SELATAN, TIMUR, UTARA = 106.35, -6.80, 107.25, -5.95
PETAK = 0.15            # derajat per petak
RES = 0.0009            # derajat per piksel (~100 m)
AMBANG_MIN = 0.15       # di bawah ini dianggap tidak berbahaya (mengurangi bercak tipis)
LUAS_MIN_PX = 6         # buang poligon lebih kecil dari ini
KELAS = [('rendah', AMBANG_MIN, 0.333), ('sedang', 0.333, 0.666), ('tinggi', 0.666, 1.01)]


CACHE = 'storage/app/inarisk'


def ambil(x0, y0, x1, y1):
    os.makedirs(CACHE, exist_ok=True)
    berkas = f'{CACHE}/{x0:.2f}_{y0:.2f}.npy'
    if os.path.exists(berkas):
        return np.load(berkas)
    w = round((x1 - x0) / RES)
    h = round((y1 - y0) / RES)
    url = (f'{LAYANAN}?bbox={x0},{y0},{x1},{y1}&bboxSR=4326&imageSR=4326&size={w},{h}'
           '&format=tiff&compression=None&pixelType=F32&interpolation=RSP_NearestNeighbor&f=image')
    req = urllib.request.Request(url, headers={'User-Agent': 'NalarRuang/0.1 (proyek mahasiswa IPB)'})
    for coba in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                a = np.array(Image.open(io.BytesIO(r.read())), dtype=np.float32)
                np.save(berkas, a)
                return a
        except Exception as e:
            print(f'  ulang ({coba + 1}): {e}', flush=True)
            time.sleep(10 * (coba + 1))
    raise RuntimeError(f'Gagal mengambil petak {x0},{y0}')


def main():
    lebar = round((TIMUR - BARAT) / RES)
    tinggi = round((UTARA - SELATAN) / RES)
    kanvas = np.zeros((tinggi, lebar), dtype=np.float32)
    y = UTARA
    while y > SELATAN + 1e-9:
        x = BARAT
        while x < TIMUR - 1e-9:
            x1, y0 = min(x + PETAK, TIMUR), max(y - PETAK, SELATAN)
            a = ambil(x, y0, x1, y)
            r0, c0 = round((UTARA - y) / RES), round((x - BARAT) / RES)
            hh, ww = min(a.shape[0], tinggi - r0), min(a.shape[1], lebar - c0)
            kanvas[r0:r0 + hh, c0:c0 + ww] = a[:hh, :ww]
            print(f'petak {x:.2f},{y:.2f} ok', flush=True)
            x = x1
        y = y0
    kanvas = np.nan_to_num(kanvas, nan=0.0)
    kanvas[(kanvas < 0) | (kanvas > 1.5)] = 0

    fitur = []
    for nama, lo, hi in KELAS:
        topeng = ((kanvas >= lo) & (kanvas < hi)).astype(np.uint8)
        topeng = cv2.morphologyEx(topeng, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        kontur, hirarki = cv2.findContours(topeng, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hirarki is None:
            continue
        hirarki = hirarki[0]
        ke_lonlat = lambda c: [[round(BARAT + (p[0][0] + 0.5) * RES, 6), round(UTARA - (p[0][1] + 0.5) * RES, 6)] for p in c]
        for i, c in enumerate(kontur):
            if hirarki[i][3] != -1 or cv2.contourArea(c) < LUAS_MIN_PX:
                continue
            c = cv2.approxPolyDP(c, 0.6, True)
            if len(c) < 3:
                continue
            cincin = [ke_lonlat(c)]
            anak = hirarki[i][2]
            while anak != -1:
                h = cv2.approxPolyDP(kontur[anak], 0.6, True)
                if len(h) >= 3 and cv2.contourArea(kontur[anak]) >= LUAS_MIN_PX:
                    cincin.append(ke_lonlat(h))
                anak = hirarki[anak][0]
            for r in cincin:
                r.append(r[0])
            fitur.append({
                'type': 'Feature',
                'properties': {'layer_id': 'historis_risiko', 'jenis': 'banjir', 'nama': f'Bahaya banjir {nama}', 'sumber': 'InaRISK (BNPB)', 'atribut': {'kelas': nama}},
                'geometry': {'type': 'Polygon', 'coordinates': cincin},
            })
        print(nama, sum(1 for f in fitur if f['properties']['atribut']['kelas'] == nama))

    with open('data/geojson/demo/fitur/historis_risiko.geojson', 'w', encoding='utf8') as f:
        json.dump({'type': 'FeatureCollection', 'features': fitur}, f, separators=(',', ':'))
    print('total', len(fitur))


if __name__ == '__main__':
    main()
