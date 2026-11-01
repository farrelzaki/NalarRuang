"""
Poligon TAMPILAN bahaya banjir InaRISK -> data/geojson/banjir_tampilan/inarisk_tampil.geojson.gz

Terpisah dari poligon perhitungan (kelas resmi InaRISK di historis_risiko.geojson, dipakai skor).
Peta hanya menggambar indeks >= 0,50 dalam tiga tingkat kepekatan (keputusan tim 30 Okt 2026):
  1 = 0,50-0,60 (merah cerah), 2 = 0,61-0,80 (merah medium), 3 = 0,81-1,00 (merah pekat).
Indeks InaRISK adalah skor bahaya relatif dari bentuk lahan (Geomorphic Flood Index), bukan peluang
atau kedalaman genangan.

Jalankan dari akar repo: python data/scripts/banjir_tampilan.py  (memakai cache petak banjir_inarisk.py)
"""
import gzip
import json
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from banjir_inarisk import BARAT, LUAS_MIN_PX, PETAK, RES, SELATAN, TIMUR, UTARA, ambil  # noqa: E402

TINGKAT = [(1, 0.50, 0.61), (2, 0.61, 0.81), (3, 0.81, 1.01)]


def kanvas_penuh():
    lebar = round((TIMUR - BARAT) / RES)
    tinggi = round((UTARA - SELATAN) / RES)
    k = np.zeros((tinggi, lebar), dtype=np.float32)
    y = UTARA
    while y > SELATAN + 1e-9:
        x = BARAT
        while x < TIMUR - 1e-9:
            x1, y0 = min(x + PETAK, TIMUR), max(y - PETAK, SELATAN)
            a = ambil(x, y0, x1, y)
            r0, c0 = round((UTARA - y) / RES), round((x - BARAT) / RES)
            hh, ww = min(a.shape[0], tinggi - r0), min(a.shape[1], lebar - c0)
            k[r0:r0 + hh, c0:c0 + ww] = a[:hh, :ww]
            x = x1
        y = y0
    k = np.nan_to_num(k, nan=0.0)
    k[(k < 0) | (k > 1.5)] = 0
    return k


def main():
    k = kanvas_penuh()
    ke_lonlat = lambda c: [[round(BARAT + (p[0][0] + 0.5) * RES, 6), round(UTARA - (p[0][1] + 0.5) * RES, 6)] for p in c]
    fitur = []
    for tingkat, lo, hi in TINGKAT:
        topeng = ((k >= lo) & (k < hi)).astype(np.uint8)
        topeng = cv2.morphologyEx(topeng, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        kontur, hirarki = cv2.findContours(topeng, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hirarki is None:
            continue
        hirarki = hirarki[0]
        n = 0
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
            fitur.append({'type': 'Feature', 'properties': {'tingkat': tingkat, 'indeks_min': lo, 'indeks_maks': min(hi, 1.0)},
                          'geometry': {'type': 'Polygon', 'coordinates': cincin}})
            n += 1
        print('tingkat', tingkat, n, 'poligon', flush=True)
    with gzip.open('data/geojson/banjir_tampilan/inarisk_tampil.geojson.gz', 'wt', encoding='utf8') as f:
        json.dump({'type': 'FeatureCollection', 'features': fitur}, f, separators=(',', ':'))
    print('total', len(fitur))


if __name__ == '__main__':
    main()
