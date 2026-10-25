<?php

namespace App\Controllers\Api;

/*
 * STRIPE DÉSACTIVÉ — webhook de confirmation des paiements.
 * Pour le réactiver : retirer ce commentaire, remettre la route
 * `stripe/webhook` dans app/Config/Routes.php et passer Payments::ENABLED à true.
 *
use App\Controllers\BaseController;
use App\Libraries\BookingService;
use Stripe\Webhook;

/**
 * POST /api/stripe/webhook
 * À déclarer dans Stripe > Développeurs > Webhooks avec les événements :
 *   checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired
 * /
class StripeWebhook extends BaseController
{
    public function handle()
    {
        $secret = (string) env('STRIPE_WEBHOOK_SECRET', '');
        if ($secret === '') {
            return $this->error('Webhook non configuré.', 503);
        }

        try {
            $event = Webhook::constructEvent(
                (string) $this->request->getBody(),
                $this->request->getHeaderLine('Stripe-Signature'),
                $secret
            );
        } catch (\Throwable $e) {
            log_message('warning', 'Webhook Stripe refusé : ' . $e->getMessage());

            return $this->error('Signature invalide.', 400);
        }

        $svc     = new BookingService();
        $session = $event->data->object;
        $id      = (int) ($session->metadata->booking_id ?? 0);

        switch ($event->type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
                if ($id && ($session->payment_status ?? '') === 'paid') {
                    $pi = is_string($session->payment_intent) ? $session->payment_intent : ($session->payment_intent->id ?? null);
                    $svc->markDepositPaid($id, $pi);
                }
                break;

            case 'checkout.session.expired':
                if ($id) {
                    $this->db->table('bookings')->where('id', $id)
                        ->where('status', 'pending_payment')->where('payment_status', 'unpaid')
                        ->update(['status' => 'expired', 'updated_at' => date('Y-m-d H:i:s')]);
                }
                break;
        }

        return $this->ok(['received' => true]);
    }
}

*/
