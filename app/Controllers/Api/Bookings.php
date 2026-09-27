<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Availability;
use App\Libraries\BookingService;
use App\Libraries\Payments;
use RuntimeException;

/**
 * Parcours de réservation côté cliente.
 */
class Bookings extends BaseController
{
    /** GET /api/availability?date=2026-10-02&services=1,4 */
    public function slots()
    {
        $date = (string) $this->request->getGet('date');
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $this->error('Date invalide.');
        }
        try {
            $svc = new BookingService();
            $svc->expireStale();
            $duration = BookingService::totalDuration($svc->loadServices(explode(',', (string) $this->request->getGet('services'))));
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage());
        }

        return $this->ok(['date' => $date, 'duration_min' => $duration, 'slots' => (new Availability())->slotsFor($date, $duration)]);
    }

    /** GET /api/availability/month?month=2026-10&services=1,4 */
    public function month()
    {
        $month = (string) $this->request->getGet('month');
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            return $this->error('Mois invalide.');
        }
        try {
            $svc = new BookingService();
            $svc->expireStale();
            $duration = BookingService::totalDuration($svc->loadServices(explode(',', (string) $this->request->getGet('services'))));
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage());
        }

        return $this->ok(['month' => $month, 'days' => (new Availability())->daysWithSlots($month, $duration)]);
    }

    /** POST /api/bookings : crée le RDV (en attente) et renvoie l'URL de paiement de l'acompte */
    public function create()
    {
        $in = $this->input();
        if ($this->isBot($in)) {
            return $this->error('Requête refusée.', 400);
        }

        if ($r = $this->invalid($in, [
            'services'   => 'required',
            'date'       => 'required|valid_date[Y-m-d]',
            'time'       => 'required|regex_match[/^\d{2}:\d{2}$/]',
            'first_name' => 'required|max_length[80]',
            'last_name'  => 'required|max_length[80]',
            'email'      => 'required|valid_email|max_length[190]',
            'phone'      => 'required|min_length[6]|max_length[40]',
            'notes'      => 'permit_empty|max_length[1000]',
            'accept_terms' => 'required',
        ], [
            'first_name'   => ['required' => 'Votre prénom est requis.'],
            'last_name'    => ['required' => 'Votre nom est requis.'],
            'email'        => ['required' => 'Votre e-mail est requis.', 'valid_email' => 'Adresse e-mail invalide.'],
            'phone'        => ['required' => 'Votre téléphone est requis.', 'min_length' => 'Numéro de téléphone invalide.'],
            'accept_terms' => ['required' => 'Merci d’accepter les conditions de réservation.'],
            'services'     => ['required' => 'Choisissez au moins un soin.'],
            'date'         => ['required' => 'Choisissez une date.'],
            'time'         => ['required' => 'Choisissez un horaire.'],
        ])) {
            return $r;
        }

        $in['services'] = is_array($in['services']) ? $in['services'] : explode(',', (string) $in['services']);

        try {
            $booking = (new BookingService())->create($in);
            $url     = Payments::createCheckout($booking, $booking['items']);
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage(), 409);
        } catch (\Throwable $e) {
            log_message('error', 'Booking create: ' . $e->getMessage());
            if (isset($booking['id'])) {
                $this->db->table('bookings')->where('id', $booking['id'])->update(['status' => 'expired']);
            }

            return $this->error('Le paiement n’a pas pu être initialisé. Merci de réessayer ou de nous appeler.', 502);
        }

        return $this->ok([
            'reference'    => $booking['reference'],
            'token'        => $booking['manage_token'],
            'checkout_url' => $url,
            'booking'      => BookingService::publicView($booking),
        ], 201);
    }

    /** GET /api/bookings/{ref}?t=token[&session_id=cs_...] */
    public function show(string $ref)
    {
        $svc = new BookingService();
        $b   = $this->authorized($ref);
        if (! $b) {
            return $this->error('Rendez-vous introuvable.', 404);
        }

        // Retour de Stripe : on vérifie la session si le webhook n'est pas encore passé
        $sid = (string) $this->request->getGet('session_id');
        if ($b['payment_status'] === 'unpaid' && $sid !== '' && $sid === (string) $b['stripe_session_id']) {
            if ($paid = Payments::sessionIsPaid($sid)) {
                $b = $svc->markDepositPaid((int) $b['id'], $paid['payment_intent']);
            }
        }

        return $this->ok(BookingService::publicView($b));
    }

    /** POST /api/bookings/{ref}/cancel  {t, reason} */
    public function cancel(string $ref)
    {
        $b = $this->authorized($ref);
        if (! $b) {
            return $this->error('Rendez-vous introuvable.', 404);
        }
        try {
            $b = (new BookingService())->cancel((int) $b['id'], 'client', $this->input()['reason'] ?? null);
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage(), 409);
        }

        return $this->ok(BookingService::publicView($b));
    }

    /** POST /api/bookings/{ref}/abandon : la cliente a quitté la page de paiement → on libère le créneau */
    public function abandon(string $ref)
    {
        $b = $this->authorized($ref);
        if ($b && $b['status'] === 'pending_payment' && $b['payment_status'] === 'unpaid') {
            $this->db->table('bookings')->where('id', $b['id'])->update(['status' => 'expired', 'updated_at' => date('Y-m-d H:i:s')]);
        }

        return $this->ok(['ok' => true]);
    }

    /** POST /api/bookings/{ref}/simulate-payment (mode test local uniquement) */
    public function simulate(string $ref)
    {
        if (! Payments::isSimulated()) {
            return $this->error('Indisponible.', 404);
        }
        $b = $this->authorized($ref);
        if (! $b) {
            return $this->error('Rendez-vous introuvable.', 404);
        }
        $b = (new BookingService())->markDepositPaid((int) $b['id'], 'pi_simulated_' . $b['reference']);

        return $this->ok(BookingService::publicView($b));
    }

    private function authorized(string $ref): ?array
    {
        $token = (string) ($this->request->getGet('t') ?? ($this->input()['t'] ?? ''));
        $b     = (new BookingService())->findByReference($ref);

        return ($b && $token !== '' && hash_equals($b['manage_token'], $token)) ? $b : null;
    }
}
