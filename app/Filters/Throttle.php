<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Limite le nombre de requêtes sensibles (formulaires, connexion) par adresse IP.
 * Usage dans les routes : ['filter' => 'throttle:10,60']  (10 requêtes / 60 s)
 */
class Throttle implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $max    = (int) ($arguments[0] ?? 20);
        $period = (int) ($arguments[1] ?? 60);
        $key    = 'thr_' . md5($request->getIPAddress() . '|' . $request->getUri()->getPath());

        if (Services::throttler()->check($key, $max, $period) === false) {
            return Services::response()->setStatusCode(429)
                ->setJSON(['error' => 'Trop de tentatives. Merci de patienter une minute.']);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }
}
