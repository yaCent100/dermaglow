<?php

namespace App\Libraries;

use Stripe\StripeClient;

/**
 * Paiement de l'acompte avec Stripe Checkout.
 *
 * Sans clé STRIPE_SECRET_KEY et en environnement "development",
 * un mode simulé permet de tester tout le parcours sans Stripe.
 */
class Payments
{
    public static function isSimulated(): bool
    {
        return trim((string) env('STRIPE_SECRET_KEY', '')) === '' && ENVIRONMENT !== 'production';
    }

    public static function isConfigured(): bool
    {
        return trim((string) env('STRIPE_SECRET_KEY', '')) !== '';
    }

    public static function client(): StripeClient
    {
        return new StripeClient((string) env('STRIPE_SECRET_KEY'));
    }

    /**
     * Crée la session de paiement et renvoie l'URL de redirection.
     */
    public static function createCheckout(array $booking, array $items): string
    {
        $site = rtrim(base_url(), '/');

        if (self::isSimulated()) {
            return $site . '/reservation/paiement-test?ref=' . $booking['reference'] . '&t=' . $booking['manage_token'];
        }
        if (! self::isConfigured()) {
            throw new \RuntimeException('Le paiement en ligne n’est pas encore configuré.');
        }

        $names   = implode(', ', array_column($items, 'service_name'));
        $minutes = max(30, Settings::int('pending_minutes', 30));

        $session = self::client()->checkout->sessions->create([
            'mode'                => 'payment',
            'customer_email'      => $booking['email'],
            'client_reference_id' => $booking['reference'],
            'locale'              => 'fr',
            'line_items'          => [[
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => 'eur',
                    'unit_amount'  => (int) $booking['deposit_cents'],
                    'product_data' => [
                        'name'        => 'Acompte – ' . Settings::get('salon_name', 'DermaGlow'),
                        'description' => mb_strimwidth($names . ' · ' . fr_date($booking['start_at'], true), 0, 480, '…'),
                    ],
                ],
            ]],
            'metadata'            => ['booking_id' => (string) $booking['id'], 'reference' => $booking['reference']],
            'payment_intent_data' => [
                'description' => 'Acompte RDV ' . $booking['reference'],
                'metadata'    => ['booking_id' => (string) $booking['id'], 'reference' => $booking['reference']],
            ],
            'expires_at'  => time() + $minutes * 60 + 60,
            'success_url' => $site . '/reservation/confirmation?ref=' . $booking['reference'] . '&t=' . $booking['manage_token'] . '&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'  => $site . '/reservation/confirmation?ref=' . $booking['reference'] . '&t=' . $booking['manage_token'] . '&cancelled=1',
        ]);

        db_connect()->table('bookings')->where('id', $booking['id'])->update(['stripe_session_id' => $session->id]);

        return $session->url;
    }

    /**
     * Vérifie directement auprès de Stripe si la session est payée
     * (filet de sécurité si le webhook arrive en retard).
     */
    public static function sessionIsPaid(string $sessionId): ?array
    {
        if (! self::isConfigured() || $sessionId === '') {
            return null;
        }
        try {
            $s = self::client()->checkout->sessions->retrieve($sessionId);
            if ($s->payment_status === 'paid') {
                return ['payment_intent' => is_string($s->payment_intent) ? $s->payment_intent : ($s->payment_intent->id ?? null), 'reference' => $s->client_reference_id];
            }
        } catch (\Throwable $e) {
            log_message('error', 'Stripe retrieve: ' . $e->getMessage());
        }

        return null;
    }

    /** Remboursement (total ou partiel) de l'acompte. Renvoie le montant remboursé. */
    public static function refund(array $booking, ?int $amountCents = null): int
    {
        $amount = $amountCents ?? (int) $booking['deposit_cents'];
        if ($amount <= 0) {
            return 0;
        }
        if (self::isSimulated() || empty($booking['stripe_payment_intent'])) {
            return self::isSimulated() ? $amount : 0;
        }
        self::client()->refunds->create([
            'payment_intent' => $booking['stripe_payment_intent'],
            'amount'         => $amount,
        ]);

        return $amount;
    }
}
