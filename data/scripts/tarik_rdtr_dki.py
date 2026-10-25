"""
Tarik zonasi RDTR DKI Jakarta 2022 -> data/geojson/rdtr_dki_2022/ (pengganti status lahan contoh di layer Legalitas).

Sumber: layanan peta publik Dinas Citata DKI, tanpa token
  https://tataruang.jakarta.go.id/server/rest/services/RDTR_2022/Rencana_Pola_Ruang_RDTR_2022/FeatureServer/0
  (Rencana Pola Ruang RDTR WP DKI Jakarta 2022, Pergub DKI 31/2022). Atribusi: Pemprov DKI Jakarta.

Hasil:
  zonasi_<kota>.geojson.gz  poligon per kota dengan kolom ringkas (zona, sub-zona, KDB/KLB/KTB/KDH, luas,
                            kelurahan) dan `id_kegiatan` yang menunjuk ke kegiatan_subzona.csv
  kegiatan_subzona.csv      daftar kegiatan Diizinkan / Terbatas / Bersyarat / Terbatas-bersyarat per sub-zona.
                            Daftar ini panjang dan berulang, jadi disimpan sekali per kombinasi, bukan per poligon.
  ringkasan.json            jumlah poligon per kota dan per zona, tanggal tarik

Layer ini tidak memuat data pribadi. Folder lain di server yang sama yang meminta token tidak disentuh.

Butuh: Python 3 (pustaka standar). Jalankan dari akar repo:  python data/scripts/tarik_rdtr_dki.py
Hasil unduhan mentah disimpan di storage/app/tarik/rdtr_dki/ sehingga jalan ulang tidak mengunduh lagi.
"""
import csv
import datetime
import gzip
import json
import os
import time
import urllib.parse
import urllib.request

LAYANAN = 'https://tataruang.jakarta.go.id/server/rest/services/RDTR_2022/Rencana_Pola_Ruang_RDTR_2022/FeatureServer/0'
UA = 'NalarRuang/0.1 (proyek mahasiswa IPB University)'
CACHE = 'storage/app/tarik/rdtr_dki'
KELUAR = 'data/geojson/rdtr_dki_2022'
PER_HALAMAN = 2000          # maxRecordCount layanan
JEDA = 1.0                  # detik antar-permintaan
# Zona Badan Jalan (41 ribu poligon tipis, 38% data) tidak berguna untuk layer Legalitas dan membuat berkas
# membengkak, jadi tidak disimpan. Badan air tetap disimpan karena dipakai untuk menandai area bukan hunian.
LEWATI_ZONA = {'BJ'}
DESIMAL = 5                 # +-1 m; cukup untuk zonasi, memangkas ukuran berkas

# Kolom yang disimpan per poligon (kolom lain di layanan berupa kode internal atau duplikat).
KOLOM = {
    'OBJECTID': 'id', 'NAMOBJ': 'nama_objek', 'KODZON_1': 'kode_zona', 'NAMZON_1': 'zona',
    'KODSZNTEXT': 'kode_subzona', 'KODUNK': 'kode_unik', 'WADMKK': 'kota', 'WADMKC': 'kecamatan',
    'WADMKD': 'kelurahan', 'KDB': 'kdb', 'KLB': 'klb', 'KTB': 'ktb', 'KDH': 'kdh', 'LUASHA': 'luas_ha',
    'TPZ_00': 'tpz', 'TOD_04': 'tod', 'KRB_03': 'rawan_bencana', 'CAGBUD': 'cagar_budaya',
}
# Kolom daftar kegiatan (versi huruf besar *_1 lebih lengkap: memuat kegiatan tambahan).
KEGIATAN = {'IZN_1': 'diizinkan', 'TBT_1': 'terbatas', 'BST_1': 'bersyarat', 'TBS': 'terbatas_bersyarat'}


def ambil(params):
    url = LAYANAN + '/query?' + urllib.parse.urlencode(params)
    for coba in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as e:  # jaringan putus atau server sibuk: coba lagi dengan jeda makin panjang
            print(f'  gagal ({e}), coba lagi')
            time.sleep(5 * (coba + 1))
    raise RuntimeError('layanan RDTR tidak bisa dijangkau: ' + url)


