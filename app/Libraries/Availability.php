<?php

namespace App\Libraries;

use DateTimeImmutable;

/**
 * Calcul des créneaux disponibles.
 *
 * Règles : horaires d'ouverture par jour de semaine, fermetures exceptionnelles,
 * délai minimum, horizon de réservation, pause entre deux RDV et capacité
 * (nombre de RDV simultanés possibles).
 */
class Availability
{
    /** Statuts qui bloquent un créneau */
    public const BLOCKING = ['confirmed', 'completed'];

    public function __construct(private ?int $ignoreBookingId = null)
    {
    }

    /** Liste des créneaux "HH:MM" libres pour une date et une durée. */
    public function slotsFor(string $date, int $durationMin): array
    {
        $day = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (! $day || $durationMin <= 0) {
            return [];
        }

        if (! $this->isBookableDay($day)) {
            return [];
        }

        $hours    = Settings::json('opening_hours');
        $ranges   = $hours[(string) (int) $day->format('w')] ?? [];
        $interval = max(5, Settings::int('slot_interval', 15));
        $buffer   = max(0, Settings::int('buffer_min', 0));
        $capacity = max(1, Settings::int('capacity', 1));
        $earliest = (new DateTimeImmutable())->modify('+' . Settings::int('min_notice_hours', 0) . ' hours');

        $busy  = $this->busyIntervals($date);
        $slots = [];

        foreach ($ranges as [$open, $close]) {
            $start = new DateTimeImmutable("$date $open");
            $end   = new DateTimeImmutable("$date $close");

            for ($t = $start; $t->modify("+$durationMin minutes") <= $end; $t = $t->modify("+$interval minutes")) {
                if ($t < $earliest) {
                    continue;
                }
                $sEnd = $t->modify('+' . ($durationMin + $buffer) . ' minutes');
                if ($this->overlaps($busy, $t, $sEnd) < $capacity) {
                    $slots[] = $t->format('H:i');
                }
            }
        }

        return array_values(array_unique($slots));
    }

    /** Vérifie qu'un créneau précis est toujours libre (au moment de réserver). */
    public function isFree(string $date, string $time, int $durationMin): bool
    {
        return in_array($time, $this->slotsFor($date, $durationMin), true);
    }

    /** Jours du mois ayant au moins un créneau. */
    public function daysWithSlots(string $month, int $durationMin): array
    {
        $first = DateTimeImmutable::createFromFormat('!Y-m', $month);
        if (! $first) {
            return [];
        }
        $out = [];
        for ($d = $first; $d->format('Y-m') === $month; $d = $d->modify('+1 day')) {
            $date        = $d->format('Y-m-d');
            $out[$date] = count($this->slotsFor($date, $durationMin));
        }

        return $out;
    }

    public function isBookableDay(DateTimeImmutable $day): bool
    {
        $today = new DateTimeImmutable('today');
        $max   = $today->modify('+' . Settings::int('max_advance_days', 60) . ' days');
        if ($day < $today || $day > $max) {
            return false;
        }

        $date   = $day->format('Y-m-d');
        $closed = db_connect()->table('closures')
            ->where('start_date <=', $date)
            ->where('end_date >=', $date)
            ->countAllResults();

        return $closed === 0;
    }

    /** @return list<array{0:DateTimeImmutable,1:DateTimeImmutable}> */
    private function busyIntervals(string $date): array
    {
        $buffer = max(0, Settings::int('buffer_min', 0));
        $now    = date('Y-m-d H:i:s');
        $db     = db_connect();

        $builder = $db->table('bookings')
            ->select('id, start_at, end_at')
            ->where('start_at <', $date . ' 23:59:59')
            ->where('end_at >', $date . ' 00:00:00')
            ->groupStart()
                ->whereIn('status', self::BLOCKING)
                ->orGroupStart()
                    ->where('status', 'pending_payment')
                    ->where('expires_at >', $now)
                ->groupEnd()
            ->groupEnd();

        if ($this->ignoreBookingId) {
            $builder->where('id !=', $this->ignoreBookingId);
        }

        $out = [];
        foreach ($builder->get()->getResultArray() as $b) {
            $out[] = [
                new DateTimeImmutable($b['start_at']),
                (new DateTimeImmutable($b['end_at']))->modify("+$buffer minutes"),
            ];
        }

        return $out;
    }

    private function overlaps(array $busy, DateTimeImmutable $s, DateTimeImmutable $e): int
    {
        $n = 0;
        foreach ($busy as [$bs, $be]) {
            if ($s < $be && $e > $bs) {
                $n++;
            }
        }

        return $n;
    }
}
