<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Libraries\Availability;
use App\Libraries\BookingService;
use App\Libraries\Mailer;
use RuntimeException;

class Bookings extends BaseController
{
    private BookingService $svc;

    public function __construct()
    {
        $this->svc = new BookingService();
    }

    /** Liste filtrable : ?status=&from=&to=&q=&page= */
    public function index()
    {
        $this->svc->expireStale();
        [$page, $per, $offset] = $this->paging(25, 200);
        $b = $this->db->table('bookings');

        $status = (string) $this->request->getGet('status');
        if ($status === 'active') {
            $b->whereIn('status', ['confirmed', 'pending_payment']);
        } elseif ($status !== '' && $status !== 'all') {
            $b->where('status', $status);
        } else {
            $b->where('status !=', 'expired');
        }
        if ($from = $this->request->getGet('from')) {
            $b->where('start_at >=', $from . ' 00:00:00');
        }
        if ($to = $this->request->getGet('to')) {
            $b->where('start_at <=', $to . ' 23:59:59');
        }
        if ($q = trim((string) $this->request->getGet('q'))) {
            $b->groupStart()->like('first_name', $q)->orLike('last_name', $q)->orLike('email', $q)->orLike('phone', $q)->orLike('reference', $q)->groupEnd();
        }

        $total = $b->countAllResults(false);
        $order = $this->request->getGet('order') === 'asc' ? 'ASC' : 'DESC';
        $rows  = $b->orderBy('start_at', $order)->limit($per, $offset)->get()->getResultArray();

        return $this->paginated(array_map([$this->svc, 'hydrate'], $rows), $total, $page, $per);
    }

    /** Planning : ?from=YYYY-MM-DD&to=YYYY-MM-DD */
    public function calendar()
    {
        $from = (string) ($this->request->getGet('from') ?: date('Y-m-d'));
        $to   = (string) ($this->request->getGet('to') ?: date('Y-m-d', strtotime('+6 days')));
        $rows = $this->db->table('bookings')
            ->where('start_at >=', $from . ' 00:00:00')->where('start_at <=', $to . ' 23:59:59')
            ->whereIn('status', ['confirmed', 'completed', 'no_show', 'pending_payment'])
            ->orderBy('start_at')->get()->getResultArray();
        $closures = $this->db->table('closures')->where('end_date >=', $from)->where('start_date <=', $to)->get()->getResultArray();

        return $this->ok(['bookings' => array_map([$this->svc, 'hydrate'], $rows), 'closures' => $closures]);
    }

    public function show(int $id)
    {
        $b = $this->svc->find($id);
        if (! $b) {
            return $this->error('Introuvable.', 404);
        }
        $b['history'] = $this->db->table('bookings')->select('id, reference, start_at, status, total_cents')
            ->where('email', $b['email'])->where('id !=', $id)->whereIn('status', ['confirmed', 'completed', 'no_show', 'cancelled'])
            ->orderBy('start_at', 'DESC')->limit(10)->get()->getResultArray();

        return $this->ok($b);
    }

    /** Création manuelle (RDV pris par téléphone / sur place) */
    public function create()
    {
        $in = $this->input();
        if ($r = $this->invalid($in, [
            'services'   => 'required',
            'date'       => 'required|valid_date[Y-m-d]',
            'time'       => 'required|regex_match[/^\d{2}:\d{2}$/]',
            'first_name' => 'required|max_length[80]',
            'last_name'  => 'permit_empty|max_length[80]',
            'email'      => 'permit_empty|valid_email',
            'phone'      => 'permit_empty|max_length[40]',
        ])) {
            return $r;
        }
        $in['services']   = is_array($in['services']) ? $in['services'] : explode(',', (string) $in['services']);
        $in['last_name']  = $in['last_name'] ?? '';
        $in['email']      = $in['email'] ?? '';
        $in['phone']      = $in['phone'] ?? '';
        $in['send_email'] = ! empty($in['send_email']) && ! empty($in['email']);

        try {
            $b = $this->svc->create($in, true);
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage(), 409);
        }

