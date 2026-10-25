<?php

namespace App\Libraries;

use RuntimeException;

/**
 * Logique métier des rendez-vous : création, confirmation après paiement,
 * annulation, expiration des paiements abandonnés.
 */
class BookingService
{
    private $db;

    public function __construct()
    {
        $this->db = db_connect();
    }

    /** Libère les créneaux dont le paiement n'a pas abouti à temps. */
    public function expireStale(): int
    {
        $this->db->table('bookings')
            ->where('status', 'pending_payment')
            ->where('expires_at <', date('Y-m-d H:i:s'))
            ->update(['status' => 'expired', 'updated_at' => date('Y-m-d H:i:s')]);

        return $this->db->affectedRows();
    }

    /**
     * Charge les soins demandés (actifs) dans l'ordre fourni.
     *
     * @return list<array>
     */
    public function loadServices(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === [] || count($ids) > 6) {
            throw new RuntimeException('Sélectionnez entre 1 et 6 soins.');
        }
        $rows = $this->db->table('services')->whereIn('id', $ids)->where('is_active', 1)->get()->getResultArray();
        if (count($rows) !== count($ids)) {
            throw new RuntimeException('Un des soins sélectionnés n’est plus disponible.');
        }
        $byId = array_column($rows, null, 'id');

        return array_map(static fn ($id) => $byId[$id], $ids);
    }

    public static function totalDuration(array $services): int
    {
        return array_sum(array_map(static fn ($s) => (int) $s['duration_min'], $services));
    }

    /**
     * Crée une réservation.
     *
     * @param array{services:array, date:string, time:string, first_name:string, last_name:string, email:string, phone:string, notes?:string, newsletter?:bool} $in
     * @param bool $byAdmin  Réservation saisie par l'institut (pas d'acompte en ligne)
     */
    public function create(array $in, bool $byAdmin = false): array
    {
        $this->expireStale();

        $services = $this->loadServices($in['services']);
        $duration = self::totalDuration($services);
        $total    = array_sum(array_column($services, 'price_cents'));
        $deposit  = Settings::depositFor($services);

        // Sans paiement en ligne (Stripe désactivé), le RDV est confirmé tout de suite
        // et tout se règle sur place.
        $direct = $byAdmin || ! Payments::enabled();

        $this->db->transBegin();
        try {
            // Vérification du créneau à l'intérieur de la transaction
            if (! $byAdmin && ! (new Availability())->isFree($in['date'], $in['time'], $duration)) {
                throw new RuntimeException('Ce créneau vient d’être réservé. Merci d’en choisir un autre.');
            }

            $start = date('Y-m-d H:i:s', strtotime($in['date'] . ' ' . $in['time']));
            $end   = date('Y-m-d H:i:s', strtotime($start . " +{$duration} minutes"));
            $now   = date('Y-m-d H:i:s');

            $row = [
                'reference'        => $this->newReference(),
                'manage_token'     => random_token(20),
                'first_name'       => trim($in['first_name']),
                'last_name'        => trim($in['last_name']),
                'email'            => strtolower(trim($in['email'])),
                'phone'            => trim($in['phone']),
                'notes'            => trim((string) ($in['notes'] ?? '')) ?: null,
                'start_at'         => $start,
                'end_at'           => $end,
                'total_cents'      => $total,
                'deposit_cents'    => $direct ? 0 : $deposit,
                'status'           => $direct ? 'confirmed' : 'pending_payment',
                'payment_status'   => 'unpaid',
                'source'           => $byAdmin ? 'admin' : 'web',
                'newsletter_optin' => ! empty($in['newsletter']) ? 1 : 0,
                'expires_at'       => $direct ? null : date('Y-m-d H:i:s', strtotime('+' . max(30, Settings::int('pending_minutes', 30)) . ' minutes')),
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
            $this->db->table('bookings')->insert($row);
            $row['id'] = (int) $this->db->insertID();

            foreach ($services as $s) {
                $this->db->table('booking_items')->insert([
                    'booking_id'   => $row['id'],
                    'service_id'   => $s['id'],
                    'service_name' => $s['name'],
                    'price_cents'  => $s['price_cents'],
                    'duration_min' => $s['duration_min'],
                ]);
            }
            $this->db->transCommit();
        } catch (\Throwable $e) {
            $this->db->transRollback();

            throw $e instanceof RuntimeException ? $e : new RuntimeException('La réservation n’a pas pu être enregistrée.', 0, $e);
        }

        if ($byAdmin && ! empty($in['send_email'])) {
            $this->sendConfirmation($row['id']);
        } elseif (! $byAdmin && ! Payments::enabled()) {
            // Réservation en ligne sans paiement : confirmation immédiate
            if (! empty($in['newsletter'])) {
                (new NewsletterService())->subscribe($row['email'], $row['first_name'], 'booking', true);
            }
            $this->sendConfirmation($row['id']);
        }

        return $this->find($row['id']);
    }

    /**
     * Marque l'acompte comme payé et confirme le RDV (idempotent).
     */
    public function markDepositPaid(int $bookingId, ?string $paymentIntent = null): ?array
    {
        $b = $this->find($bookingId);
        if (! $b) {
            return null;
        }
        if ($b['payment_status'] !== 'unpaid') {
            return $b; // déjà traité
        }

        $wasExpired = in_array($b['status'], ['expired', 'cancelled'], true);
        $this->db->table('bookings')->where('id', $bookingId)->update([
            'status'                => 'confirmed',
            'payment_status'        => 'deposit_paid',
            'stripe_payment_intent' => $paymentIntent ?: $b['stripe_payment_intent'],
            'deposit_paid_at'       => date('Y-m-d H:i:s'),
            'expires_at'            => null,
            'updated_at'            => date('Y-m-d H:i:s'),
        ]);

        if ($b['newsletter_optin']) {
            (new NewsletterService())->subscribe($b['email'], $b['first_name'], 'booking', true);
        }

        $this->sendConfirmation($bookingId);
        if ($wasExpired) {
            // Paiement reçu après expiration : on confirme quand même, mais on prévient l'institut.
            log_message('warning', "Acompte reçu après expiration pour {$b['reference']} – vérifier le planning.");
        }

        return $this->find($bookingId);
    }

    public function sendConfirmation(int $bookingId): void
    {
        $b = $this->find($bookingId);
        Mailer::send($b['email'], 'Votre rendez-vous est confirmé – ' . fr_date($b['start_at'], true), 'booking_confirmed', ['b' => $b]);
        Mailer::admin('Nouveau RDV : ' . $b['first_name'] . ' ' . $b['last_name'] . ' – ' . fr_date($b['start_at'], true), 'booking_admin', ['b' => $b], $b['email']);
    }

    /**
     * Annulation. Rembourse l'acompte si l'annulation respecte le délai (ou si l'institut annule).
     */
    public function cancel(int $bookingId, string $by = 'client', ?string $reason = null, ?bool $refund = null): array
    {
        $b = $this->find($bookingId);
        if (! $b || ! in_array($b['status'], ['confirmed', 'pending_payment'], true)) {
            throw new RuntimeException('Ce rendez-vous ne peut plus être annulé.');
        }

        $hoursLeft = (strtotime($b['start_at']) - time()) / 3600;
        $inTime    = $hoursLeft >= Settings::int('cancellation_hours', 48);
        if ($by === 'client' && $hoursLeft < 0) {
            throw new RuntimeException('Ce rendez-vous est déjà passé.');
        }
        $doRefund = $refund ?? ($by === 'salon' || $inTime);

        $refunded = 0;
        if ($doRefund && $b['payment_status'] === 'deposit_paid') {
            try {
                $refunded = Payments::refund($b);
            } catch (\Throwable $e) {
                log_message('error', 'Refund ' . $b['reference'] . ': ' . $e->getMessage());
            }
        }

        $this->db->table('bookings')->where('id', $bookingId)->update([
            'status'         => 'cancelled',
            'cancelled_at'   => date('Y-m-d H:i:s'),
            'cancel_reason'  => $reason ? mb_substr($reason, 0, 250) : ($by === 'client' ? 'Annulé par la cliente' : 'Annulé par l’institut'),
            'refunded_cents' => $refunded,
            'payment_status' => $refunded > 0 ? 'refunded' : $b['payment_status'],
            'updated_at'     => date('Y-m-d H:i:s'),
        ]);

        $b = $this->find($bookingId);
        if ($b['deposit_paid_at'] || $by === 'salon') {
            Mailer::send($b['email'], 'Annulation de votre rendez-vous du ' . fr_date($b['start_at']), 'booking_cancelled', ['b' => $b, 'by' => $by, 'inTime' => $inTime]);
        }
        if ($by === 'client') {
            Mailer::admin('RDV annulé : ' . $b['first_name'] . ' ' . $b['last_name'] . ' – ' . fr_date($b['start_at'], true), 'booking_admin', ['b' => $b, 'cancelled' => true], $b['email']);
        }

        return $b;
    }

    public function find(int $id): ?array
    {
        $b = $this->db->table('bookings')->where('id', $id)->get()->getRowArray();

        return $b ? $this->hydrate($b) : null;
    }

    public function findByReference(string $ref): ?array
    {
        $b = $this->db->table('bookings')->where('reference', strtoupper($ref))->get()->getRowArray();

        return $b ? $this->hydrate($b) : null;
    }

    public function hydrate(array $b): array
    {
        $b['items']          = $this->db->table('booking_items')->where('booking_id', $b['id'])->get()->getResultArray();
        $b['balance_cents']  = max(0, (int) $b['total_cents'] - ($b['payment_status'] === 'deposit_paid' ? (int) $b['deposit_cents'] : 0));
        $b['duration_min']   = (int) round((strtotime($b['end_at']) - strtotime($b['start_at'])) / 60);
        $b['can_cancel']     = in_array($b['status'], ['confirmed'], true) && strtotime($b['start_at']) > time();
        $b['refund_if_cancel'] = $b['can_cancel'] && ((strtotime($b['start_at']) - time()) / 3600) >= Settings::int('cancellation_hours', 48);

        return $b;
    }

    /** Version sans données internes, pour la cliente. */
    public static function publicView(array $b): array
    {
        $keep = ['reference', 'first_name', 'last_name', 'email', 'phone', 'notes', 'start_at', 'end_at', 'total_cents', 'deposit_cents',
            'balance_cents', 'status', 'payment_status', 'items', 'duration_min', 'can_cancel', 'refund_if_cancel', 'refunded_cents', 'expires_at'];
        $out = array_intersect_key($b, array_flip($keep));
        $out['items'] = array_map(static fn ($i) => array_intersect_key($i, array_flip(['service_id', 'service_name', 'price_cents', 'duration_min'])), $b['items']);

        return $out;
    }

    private function newReference(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $ref = 'DG-';
            for ($i = 0; $i < 6; $i++) {
                $ref .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while ($this->db->table('bookings')->where('reference', $ref)->countAllResults() > 0);

        return $ref;
    }
}
