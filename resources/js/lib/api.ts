/** Klien endpoint docs/SISTEM.md bagian 2. */
import type { CommuteResponse, InspectResponse, LayerKey, LayerResponse, Persona, SearchResponse } from '@/types';

async function ambil<T>(url: string, signal?: AbortSignal): Promise<T> {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal });
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
    layer: (k: LayerKey) => ambil<LayerResponse>(`/api/layers/${k}`),
    cari: (q: { q?: string; kota?: string[]; persona: Persona[] }, signal?: AbortSignal) => ambil<SearchResponse>(`/api/search?${qs(q)}`, signal),
    titik: (lat: number, lng: number, persona: Persona[], signal?: AbortSignal) => ambil<InspectResponse>(`/api/inspect?${qs({ lat, lng, persona })}`, signal),
    wilayah: (id: number, persona: Persona[], signal?: AbortSignal) => ambil<InspectResponse>(`/api/inspect?${qs({ wilayah_id: id, persona })}`, signal),
    rute: (a: { lat: number; lng: number }, b: { lat: number; lng: number }, signal?: AbortSignal) =>
        ambil<CommuteResponse>(`/api/commute?${qs({ dari: `${a.lat},${a.lng}`, ke: `${b.lat},${b.lng}` })}`, signal),
};
