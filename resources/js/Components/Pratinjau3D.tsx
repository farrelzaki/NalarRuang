/**
 * Kartu pratinjau 3D Uji Lahan (FR-23). Dimuat malas (React.lazy) bersama three.js; adegan three.js ada di Map/Lahan3D.
 * Kartu mengambang di atas peta, jadi lahan dan zona tetap bisa ditarik dan 3D ikut berubah.
 */
import { useEffect, useRef, useState } from 'react';
import type { Polygon } from 'geojson';
import type { LahanResponse } from '@/types';
import { buatAdegan, type Adegan3D } from '@/Map/Lahan3D';
import type { Gaya3D } from '@/lib/ekstrusi3d';
import { useBahasa } from '@/lib/bahasa';
import { Ikon } from './Dasar';

/** `onGaya` null = pilihan gaya tidak ditampilkan (rumah selalu berbentuk rumah). */
type Props = { data: LahanResponse; lahan: Polygon | null; gaya: Gaya3D; onGaya: ((g: Gaya3D) => void) | null; onTutup: () => void };

export default function Pratinjau3D({ data, lahan, gaya, onGaya, onTutup }: Props) {
    const { t, bahasa } = useBahasa();
    const wadah = useRef<HTMLDivElement | null>(null);
    const adegan = useRef<Adegan3D | null>(null);
    const [galat, setGalat] = useState(false);

    useEffect(() => {
        if (!wadah.current) return;
        try {
            adegan.current = buatAdegan(wadah.current, data, lahan, gaya);
        } catch {
            // Peramban tanpa WebGL: tampilkan pesan, peta tetap jalan.
            setGalat(true);
        }
        return () => {
            adegan.current?.hancurkan();
            adegan.current = null;
        };
        // Adegan dibuat sekali; perubahan data lewat perbarui() supaya sudut kamera tidak kembali ke awal.
    }, []);

    useEffect(() => {
        adegan.current?.perbarui(data, lahan, gaya);
    }, [data, lahan, gaya]);

    const k = data.kapasitas;
    const tinggi = data.ringkasan?.tinggi_m ?? 0;
    const angka = (n: number) => n.toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID', { maximumFractionDigits: 1 });

    return (
        <section className="nr-3d" aria-label={t('Pratinjau 3D lahan', '3D site preview')}>
            <header className="nr-3d__kepala">
                <b>3D</b>
                <span>
                    {t(`${k.lantai} lantai · ±${angka(tinggi)} m · ${angka(k.jumlah)} ${k.satuan}`, `${k.lantai} floors · ±${angka(tinggi)} m · ${angka(k.jumlah)} ${k.satuan === 'rumah' ? 'houses' : k.satuan === 'kamar' ? 'rooms' : 'units'}`)}
                </span>
                {onGaya && <PilihGaya3D gaya={gaya} onGaya={onGaya} />}
                <button type="button" className="nr-iconbtn" onClick={onTutup} aria-label={t('Tutup 3D', 'Close 3D')}>
                    <Ikon name="x" size={16} />
                </button>
            </header>
            <div ref={wadah} className="nr-3d__kanvas" />
            {galat ? (
                <p className="nr-3d__catatan">{t('Peramban ini tidak mendukung WebGL, jadi tampilan 3D tidak bisa dibuka.', 'This browser does not support WebGL, so the 3D view cannot open.')}</p>
            ) : (
                <p className="nr-3d__catatan">{t('Seret untuk memutar, gulir untuk zoom, klik kanan untuk menggeser. Tinggi dari jumlah lantai × 3,2–3,5 m.', 'Drag to orbit, scroll to zoom, right-drag to pan. Height = floors × 3.2–3.5 m.')}</p>
            )}
        </section>
    );
}

/** Pilihan gaya 3D kos/apartemen: bentuk gedung sungguhan atau warna per tipe unit. Dipakai kartu 3D dan bilah alat peta. */
export function PilihGaya3D({ gaya, onGaya }: { gaya: Gaya3D; onGaya: (g: Gaya3D) => void }) {
    const { t } = useBahasa();
    const pilihan: { kunci: Gaya3D; label: [string, string]; ket: [string, string] }[] = [
        { kunci: 'realistis', label: ['Realistis', 'Realistic'], ket: ['Bentuk gedung: dinding, jendela, atap', 'Building look: walls, windows, roof'] },
        { kunci: 'warna', label: ['Warna unit', 'Unit colours'], ket: ['Warna per tipe unit (studio, 1 kamar, 2 kamar)', 'Colour by unit type (studio, 1-bed, 2-bed)'] },
    ];
    return (
        <span className="nr-gaya3d" role="radiogroup" aria-label={t('Gaya 3D', '3D style')}>
            {pilihan.map((p) => (
                <button key={p.kunci} type="button" role="radio" aria-checked={gaya === p.kunci} title={t(p.ket[0], p.ket[1])} onClick={() => onGaya(p.kunci)}>
                    {t(p.label[0], p.label[1])}
                </button>
            ))}
        </span>
    );
}
