<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Kompres respons JSON API yang besar (layer peta bisa beberapa MB) bila klien menerima gzip.
 * `php artisan serve` tidak mengompres sendiri; di produksi ini boleh diganti kompresi web server.
 */
class KompresiGzip
{
    private const MIN_BYTE = 10_000;

    public function handle(Request $request, Closure $next): Response
    {
        $respons = $next($request);

        if ($respons instanceof BinaryFileResponse || $respons instanceof StreamedResponse
            || $respons->headers->has('Content-Encoding')
            || ! str_contains((string) $request->header('Accept-Encoding'), 'gzip')
            || ! function_exists('gzencode')) {
            return $respons;
        }

        $isi = $respons->getContent();
        if ($isi === false || strlen($isi) < self::MIN_BYTE) {
            return $respons;
        }

        $respons->setContent(gzencode($isi, 6));
        $respons->headers->set('Content-Encoding', 'gzip');
        $respons->headers->set('Vary', 'Accept-Encoding', false);
        $respons->headers->remove('Content-Length');

        return $respons;
    }
}
