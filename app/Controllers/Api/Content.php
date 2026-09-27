<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\BookingService;
use App\Libraries\Mailer;
use App\Libraries\NewsletterService;

/**
 * Blog, newsletter, avis et contact (côté public).
 */
class Content extends BaseController
{
    // ------------------------------------------------------------------ Blog

    public function posts()
    {
        [$page, $per, $offset] = $this->paging(9, 30);
        $b = $this->db->table('posts')
            ->select('id, title, slug, category, excerpt, cover_image, reading_minutes, author_name, published_at, is_featured')
            ->where('status', 'published')->where('published_at <=', date('Y-m-d H:i:s'));

        if ($cat = $this->request->getGet('category')) {
            $b->where('category', $cat);
        }
        if ($q = trim((string) $this->request->getGet('q'))) {
            $b->groupStart()->like('title', $q)->orLike('excerpt', $q)->orLike('content', $q)->groupEnd();
        }

        $total = $b->countAllResults(false);
        $items = $b->orderBy('published_at', 'DESC')->limit($per, $offset)->get()->getResultArray();

        return $this->paginated($items, $total, $page, $per);
    }

    public function categories()
    {
        $rows = $this->db->table('posts')->select('category, COUNT(*) AS n')
            ->where('status', 'published')->where('published_at <=', date('Y-m-d H:i:s'))->where('category IS NOT NULL')
            ->groupBy('category')->orderBy('category')->get()->getResultArray();

        return $this->ok($rows);
    }

    public function post(string $slug)
    {
        $p = $this->db->table('posts')->where('slug', $slug)->where('status', 'published')
            ->where('published_at <=', date('Y-m-d H:i:s'))->get()->getRowArray();
        if (! $p) {
            return $this->error('Article introuvable.', 404);
        }
        $this->db->table('posts')->where('id', $p['id'])->set('views', 'views + 1', false)->update();

        $p['related'] = $this->db->table('posts')
            ->select('title, slug, category, excerpt, cover_image, reading_minutes, published_at')
            ->where('status', 'published')->where('published_at <=', date('Y-m-d H:i:s'))->where('id !=', $p['id'])
            ->orderBy('category = ' . $this->db->escape($p['category'] ?? ''), 'DESC', false)
            ->orderBy('published_at', 'DESC')->limit(3)->get()->getResultArray();
        unset($p['views']);

        return $this->ok($p);
    }

    // ------------------------------------------------------------ Newsletter

    public function subscribe()
    {
        $in = $this->input();
        if ($this->isBot($in)) {
            return $this->ok(['status' => 'pending']);
        }
        if ($r = $this->invalid($in, [
            'email'      => 'required|valid_email|max_length[190]',
            'first_name' => 'permit_empty|max_length[80]',
            'consent'    => 'required',
        ], [
            'email'   => ['required' => 'Votre e-mail est requis.', 'valid_email' => 'Adresse e-mail invalide.'],
            'consent' => ['required' => 'Merci de cocher la case de consentement.'],
        ])) {
            return $r;
        }

        $status = (new NewsletterService())->subscribe($in['email'], $in['first_name'] ?? null, $in['source'] ?? 'site');

        return $this->ok(['status' => $status]);
    }

    public function confirm()
    {
        $ok = (new NewsletterService())->confirm((string) ($this->input()['token'] ?? ''));

        return $ok ? $this->ok(['status' => 'active']) : $this->error('Lien invalide ou expiré.', 404);
    }

    public function unsubscribe()
    {
        $ok = (new NewsletterService())->unsubscribe((string) ($this->input()['token'] ?? ''));

        return $ok ? $this->ok(['status' => 'unsubscribed']) : $this->error('Lien invalide.', 404);
    }

    // ------------------------------------------------------------------ Avis

    public function reviews()
    {
        [$page, $per, $offset] = $this->paging(10, 50);
        $b = $this->db->table('reviews r')
            ->select('r.id, r.name, r.rating, r.title, r.comment, r.reply, r.is_verified, r.created_at, s.name AS service_name, s.slug AS service_slug')
            ->join('services s', 's.id = r.service_id', 'left')
            ->where('r.status', 'approved');
        if ($rating = (int) $this->request->getGet('rating')) {
            $b->where('r.rating', $rating);
        }
        $total = $b->countAllResults(false);
        $items = $b->orderBy('r.created_at', 'DESC')->limit($per, $offset)->get()->getResultArray();

        $dist = [];
        foreach ($this->db->table('reviews')->select('rating, COUNT(*) AS n')->where('status', 'approved')->groupBy('rating')->get()->getResultArray() as $row) {
            $dist[(int) $row['rating']] = (int) $row['n'];
        }
        $all = array_sum($dist);
        $avg = $all ? round(array_sum(array_map(static fn ($k, $v) => $k * $v, array_keys($dist), $dist)) / $all, 1) : null;

        return $this->ok([
            'data'  => $items,
            'meta'  => ['page' => $page, 'per_page' => $per, 'total' => $total, 'pages' => (int) max(1, ceil($total / $per))],
            'stats' => ['count' => $all, 'average' => $avg, 'distribution' => $dist + array_fill_keys([1, 2, 3, 4, 5], 0)],
        ]);
    }

