/** Klien endpoint docs/SISTEM.md bagian 2. */
import type { CommuteResponse, InspectResponse, LahanRequest, LahanResponse, LayerKey, LayerResponse, Persona, SaranLokasi, SearchResponse } from '@/types';
import type { FeatureCollection } from 'geojson';

async function ambil<T>(url: string, signal?: AbortSignal): Promise<T> {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!r.ok) {
        const isi = await r.json().catch(() => ({}));
        throw new Error(isi.message ?? `Permintaan gagal (${r.status}).`);
    }
    return r.json() as Promise<T>;
}

/** POST JSON; galat 422 membawa pesan yang bisa langsung ditampilkan. */
async function kirim<T>(url: string, badan: unknown, signal?: AbortSignal): Promise<T> {
    const r = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(badan),
        signal,
    });
    if (!r.ok) {
        const isi = await r.json().catch(() => ({}));
        throw new Error(isi.message ?? `Permintaan gagal (${r.status}).`);
    }
    return r.json() as Promise<T>;
}

const qs = (o: Record<string, string | string[] | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) v.forEach((x) => p.append(`${k}[]`, x));
        else p.set(k, String(v));
    }
    return p.toString();
};

export const api = {
    lokasi: (q: string, signal?: AbortSignal) => ambil<{ hasil: SaranLokasi[]; message?: string }>(`/api/lokasi?${qs({ q })}`, signal),
    layer: (k: LayerKey) => ambil<LayerResponse>(`/api/layers/${k}`),
    cari: (q: { q?: string; kota?: string[]; persona: Persona[] }, signal?: AbortSignal) => ambil<SearchResponse>(`/api/search?${qs(q)}`, signal),
    /** Titik + jangkauan waktu tempuh (isochrone, T-056): `mode` pedestrian/bicycle/auto, `minutes` 1–60. */
    titik: (lat: number, lng: number, persona: Persona[], signal?: AbortSignal, iso?: { mode: string; minutes: number }) =>
        ambil<InspectResponse & { isochrone?: FeatureCollection | null }>(`/api/inspect?${qs({ lat, lng, persona, ...(iso ?? {}) })}`, signal),
    wilayah: (id: number, persona: Persona[], signal?: AbortSignal) => ambil<InspectResponse>(`/api/inspect?${qs({ wilayah_id: id, persona })}`, signal),
    /** Area gambar pengguna: titik sudut sebagai "lng,lat;lng,lat;...". */
    area: (sudut: { lat: number; lng: number }[], persona: Persona[], signal?: AbortSignal) =>
        ambil<InspectResponse>(`/api/inspect?${qs({ area: sudut.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';'), persona })}`, signal),
    rute: (a: { lat: number; lng: number }, b: { lat: number; lng: number }, signal?: AbortSignal, lewatTol = true, hargaBbm?: number, hindariGg = false, kendaraan: 'mobil' | 'motor' = 'mobil') =>
        ambil<CommuteResponse>(`/api/commute?${qs({ dari: `${a.lat},${a.lng}`, ke: `${b.lat},${b.lng}`, tol: lewatTol ? undefined : 0, gg: hindariGg ? 1 : undefined, bbm: hargaBbm, kendaraan: kendaraan === 'motor' ? 'motor' : undefined })}`, signal),
    /** Uji Lahan (FR-23). */
    lahan: (badan: LahanRequest, signal?: AbortSignal) => kirim<LahanResponse>('/api/lahan', badan, signal),
};
