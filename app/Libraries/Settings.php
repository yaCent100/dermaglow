<?php

namespace App\Libraries;

/**
 * Accès simple aux réglages (table settings), avec cache mémoire par requête.
 */
class Settings
{
    private static ?array $cache = null;

    /** Clés visibles publiquement via /api/config */
    public const PUBLIC_KEYS = [
        'salon_name', 'tagline', 'address', 'city', 'phone', 'email', 'instagram', 'map_url',
        'opening_hours', 'deposit_type', 'deposit_value', 'deposit_min_cents',
        'cancellation_hours', 'booking_notice', 'max_advance_days', 'min_notice_hours', 'pending_minutes',
    ];

    /** Clés modifiables depuis l'admin */
    public const EDITABLE_KEYS = [
        'salon_name', 'tagline', 'address', 'city', 'phone', 'email', 'instagram', 'map_url',
        'opening_hours', 'slot_interval', 'buffer_min', 'min_notice_hours', 'max_advance_days',
        'capacity', 'deposit_type', 'deposit_value', 'deposit_min_cents', 'cancellation_hours',
        'pending_minutes', 'booking_notice',
    ];

    public static function all(): array
    {
        if (self::$cache === null) {
            self::$cache = [];
            foreach (db_connect()->table('settings')->get()->getResultArray() as $row) {
                self::$cache[$row['key']] = $row['value'];
            }
        }

        return self::$cache;
    }

    public static function get(string $key, $default = null)
    {
        return self::all()[$key] ?? $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        $v = self::get($key);

        return is_numeric($v) ? (int) $v : $default;
    }

    public static function json(string $key, array $default = []): array
    {
        $v = json_decode((string) self::get($key, ''), true);

        return is_array($v) ? $v : $default;
    }

    public static function set(string $key, $value): void
    {
        $db    = db_connect();
        $value = is_array($value) ? json_encode($value) : (string) $value;
        $row   = ['value' => $value, 'updated_at' => date('Y-m-d H:i:s')];
        if ($db->table('settings')->where('key', $key)->countAllResults()) {
            $db->table('settings')->where('key', $key)->update($row);
        } else {
            $db->table('settings')->insert(['key' => $key] + $row);
        }
        self::$cache = null;
    }

    public static function publicConfig(): array
    {
        $out = [];
        foreach (self::PUBLIC_KEYS as $k) {
            $out[$k] = self::get($k);
        }
        $out['opening_hours'] = self::json('opening_hours');

        return $out;
    }

    /**
     * Calcule l'acompte pour un total donné (centimes), selon les réglages
     * ou la somme des acomptes fixés par soin s'ils existent.
     *
     * @param list<array{price_cents:int, deposit_cents:?int}> $services
     */
    public static function depositFor(array $services): int
    {
        $total = array_sum(array_map(static fn ($s) => (int) $s['price_cents'], $services));
        if ($total <= 0) {
            return 0;
        }

        $sum = 0;
        foreach ($services as $s) {
            if ($s['deposit_cents'] !== null && $s['deposit_cents'] !== '') {
                $sum += (int) $s['deposit_cents'];
            } elseif (self::get('deposit_type', 'percent') === 'fixed') {
                $sum = max($sum, (int) round((float) self::get('deposit_value', 20) * 100));
            } else {
                $sum += (int) round(((int) $s['price_cents']) * ((float) self::get('deposit_value', 30)) / 100);
            }
        }

        $min = self::int('deposit_min_cents', 0);
        $dep = max($sum, $min);

        return min($dep, $total); // jamais plus que le total
    }
}
