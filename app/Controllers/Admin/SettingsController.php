<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Libraries\Payments;
use App\Libraries\Settings;

/**
 * Réglages de l'institut : infos, horaires, règles de réservation, acompte, fermetures.
 */
class SettingsController extends BaseController
{
    public function index()
    {
        $out = [];
        foreach (Settings::EDITABLE_KEYS as $k) {
            $out[$k] = Settings::get($k);
        }
        $out['opening_hours'] = Settings::json('opening_hours');

        return $this->ok([
            'settings' => $out,
            'closures' => $this->db->table('closures')->where('end_date >=', date('Y-m-d', strtotime('-30 days')))->orderBy('start_date')->get()->getResultArray(),
            'system'   => [
                'payment_mode' => Payments::isConfigured() ? (str_starts_with((string) env('STRIPE_SECRET_KEY'), 'sk_live') ? 'stripe_live' : 'stripe_test') : (Payments::isSimulated() ? 'simulation' : 'disabled'),
                'webhook'      => (string) env('STRIPE_WEBHOOK_SECRET', '') !== '',
                'smtp'         => (string) env('SMTP_HOST', '') !== '',
                'environment'  => ENVIRONMENT,
                'webhook_url'  => rtrim(base_url(), '/') . '/api/stripe/webhook',
                'cron_url'     => rtrim(base_url(), '/') . '/cron?key=…',
            ],
        ]);
    }

    public function update()
    {
        $in = $this->input();

        if (isset($in['opening_hours'])) {
            $hours = [];
            foreach (range(0, 6) as $d) {
                $hours[(string) $d] = [];
                foreach ((array) ($in['opening_hours'][(string) $d] ?? $in['opening_hours'][$d] ?? []) as $range) {
                    if (is_array($range) && count($range) === 2
                        && preg_match('/^\d{2}:\d{2}$/', $range[0]) && preg_match('/^\d{2}:\d{2}$/', $range[1]) && $range[0] < $range[1]) {
                        $hours[(string) $d][] = [$range[0], $range[1]];
                    }
                }
            }
            $in['opening_hours'] = $hours;
        }

        $ints = ['slot_interval' => [5, 120], 'buffer_min' => [0, 120], 'min_notice_hours' => [0, 720], 'max_advance_days' => [1, 365],
            'capacity' => [1, 20], 'deposit_min_cents' => [0, 100000], 'cancellation_hours' => [0, 720], 'pending_minutes' => [30, 120]];
        foreach ($ints as $k => [$min, $max]) {
            if (isset($in[$k])) {
                $in[$k] = (string) max($min, min($max, (int) $in[$k]));
            }
        }
        if (isset($in['deposit_type']) && ! in_array($in['deposit_type'], ['percent', 'fixed'], true)) {
            unset($in['deposit_type']);
        }
        if (isset($in['deposit_value'])) {
            $in['deposit_value'] = (string) max(0, (float) str_replace(',', '.', (string) $in['deposit_value']));
        }

        foreach (Settings::EDITABLE_KEYS as $k) {
            if (array_key_exists($k, $in)) {
                Settings::set($k, is_array($in[$k]) ? $in[$k] : mb_substr(trim((string) $in[$k]), 0, 2000));
            }
        }

        return $this->index();
    }

    public function addClosure()
    {
        $in = $this->input();
        if ($r = $this->invalid($in, ['start_date' => 'required|valid_date[Y-m-d]', 'end_date' => 'permit_empty|valid_date[Y-m-d]', 'reason' => 'permit_empty|max_length[190]'])) {
            return $r;
        }
        $end = $in['end_date'] ?? '' ?: $in['start_date'];
        if ($end < $in['start_date']) {
            return $this->error('La date de fin doit être après la date de début.', 422);
        }
        $this->db->table('closures')->insert([
            'start_date' => $in['start_date'], 'end_date' => $end, 'reason' => trim((string) ($in['reason'] ?? '')) ?: null,
            'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $conflicts = $this->db->table('bookings')->select('id, reference, first_name, last_name, start_at')
            ->where('start_at >=', $in['start_date'] . ' 00:00:00')->where('start_at <=', $end . ' 23:59:59')
            ->where('status', 'confirmed')->get()->getResultArray();

        return $this->ok(['ok' => true, 'conflicts' => $conflicts], 201);
    }

    public function deleteClosure(int $id)
    {
        $this->db->table('closures')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }
}
