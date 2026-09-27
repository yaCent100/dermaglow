<?php

namespace App\Libraries;

use Config\Services;

/**
 * Envoi d'e-mails via SMTP (config .env).
 * Sans SMTP_HOST, les e-mails sont enregistrés dans writable/emails/ (pratique en local).
 */
class Mailer
{
    public static function send(string $to, string $subject, string $view, array $data = [], ?string $replyTo = null, array $headers = []): bool
    {
        $data['subject']  = $subject;
        $data['salon']    = Settings::all();
        $data['siteUrl']  = rtrim(base_url(), '/');
        $html             = view('emails/' . $view, $data);
        $html             = view('emails/layout', $data + ['content' => $html]);

        $host = (string) env('SMTP_HOST', '');
        if ($host === '') {
            return self::saveToDisk($to, $subject, $html);
        }

        $email = Services::email([
            'protocol'   => 'smtp',
            'SMTPHost'   => $host,
            'SMTPUser'   => (string) env('SMTP_USER', ''),
            'SMTPPass'   => (string) env('SMTP_PASS', ''),
            'SMTPPort'   => (int) env('SMTP_PORT', 587),
            'SMTPCrypto' => (string) env('SMTP_CRYPTO', 'tls'),
            'SMTPTimeout' => 10,
            'mailType'   => 'html',
            'charset'    => 'UTF-8',
            'wordWrap'   => false,
        ], false);

        $email->setFrom((string) env('MAIL_FROM', 'no-reply@localhost'), (string) env('MAIL_FROM_NAME', 'DermaGlow'));
        $email->setTo($to);
        if ($replyTo) {
            $email->setReplyTo($replyTo);
        }
        foreach ($headers as $k => $v) {
            $email->setHeader($k, $v);
        }
        $email->setSubject($subject);
        $email->setMessage($html);
        $email->setAltMessage(trim(html_entity_decode(strip_tags(preg_replace('#<(br|/p|/h\d|/li|/tr)[^>]*>#i', "\n", $html)))));

        try {
            $ok = $email->send(false);
            if (! $ok) {
                log_message('error', 'Mailer: échec envoi à {to} – {dbg}', ['to' => $to, 'dbg' => $email->printDebugger(['headers'])]);
            }

            return $ok;
        } catch (\Throwable $e) {
            log_message('error', 'Mailer: ' . $e->getMessage());

            return false;
        }
    }

    public static function admin(string $subject, string $view, array $data = [], ?string $replyTo = null): bool
    {
        $to = (string) env('MAIL_ADMIN', Settings::get('email', ''));

        return $to ? self::send($to, $subject, $view, $data, $replyTo) : false;
    }

    private static function saveToDisk(string $to, string $subject, string $html): bool
    {
        $dir = WRITEPATH . 'emails';
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        helper('text');
        $name = date('Ymd-His') . '-' . substr(md5($to . $subject . microtime()), 0, 6) . '-' . url_title(convert_accented_characters($subject), '-', true) . '.html';
        file_put_contents($dir . DIRECTORY_SEPARATOR . $name, "<!-- To: {$to} -->\n<!-- Subject: {$subject} -->\n" . $html);

        return true;
    }
}
