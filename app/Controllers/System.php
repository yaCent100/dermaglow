<?php

namespace App\Controllers;

use App\Libraries\BookingService;
use App\Libraries\Mailer;
use CodeIgniter\Database\MigrationRunner;
use Config\Services;

/**
 * Installation en ligne (hébergeurs sans SSH) et tâches planifiées (cron web).
 */
class System extends BaseController
{
    /** GET /install?key=INSTALL_KEY : crée les tables et les données de départ */
    public function install()
    {
        $key = (string) env('INSTALL_KEY', '');
        if ($key === '' || ! hash_equals($key, (string) $this->request->getGet('key'))) {
            return $this->response->setStatusCode(404)->setBody('Not found');
        }

        $out = [];
        try {
            /** @var MigrationRunner $migrate */
            $migrate = Services::migrations();
            $migrate->setNamespace('App')->latest();
            $out[] = '✔ Tables créées / mises à jour';

            $seeder = \Config\Database::seeder();
            $seeder->setSilent(true)->call('DermaglowSeeder');
            $out[] = '✔ Données de départ (soins, réglages, compte admin)';

            foreach ([WRITEPATH . 'emails', FCPATH . 'uploads'] as $dir) {
                if (! is_dir($dir)) {
                    @mkdir($dir, 0755, true);
                }
            }
            $out[] = '✔ Dossiers prêts';
            $out[] = '';
            $out[] = 'Terminé ! Connectez-vous sur /admin avec ADMIN_EMAIL / ADMIN_PASSWORD.';
            $out[] = 'IMPORTANT : videz maintenant INSTALL_KEY dans le fichier .env.';
        } catch (\Throwable $e) {
            $out[] = '✘ Erreur : ' . $e->getMessage();
        }

        return $this->response->setContentType('text/plain; charset=utf-8')->setBody(implode("\n", $out));
    }

    /**
     * GET /cron?key=CRON_KEY – à appeler toutes les heures (ex. cron-job.org, gratuit).
     * Libère les paiements abandonnés, envoie les rappels J-1.
     */
    public function cron()
    {
        $key = (string) env('CRON_KEY', '');
        if (! is_cli() && ($key === '' || ! hash_equals($key, (string) $this->request->getGet('key')))) {
            return $this->response->setStatusCode(404)->setBody('Not found');
        }

        return $this->response->setJSON(self::runTasks());
    }

    public static function runTasks(): array
    {
        $db      = db_connect();
        $svc     = new BookingService();
        $expired = $svc->expireStale();

        // Rappels pour les RDV dans 20 à 30 heures
        $rows = $db->table('bookings')->where('status', 'confirmed')->where('reminder_sent_at IS NULL')
            ->where('start_at >=', date('Y-m-d H:i:s', strtotime('+20 hours')))
            ->where('start_at <=', date('Y-m-d H:i:s', strtotime('+30 hours')))
            ->where('email !=', '')
            ->get()->getResultArray();
        $sent = 0;
        foreach ($rows as $r) {
            $b = $svc->find((int) $r['id']);
            if (Mailer::send($b['email'], 'Rappel : votre rendez-vous ' . fr_date($b['start_at'], true), 'booking_reminder', ['b' => $b])) {
                $db->table('bookings')->where('id', $b['id'])->update(['reminder_sent_at' => date('Y-m-d H:i:s')]);
                $sent++;
            }
        }
        $db->table('auth_tokens')->where('expires_at <', date('Y-m-d H:i:s'))->delete();

        return ['expired' => $expired, 'reminders' => $sent, 'at' => date('c')];
    }
}