        return $this->ok($b, 201);
    }

    /** Mise à jour : statut, notes internes, déplacement du RDV */
    public function update(int $id)
    {
        $b = $this->svc->find($id);
        if (! $b) {
            return $this->error('Introuvable.', 404);
        }
        $in  = $this->input();
        $upd = ['updated_at' => date('Y-m-d H:i:s')];

        if (array_key_exists('admin_notes', $in)) {
            $upd['admin_notes'] = mb_substr((string) $in['admin_notes'], 0, 2000);
        }
        foreach (['first_name', 'last_name', 'email', 'phone'] as $f) {
            if (isset($in[$f])) {
                $upd[$f] = mb_substr(trim((string) $in[$f]), 0, $f === 'email' ? 190 : 80);
            }
        }

        if (! empty($in['date']) && ! empty($in['time'])) {
            $start = $in['date'] . ' ' . $in['time'] . ':00';
            if ($start !== $b['start_at']) {
                $free = (new Availability($id))->isFree($in['date'], $in['time'], $b['duration_min']);
                if (! $free && empty($in['force'])) {
                    return $this->error('Ce créneau n’est pas disponible (déjà pris, fermé ou hors horaires). Cochez « forcer » pour l’imposer.', 409);
                }
                $upd['start_at']         = $start;
                $upd['end_at']           = date('Y-m-d H:i:s', strtotime($start . ' +' . $b['duration_min'] . ' minutes'));
                $upd['reminder_sent_at'] = null;
            }
        }

        if (! empty($in['status']) && $in['status'] !== $b['status']) {
            $allowed = ['confirmed', 'completed', 'no_show'];
            if (! in_array($in['status'], $allowed, true)) {
                return $this->error('Statut non autorisé ici (utilisez « Annuler »).', 422);
            }
            $upd['status'] = $in['status'];
        }

        $this->db->table('bookings')->where('id', $id)->update($upd);

        if (($upd['status'] ?? null) === 'completed' && ! $b['review_requested_at'] && $b['email']) {
            $this->requestReview($id);
        }

        return $this->ok($this->svc->find($id));
    }

    /** Solde réglé sur place */
    public function paidOnSite(int $id)
    {
        $b = $this->svc->find($id);
        if (! $b) {
            return $this->error('Introuvable.', 404);
        }
        $method = in_array($this->input()['method'] ?? '', ['card', 'cash', 'transfer', 'other'], true) ? $this->input()['method'] : 'card';
        $this->db->table('bookings')->where('id', $id)->update([
            'payment_status'      => 'paid',
            'paid_on_site_at'     => date('Y-m-d H:i:s'),
            'paid_on_site_method' => $method,
            'status'              => in_array($b['status'], ['confirmed', 'no_show'], true) ? 'completed' : $b['status'],
            'updated_at'          => date('Y-m-d H:i:s'),
        ]);
        if (! $b['review_requested_at'] && $b['email'] && $b['status'] === 'confirmed') {
            $this->requestReview($id);
        }

        return $this->ok($this->svc->find($id));
    }

    public function cancel(int $id)
    {
        $in = $this->input();
        try {
            $b = $this->svc->cancel($id, 'salon', $in['reason'] ?? null, isset($in['refund']) ? (bool) $in['refund'] : true);
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage(), 409);
        } catch (\Throwable $e) {
            log_message('error', $e->getMessage());

            return $this->error('Annulation impossible : ' . $e->getMessage(), 500);
        }

        return $this->ok($b);
    }

    public function reviewRequest(int $id)
    {
        $b = $this->svc->find($id);
        if (! $b || ! $b['email']) {
            return $this->error('Pas d’e-mail pour ce rendez-vous.', 422);
        }
        $this->requestReview($id);

        return $this->ok($this->svc->find($id));
    }

    /** Créneaux libres pour déplacer / créer un RDV depuis l'admin */
    public function slots()
    {
        $date     = (string) $this->request->getGet('date');
        $duration = (int) $this->request->getGet('duration');
        $ignore   = (int) $this->request->getGet('ignore') ?: null;

        return $this->ok(['slots' => (new Availability($ignore))->slotsFor($date, max(5, $duration))]);
    }

    public function export()
    {
        $rows = $this->db->table('bookings')->where('status !=', 'expired')->orderBy('start_at', 'DESC')->get()->getResultArray();
        $fh   = fopen('php://temp', 'w+');
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, ['Référence', 'Date', 'Heure', 'Prénom', 'Nom', 'E-mail', 'Téléphone', 'Soins', 'Total €', 'Acompte €', 'Statut', 'Paiement'], ';', '"', '\\');
        foreach ($rows as $r) {
            $items = implode(' + ', array_column($this->db->table('booking_items')->where('booking_id', $r['id'])->get()->getResultArray(), 'service_name'));
            fputcsv($fh, [$r['reference'], substr($r['start_at'], 0, 10), substr($r['start_at'], 11, 5), $r['first_name'], $r['last_name'], $r['email'], $r['phone'], $items,
                number_format($r['total_cents'] / 100, 2, ',', ''), number_format($r['deposit_cents'] / 100, 2, ',', ''), $r['status'], $r['payment_status']], ';', '"', '\\');
        }
        rewind($fh);

        return $this->response->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="rendez-vous-' . date('Y-m-d') . '.csv"')
            ->setBody(stream_get_contents($fh));
    }

    private function requestReview(int $id): void
    {
        $b = $this->svc->find($id);
        Mailer::send($b['email'], 'Votre avis sur votre soin chez ' . \App\Libraries\Settings::get('salon_name', 'DermaGlow'), 'review_request', ['b' => $b]);
        $this->db->table('bookings')->where('id', $id)->update(['review_requested_at' => date('Y-m-d H:i:s')]);
    }
}
