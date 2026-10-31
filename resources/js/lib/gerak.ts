/** Scroll reveal landing: elemen muncul halus saat masuk layar (kelas di gerak.css). */
import { useLayoutEffect } from 'react';

/** Elemen yang di-reveal; saudara dalam satu induk diberi urutan (--urut) untuk stagger. */
const SASARAN = [
    '.ed-sec .ed-title',
    '.ed-sec .ed-eyebrow',
    '.ed-sec .ed-bracket',
    '.ed-sec .ed-intro',
    '.ed-lead-tengah',
    '.ed-sec .ed-body',
    '.ed-persona-card',
    '.ed-feature',
    '.ed-tile',
    '.ed-step',
    '.ed-col',
    '.ed-logos > span',
    '.ed-faq__item',
    '.ed-vision > *',
    '.ed-mission > *',
    '.ed-try__card',
    '.ed-cta .ed-title',
    '.ed-cta .ed-btn',
].join(', ');

export function useScrollReveal(akar: React.RefObject<HTMLElement | null>, ulang: unknown[] = []) {
    // useLayoutEffect: kelas terpasang sebelum digambar, jadi tidak ada kedip muncul lalu hilang.
    useLayoutEffect(() => {
        const wadah = akar.current;
        if (!wadah || typeof IntersectionObserver === 'undefined') return;
        const el = Array.from(wadah.querySelectorAll<HTMLElement>(SASARAN)).filter((e) => !e.closest('.ed-hero') && !e.classList.contains('ed-reveal'));
        const urut = new Map<Element, number>();
        for (const e of el) {
            const induk = e.parentElement!;
            const i = urut.get(induk) ?? 0;
            urut.set(induk, i + 1);
            e.style.setProperty('--urut', String(Math.min(i, 6)));
            e.classList.add('ed-reveal');
        }
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
        el.forEach((e) => pengamat.observe(e));
        return () => pengamat.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, ulang);
}
