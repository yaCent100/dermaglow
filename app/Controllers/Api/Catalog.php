<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Payments;
use App\Libraries\Settings;

/**
 * Infos publiques : réglages de l'institut et carte des soins.
 */
class Catalog extends BaseController
{
    public function config()
    {
        $cfg                     = Settings::publicConfig();
        $cfg['payment_mode']     = Payments::isConfigured() ? 'stripe' : (Payments::isSimulated() ? 'simulation' : 'disabled');
        $cfg['reviews']          = $this->reviewStats();

        return $this->ok($cfg);
    }

    public function services()
    {
        $cats = $this->db->table('service_categories')->where('is_active', 1)->orderBy('position')->orderBy('id')->get()->getResultArray();
        $svcs = $this->db->table('services')->where('is_active', 1)->orderBy('position')->orderBy('id')->get()->getResultArray();

        foreach ($cats as &$c) {
            $c['services'] = array_values(array_map([$this, 'shape'], array_filter($svcs, static fn ($s) => (int) $s['category_id'] === (int) $c['id'])));
        }

        return $this->ok(array_values(array_filter($cats, static fn ($c) => $c['services'] !== [])));
    }

    public function service(string $slug)
    {
        $s = $this->db->table('services s')
            ->select('s.*, c.name AS category_name, c.subtitle AS category_subtitle, c.slug AS category_slug')
            ->join('service_categories c', 'c.id = s.category_id')
            ->where('s.slug', $slug)->where('s.is_active', 1)
            ->get()->getRowArray();
        if (! $s) {
            return $this->error('Soin introuvable.', 404);
        }
        $out            = $this->shape($s) + array_intersect_key($s, array_flip(['category_name', 'category_subtitle', 'category_slug']));
        $out['related'] = array_map([$this, 'shape'], $this->db->table('services')
            ->where('category_id', $s['category_id'])->where('id !=', $s['id'])->where('is_active', 1)
            ->orderBy('position')->limit(3)->get()->getResultArray());
        $out['reviews'] = $this->db->table('reviews')
            ->select('name, rating, title, comment, reply, is_verified, created_at')
            ->where('service_id', $s['id'])->where('status', 'approved')
            ->orderBy('created_at', 'DESC')->limit(6)->get()->getResultArray();

        return $this->ok($out);
    }

    private function shape(array $s): array
    {
        $deposit = Settings::depositFor([$s]);

        return [
            'id'                => (int) $s['id'],
            'category_id'       => (int) $s['category_id'],
            'name'              => $s['name'],
            'slug'              => $s['slug'],
            'short_description' => $s['short_description'],
            'description'       => $s['description'],
            'price_cents'       => (int) $s['price_cents'],
            'duration_min'      => (int) $s['duration_min'],
            'deposit_cents'     => $deposit,
            'image'             => $s['image'],
            'is_featured'       => (bool) $s['is_featured'],
        ];
    }

    private function reviewStats(): array
    {
        $row = $this->db->table('reviews')->select('COUNT(*) AS n, AVG(rating) AS avg')->where('status', 'approved')->get()->getRowArray();

        return ['count' => (int) ($row['n'] ?? 0), 'average' => $row['avg'] ? round((float) $row['avg'], 1) : null];
    }
}
