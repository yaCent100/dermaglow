<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Libraries\NewsletterService;

/**
 * Avis clients, newsletter (abonnés + campagnes) et messages de contact.
 */
class Community extends BaseController
{
    // ------------------------------------------------------------------ Avis

    public function reviews()
    {
        [$page, $per, $offset] = $this->paging(20, 100);
        $b = $this->db->table('reviews r')
            ->select('r.*, s.name AS service_name, b.reference AS booking_reference')
            ->join('services s', 's.id = r.service_id', 'left')
            ->join('bookings b', 'b.id = r.booking_id', 'left');
        if ($st = $this->request->getGet('status')) {
            $b->where('r.status', $st);
        }
        $total = $b->countAllResults(false);

        return $this->paginated($b->orderBy('r.created_at', 'DESC')->limit($per, $offset)->get()->getResultArray(), $total, $page, $per);
    }

    public function updateReview(int $id)
    {
        $in  = $this->input();
        $upd = ['updated_at' => date('Y-m-d H:i:s')];
        if (isset($in['status']) && in_array($in['status'], ['pending', 'approved', 'rejected'], true)) {
            $upd['status'] = $in['status'];
        }
        if (array_key_exists('reply', $in)) {
            $upd['reply']      = trim((string) $in['reply']) ?: null;
            $upd['replied_at'] = $upd['reply'] ? date('Y-m-d H:i:s') : null;
        }
        $this->db->table('reviews')->where('id', $id)->update($upd);

        return $this->ok($this->db->table('reviews')->where('id', $id)->get()->getRowArray());
    }

    public function deleteReview(int $id)
    {
        $this->db->table('reviews')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }

    // ------------------------------------------------------------- Abonnés

    public function subscribers()
    {
        [$page, $per, $offset] = $this->paging(50, 500);
        $b = $this->db->table('subscribers');
        if ($st = $this->request->getGet('status')) {
            $b->where('status', $st);
        }
        if ($q = trim((string) $this->request->getGet('q'))) {
            $b->groupStart()->like('email', $q)->orLike('first_name', $q)->groupEnd();
        }
        $total = $b->countAllResults(false);
        $rows  = $b->select('id, email, first_name, status, source, confirmed_at, created_at')->orderBy('created_at', 'DESC')->limit($per, $offset)->get()->getResultArray();

        $counts = [];
        foreach ($this->db->table('subscribers')->select('status, COUNT(*) AS n')->groupBy('status')->get()->getResultArray() as $r) {
            $counts[$r['status']] = (int) $r['n'];
        }

        return $this->ok([
            'data'   => $rows,
            'meta'   => ['page' => $page, 'per_page' => $per, 'total' => $total, 'pages' => (int) max(1, ceil($total / $per))],
            'counts' => $counts + ['active' => 0, 'pending' => 0, 'unsubscribed' => 0],
        ]);
    }

    public function addSubscriber()
    {
        $in = $this->input();
        if ($r = $this->invalid($in, ['email' => 'required|valid_email'])) {
            return $r;
        }
        $status = (new NewsletterService())->subscribe($in['email'], $in['first_name'] ?? null, 'admin', ! empty($in['confirmed']));

        return $this->ok(['status' => $status], 201);
    }

    public function deleteSubscriber(int $id)
    {
        $this->db->table('subscribers')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }

    public function exportSubscribers()
    {
        $rows = $this->db->table('subscribers')->where('status', 'active')->orderBy('created_at')->get()->getResultArray();
        $fh   = fopen('php://temp', 'w+');
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, ['email', 'prenom', 'inscrit_le', 'source'], ';', '"', '\\');
        foreach ($rows as $r) {
            fputcsv($fh, [$r['email'], $r['first_name'], $r['confirmed_at'] ?: $r['created_at'], $r['source']], ';', '"', '\\');
        }
        rewind($fh);

        return $this->response->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="abonnees-' . date('Y-m-d') . '.csv"')
            ->setBody(stream_get_contents($fh));
    }

    // ------------------------------------------------------------ Campagnes

    public function campaigns()
    {
        return $this->ok($this->db->table('campaigns')->orderBy('created_at', 'DESC')->get()->getResultArray());
    }

    public function saveCampaign(?int $id = null)
    {
        $in = $this->input();
        if ($r = $this->invalid($in, ['subject' => 'required|max_length[200]', 'content' => 'required', 'preheader' => 'permit_empty|max_length[200]'])) {
            return $r;
        }
        $row = [
            'subject'    => trim($in['subject']),
            'preheader'  => trim((string) ($in['preheader'] ?? '')) ?: null,
            'content'    => (string) $in['content'],
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        if ($id) {
            $c = $this->db->table('campaigns')->where('id', $id)->get()->getRowArray();
            if (! $c || $c['status'] === 'sent') {
                return $this->error('Cette campagne a déjà été envoyée.', 409);
            }
            $this->db->table('campaigns')->where('id', $id)->update($row);
        } else {
            $row['created_at'] = $row['updated_at'];
            $row['status']     = 'draft';
            $this->db->table('campaigns')->insert($row);
            $id = $this->db->insertID();
        }

        return $this->ok($this->db->table('campaigns')->where('id', $id)->get()->getRowArray());
    }

    public function deleteCampaign(int $id)
    {
        $this->db->table('campaigns')->where('id', $id)->where('status', 'draft')->delete();

        return $this->ok(['ok' => true]);
    }

    /** POST {test_email?} : envoi test ou envoi réel à toutes les abonnées actives */
    public function sendCampaign(int $id)
    {
        $c = $this->db->table('campaigns')->where('id', $id)->get()->getRowArray();
        if (! $c) {
            return $this->error('Introuvable.', 404);
        }
        $test = trim((string) ($this->input()['test_email'] ?? ''));
        if ($test !== '') {
            $n = (new NewsletterService())->sendCampaign($c, $test);

            return $this->ok(['sent' => $n, 'test' => true]);
        }
        if ($c['status'] === 'sent') {
            return $this->error('Déjà envoyée.', 409);
        }
        // On verrouille avant l'envoi pour éviter un double envoi
        $this->db->table('campaigns')->where('id', $id)->update(['status' => 'sent', 'sent_at' => date('Y-m-d H:i:s')]);
        $n = (new NewsletterService())->sendCampaign($c);
        $this->db->table('campaigns')->where('id', $id)->update(['recipients_count' => $n]);

        return $this->ok(['sent' => $n]);
    }

    // ------------------------------------------------------------- Messages

    public function messages()
    {
        [$page, $per, $offset] = $this->paging(30, 100);
        $b     = $this->db->table('contact_messages');
        $total = $b->countAllResults(false);

        return $this->paginated($b->orderBy('created_at', 'DESC')->limit($per, $offset)->get()->getResultArray(), $total, $page, $per);
    }

    public function readMessage(int $id)
    {
        $this->db->table('contact_messages')->where('id', $id)->where('read_at IS NULL')->update(['read_at' => date('Y-m-d H:i:s')]);

        return $this->ok(['ok' => true]);
    }

    public function deleteMessage(int $id)
    {
        $this->db->table('contact_messages')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }
}