def halaman(offset):
    berkas = f'{CACHE}/hal_{offset:06d}.json'
    if os.path.exists(berkas):
        with open(berkas, encoding='utf-8') as f:
            return json.load(f)
    d = ambil({
        'where': '1=1', 'outFields': ','.join(list(KOLOM) + list(KEGIATAN)), 'orderByFields': 'OBJECTID',
        'resultOffset': offset, 'resultRecordCount': PER_HALAMAN, 'outSR': 4326, 'geometryPrecision': 6,
        'f': 'geojson',
    })
    if 'features' not in d:
        raise RuntimeError(f'jawaban tak terduga di offset {offset}: {str(d)[:300]}')
    with open(berkas, 'w', encoding='utf-8') as f:
        json.dump(d, f)
    time.sleep(JEDA)
    return d


def bulatkan(c):
    if isinstance(c, (int, float)):
        return round(c, DESIMAL)
    return [bulatkan(x) for x in c]


def bersih(v):
    if v is None:
        return None
    v = str(v).strip()
    return None if v in ('', '-', '0', 'Tidak Ada') else v


def main():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(KELUAR, exist_ok=True)
    total = ambil({'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'})['count']
    print(f'{total} poligon di layanan')

    fitur, kegiatan, id_kegiatan, dibaca, dilewati = [], [], {}, 0, 0
    for offset in range(0, total, PER_HALAMAN):
        d = halaman(offset)
        dibaca += len(d['features'])
        print(f'  {dibaca}/{total}')
        for f in d['features']:
            a = f.get('properties') or {}
            if a.get('KODZON_1') in LEWATI_ZONA:
                dilewati += 1
                continue
            geom = f.get('geometry')
            if geom:
                geom = {'type': geom['type'], 'coordinates': bulatkan(geom['coordinates'])}
            kunci = (a.get('KODSZNTEXT'),) + tuple(bersih(a.get(k)) for k in KEGIATAN)
            if kunci not in id_kegiatan:
                id_kegiatan[kunci] = len(kegiatan) + 1
                kegiatan.append({'id_kegiatan': id_kegiatan[kunci], 'kode_subzona': kunci[0],
                                 **{nama: kunci[i + 1] for i, nama in enumerate(KEGIATAN.values())}})
            prop = {baru: a.get(lama) for lama, baru in KOLOM.items()}
            for k in ('tpz', 'tod', 'rawan_bencana', 'cagar_budaya'):
                prop[k] = bersih(prop[k])
            prop['id_kegiatan'] = id_kegiatan[kunci]
            fitur.append({'type': 'Feature', 'properties': prop, 'geometry': geom})

    if dibaca != total:
        raise RuntimeError(f'jumlah tidak cocok: {dibaca} dari {total}')

    per_kota = {}
    for f in fitur:
        per_kota.setdefault(f['properties']['kota'] or 'Tanpa kota', []).append(f)
    for kota, daftar in per_kota.items():
        nama = kota.lower().replace('kota ', '').replace('kabupaten ', 'kab_').replace('administrasi ', '').replace(' ', '_')
        with gzip.open(f'{KELUAR}/zonasi_{nama}.geojson.gz', 'wt', encoding='utf-8') as g:
            json.dump({'type': 'FeatureCollection', 'features': daftar}, g, ensure_ascii=False, separators=(',', ':'))

    with open(f'{KELUAR}/kegiatan_subzona.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(kegiatan[0]))
        w.writeheader()
        w.writerows(kegiatan)

    zona = {}
    for f in fitur:
        z = f['properties']['zona'] or 'Tanpa zona'
        zona[z] = zona.get(z, 0) + 1
    with open(f'{KELUAR}/ringkasan.json', 'w', encoding='utf-8') as f:
        json.dump({
            'sumber': LAYANAN, 'atribusi': 'Pemprov DKI Jakarta, RDTR WP DKI Jakarta 2022 (Pergub 31/2022)',
            'ditarik': datetime.date.today().isoformat(), 'jumlah_di_layanan': total,
            'dilewati_zona_badan_jalan': dilewati, 'jumlah_poligon': len(fitur), 'desimal_koordinat': DESIMAL,
            'per_kota': {k: len(v) for k, v in sorted(per_kota.items())},
            'per_zona': dict(sorted(zona.items(), key=lambda x: -x[1])), 'jumlah_kombinasi_kegiatan': len(kegiatan),
        }, f, ensure_ascii=False, indent=1)
    print(f'selesai: {len(fitur)} poligon, {len(per_kota)} kota, {len(kegiatan)} kombinasi kegiatan')


if __name__ == '__main__':
    main()
