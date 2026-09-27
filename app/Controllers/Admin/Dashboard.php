<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Libraries\BookingService;

class Dashboard extends BaseController
{
    public function index()
    {
        (new BookingService())->expireStale();
        $today      = date('Y-m-d');
        $monthStart = date('Y-m-01 00:00:00');
        $monthEnd   = date('Y-m-t 23:59:59');

        $count = fn (callable $q) => $q($this->db->table('bookings'))->countAllResults();

        $todayList = $this->db->table('bookings')
            ->select('id, reference, first_name, last_name, phone, start_at, end_at, status, payment_status, total_cents, deposit_cents')
            ->where('start_at >=', $today . ' 00:00:00')->where('start_at <=', $today . ' 23:59:59')
            ->whereIn('status', ['confirmed', 'completed', 'no_show'])
            ->orderBy('start_at')->get()->getResultArray();
        $svc = new BookingService();
        $todayList = array_map(static fn ($b) => $svc->hydrate($b), $todayList);

        $upcoming = $this->db->table('bookings')
            ->select('id, reference, first_name, last_name, start_at, status, total_cents')
            ->where('start_at >', date('Y-m-d H:i:s'))->where('status', 'confirmed')
            ->orderBy('start_at')->limit(8)->get()->getResultArray();

        $month = $this->db->table('bookings')
            ->select('COUNT(*) AS n, SUM(total_cents) AS total, SUM(CASE WHEN payment_status IN (\'deposit_paid\',\'paid\') THEN deposit_cents ELSE 0 END) AS deposits')
            ->where('start_at >=', $monthStart)->where('start_at <=', $monthEnd)
            ->whereIn('status', ['confirmed', 'completed'])
            ->get()->getRowArray();

        // Réservations par jour sur 14 jours glissants (à venir)
        $next = [];
        for ($i = 0; $i < 14; $i++) {
            $d        = date('Y-m-d', strtotime("+$i day"));
            $next[$d] = 0;
        }
        foreach ($this->db->table('bookings')->select('start_at')
            ->where('start_at >=', $today . ' 00:00:00')->where('start_at <=', date('Y-m-d 23:59:59', strtotime('+13 day')))
            ->whereIn('status', ['confirmed', 'completed'])->get()->getResultArray() as $b) {
            $next[substr($b['start_at'], 0, 10)]++;
        }

        $top = $this->db->table('booking_items i')
            ->select('i.service_name, COUNT(*) AS n')
            ->join('bookings b', 'b.id = i.booking_id')
            ->whereIn('b.status', ['confirmed', 'completed'])
            ->where('b.start_at >=', date('Y-m-d', strtotime('-90 days')))
            ->groupBy('i.service_name')->orderBy('n', 'DESC')->limit(5)->get()->getResultArray();

        return $this->ok([
            'today'          => $todayList,
            'upcoming'       => $upcoming,
            'month'          => [
                'bookings'       => (int) ($month['n'] ?? 0),
                'revenue_cents'  => (int) ($month['total'] ?? 0),
                'deposits_cents' => (int) ($month['deposits'] ?? 0),
            ],
            'next14'         => $next,
            'top_services'   => $top,
            'pending_reviews' => $this->db->table('reviews')->where('status', 'pending')->countAllResults(),
            'unread_messages' => $this->db->table('contact_messages')->where('read_at IS NULL')->countAllResults(),
            'subscribers'     => $this->db->table('subscribers')->where('status', 'active')->countAllResults(),
            'week_bookings'   => $count(static fn ($b) => $b->where('created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))->whereIn('status', ['confirmed', 'completed'])),
        ]);
    }
}