    /** Infos pour pré-remplir le formulaire d'avis depuis le lien reçu par e-mail */
    public function reviewContext()
    {
        $b = $this->bookingFromLink();
        if (! $b) {
            return $this->error('Lien invalide.', 404);
        }
        $already = $this->db->table('reviews')->where('booking_id', $b['id'])->countAllResults() > 0;

        return $this->ok([
            'name'     => $b['first_name'] . ' ' . mb_substr($b['last_name'], 0, 1) . '.',
            'services' => array_map(static fn ($i) => ['id' => (int) $i['service_id'], 'name' => $i['service_name']], $b['items']),
            'already'  => $already,
        ]);
    }

    public function submitReview()
    {
        $in = $this->input();
        if ($this->isBot($in)) {
            return $this->ok(['status' => 'pending']);
        }
        if ($r = $this->invalid($in, [
            'name'       => 'required|max_length[100]',
            'email'      => 'permit_empty|valid_email|max_length[190]',
            'rating'     => 'required|integer|greater_than[0]|less_than[6]',
            'title'      => 'permit_empty|max_length[150]',
            'comment'    => 'required|min_length[10]|max_length[2000]',
            'service_id' => 'permit_empty|integer',
        ], [
            'name'    => ['required' => 'Votre prénom est requis.'],
            'rating'  => ['required' => 'Choisissez une note.'],
            'comment' => ['required' => 'Écrivez quelques mots.', 'min_length' => 'Votre avis est un peu court (10 caractères minimum).'],
        ])) {
            return $r;
        }

        $booking = $this->bookingFromLink();
        if ($booking && $this->db->table('reviews')->where('booking_id', $booking['id'])->countAllResults() > 0) {
            return $this->error('Vous avez déjà laissé un avis pour ce rendez-vous. Merci !', 409);
        }

        $row = [
            'booking_id'  => $booking['id'] ?? null,
            'service_id'  => ! empty($in['service_id']) ? (int) $in['service_id'] : null,
            'name'        => trim($in['name']),
            'email'       => $booking['email'] ?? (trim((string) ($in['email'] ?? '')) ?: null),
            'rating'      => (int) $in['rating'],
            'title'       => trim((string) ($in['title'] ?? '')) ?: null,
            'comment'     => trim($in['comment']),
            'status'      => 'pending',
            'is_verified' => $booking ? 1 : 0,
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ];
        $this->db->table('reviews')->insert($row);
        Mailer::admin('Nouvel avis (' . $row['rating'] . '/5) de ' . $row['name'], 'review_admin', ['r' => $row]);

        return $this->ok(['status' => 'pending'], 201);
    }

    // --------------------------------------------------------------- Contact

    public function contact()
    {
        $in = $this->input();
        if ($this->isBot($in)) {
            return $this->ok(['ok' => true]);
        }
        if ($r = $this->invalid($in, [
            'name'    => 'required|max_length[120]',
            'email'   => 'required|valid_email|max_length[190]',
            'phone'   => 'permit_empty|max_length[40]',
            'subject' => 'permit_empty|max_length[190]',
            'message' => 'required|min_length[10]|max_length[3000]',
        ], [
            'name'    => ['required' => 'Votre nom est requis.'],
            'email'   => ['required' => 'Votre e-mail est requis.', 'valid_email' => 'Adresse e-mail invalide.'],
            'message' => ['required' => 'Votre message est vide.', 'min_length' => 'Votre message est un peu court.'],
        ])) {
            return $r;
        }
        $m = [
            'name'       => trim($in['name']),
            'email'      => strtolower(trim($in['email'])),
            'phone'      => trim((string) ($in['phone'] ?? '')) ?: null,
            'subject'    => trim((string) ($in['subject'] ?? '')) ?: null,
            'message'    => trim($in['message']),
            'created_at' => date('Y-m-d H:i:s'),
        ];
        $this->db->table('contact_messages')->insert($m);
        Mailer::admin('Message de ' . $m['name'] . ($m['subject'] ? ' – ' . $m['subject'] : ''), 'contact_admin', ['m' => $m], $m['email']);

        return $this->ok(['ok' => true], 201);
    }

    private function bookingFromLink(): ?array
    {
        $in    = $this->input() + (array) $this->request->getGet();
        $ref   = (string) ($in['ref'] ?? '');
        $token = (string) ($in['t'] ?? '');
        if ($ref === '' || $token === '') {
            return null;
        }
        $b = (new BookingService())->findByReference($ref);

        return ($b && hash_equals($b['manage_token'], $token) && in_array($b['status'], ['confirmed', 'completed'], true)) ? $b : null;
    }
}
