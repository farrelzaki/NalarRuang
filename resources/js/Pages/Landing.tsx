import { Head, Link } from '@inertiajs/react';

/** Landing page (FR-22, UI06). Kerangka setup; seksi lengkap menyusul dari design-system.md bagian 10. */
export default function Landing() {
    return (
        <>
            <Head title="Hunian yang cocok. Kota yang terbaca." />
            <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-stone-50 px-6 text-center">
                <p className="font-sans text-xl font-bold">
                    Nalar<span className="font-fraunces font-wonk italic">Ruang</span>
                </p>
                <h1 className="font-fraunces font-wonk text-5xl text-navy-ink">
                    Hunian yang cocok.
                    <br />
                    Kota yang terbaca.
                </h1>
                <p className="max-w-md font-inter text-ink-70">
                    Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif.
                </p>
                <Link
                    href="/peta"
                    className="rounded-full bg-navy-900 px-6 py-3 font-inter text-sm font-bold tracking-wider text-white uppercase"
                >
                    Menuju Peta
                </Link>
            </main>
        </>
    );
}
