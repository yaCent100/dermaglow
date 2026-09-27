<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Psr\Log\LoggerInterface;

/**
 * Contrôleur de base : utilitaires JSON pour l'API.
 */
abstract class BaseController extends Controller
{
    /** @var CLIRequest|IncomingRequest */
    protected $request;

    protected $db;

    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger): void
    {
        parent::initController($request, $response, $logger);
        $this->db = db_connect();
    }

    /** Corps JSON (ou formulaire) de la requête. */
    protected function input(): array
    {
        $json = $this->request->getJSON(true);
        if (is_array($json)) {
            return $json;
        }

        return (array) $this->request->getPost() + (array) $this->request->getRawInput();
    }

    protected function ok($data = [], int $status = 200): ResponseInterface
    {
        return $this->response->setStatusCode($status)->setJSON($data);
    }

    protected function error(string $message, int $status = 400, array $fields = []): ResponseInterface
    {
        $body = ['error' => $message];
        if ($fields) {
            $body['fields'] = $fields;
        }

        return $this->response->setStatusCode($status)->setJSON($body);
    }

    /**
     * Valide $data. Renvoie null si OK, sinon une réponse 422 prête à retourner.
     */
    protected function invalid(array $data, array $rules, array $messages = []): ?ResponseInterface
    {
        $v = Services::validation(null, false);
        $v->setRules($rules, $messages);
        if ($v->run($data)) {
            return null;
        }

        $errors = $v->getErrors();

        return $this->error(reset($errors) ?: 'Données invalides.', 422, $errors);
    }

    /** Pagination simple : [page, perPage, offset] */
    protected function paging(int $default = 12, int $max = 100): array
    {
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $per  = min($max, max(1, (int) ($this->request->getGet('per_page') ?? $default)));

        return [$page, $per, ($page - 1) * $per];
    }

    protected function paginated(array $items, int $total, int $page, int $per): ResponseInterface
    {
        return $this->ok([
            'data' => $items,
            'meta' => ['page' => $page, 'per_page' => $per, 'total' => $total, 'pages' => (int) max(1, ceil($total / $per))],
        ]);
    }

    /** Protection anti-robots : champ caché "website" qui doit rester vide. */
    protected function isBot(array $in): bool
    {
        return ! empty($in['website']);
    }
}
