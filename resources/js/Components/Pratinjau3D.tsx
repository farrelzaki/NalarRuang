/**
 * Kartu pratinjau 3D Uji Lahan (FR-23). Dimuat malas (React.lazy) bersama three.js; adegan three.js ada di Map/Lahan3D.
 * Kartu mengambang di atas peta, jadi lahan dan zona tetap bisa ditarik dan 3D ikut berubah.
 */
import { useEffect, useRef, useState } from 'react';
import type { Polygon } from 'geojson';
import type { LahanResponse } from '@/types';
import { buatAdegan, type Adegan3D } from '@/Map/Lahan3D';
import { useBahasa } from '@/lib/bahasa';
import { Ikon } from './Dasar';

type Props = { data: LahanResponse; lahan: Polygon | null; onTutup: () => void };

export default function Pratinjau3D({ data, lahan, onTutup }: Props) {
    const { t, bahasa } = useBahasa();
    const wadah = useRef<HTMLDivElement | null>(null);
    const adegan = useRef<Adegan3D | null>(null);
    const [galat, setGalat] = useState(false);

    useEffect(() => {
        if (!wadah.current) return;
        try {
            adegan.current = buatAdegan(wadah.current, data, lahan);
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
        adegan.current?.perbarui(data, lahan);
    }, [data, lahan]);

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
