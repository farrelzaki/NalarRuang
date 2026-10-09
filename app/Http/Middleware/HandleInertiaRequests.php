<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Template akar yang dimuat pada kunjungan halaman pertama.
     */
    protected $rootView = 'app';

    /**
     * Versi aset untuk memaksa muat ulang saat build berubah.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props yang dibagikan ke semua halaman. Jangan menaruh preferensi persona di sini:
     * persona hanya hidup di sessionStorage klien (CLAUDE.md aturan 2).
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'nama' => config('app.name'),
        ];
    }
}
