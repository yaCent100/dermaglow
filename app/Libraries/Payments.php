<?php

namespace App\Libraries;

// use Stripe\StripeClient; // STRIPE DÉSACTIVÉ

/**
 * Paiement en ligne (acompte Stripe) — ACTUELLEMENT DÉSACTIVÉ.
 *
 * Les rendez-vous sont confirmés immédiatement, sans paiement :
 * tout se règle sur place.
 *
 * Pour réactiver Stripe plus tard :
 *   1. Passer ENABLED à true ci-dessous.
 *   2. Décommenter le code marqué « STRIPE DÉSACTIVÉ » dans ce fichier
 *      (et la ligne `use Stripe\StripeClient;` en haut).
 *   3. Décommenter la route du webhook dans app/Config/Routes.php
 *      et le contenu de app/Controllers/Api/StripeWebhook.php.
 *   4. Remplir STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET dans le .env.
 */
class Payments
{
    /** Interrupteur général du paiement en ligne. */
    public const ENABLED = false;

    public static function enabled(): bool
    {
        return self::ENABLED;
    }

    public static function isSimulated(): bool
    {
        return self::ENABLED && trim((string) env('STRIPE_SECRET_KEY', '')) === '' && ENVIRONMENT !== 'production';
    }

    public static function isConfigured(): bool
    {
        return self::ENABLED && trim((string) env('STRIPE_SECRET_KEY', '')) !== '';
    }

    /* STRIPE DÉSACTIVÉ
    public static function client(): StripeClient
    {
        return new StripeClient((string) env('STRIPE_SECRET_KEY'));
    }
    */

    /**
     * Crée la session de paiement et renvoie l'URL de redirection.
     * Paiement désactivé : renvoie directement la page de confirmation.
     */
    public static function createCheckout(array $booking, array $items): string
    {
        $site = rtrim(base_url(), '/');

        if (! self::ENABLED) {
            return $site . '/reservation/confirmation?ref=' . $booking['reference'] . '&t=' . $booking['manage_token'];
        }

        /* STRIPE DÉSACTIVÉ
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
        */

        return $site . '/reservation/confirmation?ref=' . $booking['reference'] . '&t=' . $booking['manage_token'];
    }

    /**
     * Vérifie auprès de Stripe si la session est payée.
     * Paiement désactivé : toujours null.
     */
    public static function sessionIsPaid(string $sessionId): ?array
    {
        if (! self::isConfigured() || $sessionId === '') {
            return null;
        }

        /* STRIPE DÉSACTIVÉ
        try {
            $s = self::client()->checkout->sessions->retrieve($sessionId);
            if ($s->payment_status === 'paid') {
                return ['payment_intent' => is_string($s->payment_intent) ? $s->payment_intent : ($s->payment_intent->id ?? null), 'reference' => $s->client_reference_id];
            }
        } catch (\Throwable $e) {
            log_message('error', 'Stripe retrieve: ' . $e->getMessage());
        }
        */

        return null;
    }

    /**
     * Remboursement de l'acompte. Paiement désactivé : rien à rembourser.
     */
    public static function refund(array $booking, ?int $amountCents = null): int
    {
        if (! self::ENABLED) {
            return 0;
        }

        /* STRIPE DÉSACTIVÉ
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
        */

        return 0;
    }
}
