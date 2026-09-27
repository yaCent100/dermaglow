<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Protège les routes /api/admin/* : jeton "Bearer" (ou en-tête X-Auth-Token
 * pour les hébergeurs qui suppriment l'en-tête Authorization).
 */
class AdminAuth implements FilterInterface
{
    /** Utilisateur connecté pour la requête en cours */
    public static ?array $user = null;

    public function before(RequestInterface $request, $arguments = null)
    {
        $token = self::tokenFrom($request);
        if ($token) {
            $db  = db_connect();
            $row = $db->table('auth_tokens t')
                ->select('u.id, u.name, u.email, u.role, t.id AS token_id')
                ->join('users u', 'u.id = t.user_id')
                ->where('t.token_hash', hash('sha256', $token))
                ->where('t.expires_at >', date('Y-m-d H:i:s'))
                ->get()->getRowArray();
            if ($row) {
                self::$user = $row;

                return null;
            }
        }

        return Services::response()
            ->setStatusCode(401)
            ->setJSON(['error' => 'Session expirée, merci de vous reconnecter.']);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return null;
    }

    public static function tokenFrom(RequestInterface $request): ?string
    {
        $h = $request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+([a-f0-9]{64})/i', $h, $m)) {
            return $m[1];
        }
        $x = $request->getHeaderLine('X-Auth-Token');

        return preg_match('/^[a-f0-9]{64}$/i', $x) ? $x : null;
    }
}
