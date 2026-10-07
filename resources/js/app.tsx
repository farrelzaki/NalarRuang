import '../css/app.css';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

const halaman = import.meta.glob<{ default: ResolvedComponent }>('./Pages/**/*.tsx');

createInertiaApp({
    title: (judul) => (judul ? `${judul} · NalarRuang` : 'NalarRuang'),
    resolve: async (nama) => {
        const muat = halaman[`./Pages/${nama}.tsx`];
        if (!muat) throw new Error(`Halaman tidak ditemukan: ${nama}`);
        return (await muat()).default;
    },
    setup({ el, App, props }) {
        if (!el) return;
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#0f1b3d',
    },
});
