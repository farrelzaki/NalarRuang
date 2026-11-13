/**
 * Gerak landing saat digulir (kelas di gerak.css).
 * 1. Reveal umum: elemen di SASARAN naik dan muncul, saudara satu induk berurutan (--urut).
 * 2. Koreografi per seksi: elemen ber-atribut `data-gerak="..."` hanya diberi `is-terlihat`;
 *    gerakannya (garis tergambar, kipas, foto berkembang, dll.) ditulis di CSS per nilai atribut.
 */
import { useLayoutEffect, type RefObject } from 'react';

const SASARAN = [
    '.ed-sec .ed-title',
    '.ed-sec .ed-eyebrow',
    '.ed-sec .ed-bracket',
    '.ed-sec .ed-intro',
    '.ed-lead-tengah',
    '.ed-sec .ed-body',
    '.ed-feature',
    '.ed-step',
    '.ed-vision > div:first-child',
    '.ed-mission__title',
].join(', ');

export function useScrollReveal(akar: RefObject<HTMLElement | null>, ulang: unknown[] = []) {
    // useLayoutEffect: kelas terpasang sebelum digambar, jadi tidak ada kedip muncul lalu hilang.
    useLayoutEffect(() => {
        const wadah = akar.current;
        if (!wadah || typeof IntersectionObserver === 'undefined') return;
        const el = Array.from(wadah.querySelectorAll<HTMLElement>(SASARAN)).filter((e) => !e.closest('.ed-hero') && !e.closest('[data-gerak]') && !e.classList.contains('ed-reveal'));
        const urut = new Map<Element, number>();
        for (const e of el) {
            const induk = e.parentElement!;
            const i = urut.get(induk) ?? 0;
            urut.set(induk, i + 1);
            e.style.setProperty('--urut', String(Math.min(i, 6)));
            e.classList.add('ed-reveal');
        }
        const koreo = Array.from(wadah.querySelectorAll<HTMLElement>('[data-gerak]'));
        // Penanda bahwa JS aktif: tanpa ini (mis. JS mati) koreografi tidak menyembunyikan apa pun.
        wadah.classList.add('ed-gerak-siap');
        const pengamat = new IntersectionObserver(
            (daftar) => {
                for (const d of daftar) {
                    if (d.isIntersecting) {
                        d.target.classList.add('is-terlihat');
                        pengamat.unobserve(d.target);
                    }
                }
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
        );
        [...el, ...koreo].forEach((e) => pengamat.observe(e));
        return () => pengamat.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, ulang);
}
