<?php

namespace App\Libraries;

/**
 * Newsletter avec double opt-in (conforme RGPD) et désinscription en un clic.
 */
class NewsletterService
{
    private $db;

    public function __construct()
    {
        $this->db = db_connect();
    }

    /**
     * @return string 'pending' (e-mail de confirmation envoyé) | 'active' | 'already'
     */
    public function subscribe(string $email, ?string $firstName = null, string $source = 'site', bool $alreadyConfirmed = false): string
    {
        $email = strtolower(trim($email));
        $now   = date('Y-m-d H:i:s');
        $sub   = $this->db->table('subscribers')->where('email', $email)->get()->getRowArray();

        if ($sub && $sub['status'] === 'active') {
            return 'already';
        }

        $data = [
            'first_name'      => $firstName ?: ($sub['first_name'] ?? null),
            'status'          => $alreadyConfirmed ? 'active' : 'pending',
            'source'          => $source,
            'confirmed_at'    => $alreadyConfirmed ? $now : null,
            'unsubscribed_at' => null,
            'updated_at'      => $now,
        ];

        if ($sub) {
            $this->db->table('subscribers')->where('id', $sub['id'])->update($data);
            $token = $sub['token'];
        } else {
            $token = random_token(20);
            $this->db->table('subscribers')->insert($data + ['email' => $email, 'token' => $token, 'created_at' => $now]);
        }

        if (! $alreadyConfirmed) {
            Mailer::send($email, 'Confirmez votre inscription à la newsletter', 'newsletter_confirm', [
                'firstName' => $data['first_name'],
                'url'       => rtrim(base_url(), '/') . '/newsletter/confirmation?token=' . $token,
            ]);

            return 'pending';
        }

        return 'active';
    }

    public function confirm(string $token): bool
    {
        $sub = $this->db->table('subscribers')->where('token', $token)->get()->getRowArray();
        if (! $sub) {
            return false;
        }
        if ($sub['status'] !== 'active') {
            $this->db->table('subscribers')->where('id', $sub['id'])->update([
                'status' => 'active', 'confirmed_at' => date('Y-m-d H:i:s'), 'unsubscribed_at' => null, 'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return true;
    }

    public function unsubscribe(string $token): bool
    {
        $sub = $this->db->table('subscribers')->where('token', $token)->get()->getRowArray();
        if (! $sub) {
            return false;
        }
        $this->db->table('subscribers')->where('id', $sub['id'])->update([
            'status' => 'unsubscribed', 'unsubscribed_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return true;
    }

    /**
     * Envoie une campagne à tous les abonnés actifs (ou à une adresse de test).
     */
    public function sendCampaign(array $campaign, ?string $testEmail = null): int
    {
        @set_time_limit(0);
        $site = rtrim(base_url(), '/');
        $html = md_to_html($campaign['content']);

        $recipients = $testEmail
            ? [['email' => $testEmail, 'first_name' => null, 'token' => 'test']]
            : $this->db->table('subscribers')->select('email, first_name, token')->where('status', 'active')->get()->getResultArray();

        $sent = 0;
        foreach ($recipients as $r) {
            $unsub = $site . '/newsletter/desinscription?token=' . $r['token'];
            $ok    = Mailer::send($r['email'], ($testEmail ? '[TEST] ' : '') . $campaign['subject'], 'campaign', [
                'html'       => $html,
                'preheader'  => $campaign['preheader'] ?? '',
                'firstName'  => $r['first_name'],
                'unsubscribe' => $unsub,
            ], null, ['List-Unsubscribe' => '<' . $unsub . '>']);
            $sent += $ok ? 1 : 0;
        }

        return $sent;
    }
}
