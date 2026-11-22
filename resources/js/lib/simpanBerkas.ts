/** Simpan Blob sebagai unduhan peramban (tautan sementara). Satu-satunya tempat yang membuat unduhan berkas Uji Lahan. */
export function simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Beri waktu peramban memulai unduhan sebelum alamat sementara dicabut.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
