<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;

/**
 * Gestion des catégories et des soins (prix, durée, acompte, visibilité).
 */
class Catalog extends BaseController
{
    public function index()
    {
        $cats = $this->db->table('service_categories')->orderBy('position')->orderBy('id')->get()->getResultArray();
        $svcs = $this->db->table('services')->orderBy('position')->orderBy('id')->get()->getResultArray();
        foreach ($cats as &$c) {
            $c['services'] = array_values(array_filter($svcs, static fn ($s) => (int) $s['category_id'] === (int) $c['id']));
        }

        return $this->ok($cats);
    }

    // ------------------------------------------------------------ Catégories

    public function saveCategory(?int $id = null)
    {
        $in = $this->input();
        if ($r = $this->invalid($in, ['name' => 'required|max_length[120]', 'subtitle' => 'permit_empty|max_length[190]'])) {
            return $r;
        }
        $row = [
            'name'        => trim($in['name']),
            'subtitle'    => trim((string) ($in['subtitle'] ?? '')) ?: null,
            'description' => trim((string) ($in['description'] ?? '')) ?: null,
            'is_active'   => isset($in['is_active']) ? (int) (bool) $in['is_active'] : 1,
            'updated_at'  => date('Y-m-d H:i:s'),
        ];
        if (isset($in['position'])) {
            $row['position'] = (int) $in['position'];
        }
        if ($id) {
            $this->db->table('service_categories')->where('id', $id)->update($row);
        } else {
            $row['slug']       = $this->uniqueSlug('service_categories', $row['subtitle'] ?: $row['name']);
            $row['position']   = $row['position'] ?? ((int) $this->db->table('service_categories')->selectMax('position')->get()->getRow()->position + 1);
            $row['created_at'] = $row['updated_at'];
            $this->db->table('service_categories')->insert($row);
            $id = $this->db->insertID();
        }

        return $this->ok($this->db->table('service_categories')->where('id', $id)->get()->getRowArray());
    }

    public function deleteCategory(int $id)
    {
        if ($this->db->table('services')->where('category_id', $id)->countAllResults() > 0) {
            return $this->error('Déplacez ou supprimez d’abord les soins de cette catégorie.', 409);
        }
        $this->db->table('service_categories')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }

    // ------------------------------------------------------------------ Soins

    public function saveService(?int $id = null)
    {
        $in = $this->input();
        if ($r = $this->invalid($in, [
            'category_id'  => 'required|integer',
            'name'         => 'required|max_length[150]',
            'price'        => 'required|decimal|greater_than_equal_to[0]',
            'duration_min' => 'required|integer|greater_than[4]|less_than[481]',
            'deposit'      => 'permit_empty|decimal',
            'short_description' => 'permit_empty|max_length[255]',
        ], [
            'price'        => ['required' => 'Le prix est requis.', 'decimal' => 'Prix invalide.'],
            'duration_min' => ['greater_than' => 'Durée minimum : 5 minutes.'],
        ])) {
            return $r;
        }
        $row = [
            'category_id'       => (int) $in['category_id'],
            'name'              => trim($in['name']),
            'short_description' => trim((string) ($in['short_description'] ?? '')) ?: null,
            'description'       => trim((string) ($in['description'] ?? '')) ?: null,
            'price_cents'       => (int) round(((float) str_replace(',', '.', (string) $in['price'])) * 100),
            'duration_min'      => (int) $in['duration_min'],
            'deposit_cents'     => ($in['deposit'] ?? '') === '' || $in['deposit'] === null ? null : (int) round(((float) str_replace(',', '.', (string) $in['deposit'])) * 100),
            'image'             => trim((string) ($in['image'] ?? '')) ?: null,
            'is_featured'       => (int) ! empty($in['is_featured']),
            'is_active'         => isset($in['is_active']) ? (int) (bool) $in['is_active'] : 1,
            'updated_at'        => date('Y-m-d H:i:s'),
        ];
        if (isset($in['position'])) {
            $row['position'] = (int) $in['position'];
        }
        if ($id) {
            $this->db->table('services')->where('id', $id)->update($row);
        } else {
            $row['slug']       = $this->uniqueSlug('services', $row['name']);
            $row['position']   = $row['position'] ?? ((int) $this->db->table('services')->where('category_id', $row['category_id'])->selectMax('position')->get()->getRow()->position + 1);
            $row['created_at'] = $row['updated_at'];
            $this->db->table('services')->insert($row);
            $id = $this->db->insertID();
        }

        return $this->ok($this->db->table('services')->where('id', $id)->get()->getRowArray());
    }

    public function deleteService(int $id)
    {
        // Les réservations gardent le nom et le prix du soin (booking_items) : suppression sans risque.
        $this->db->table('services')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }

    /** Réordonne : {type: 'services'|'categories', ids: [3,1,2]} */
    public function reorder()
    {
        $in    = $this->input();
        $table = ($in['type'] ?? '') === 'categories' ? 'service_categories' : 'services';
        foreach (array_values((array) ($in['ids'] ?? [])) as $pos => $id) {
            $this->db->table($table)->where('id', (int) $id)->update(['position' => $pos]);
        }

        return $this->ok(['ok' => true]);
    }

    private function uniqueSlug(string $table, string $text): string
    {
        $base = url_title(convert_accented_characters(str_replace(['’', '–'], ['', '-'], $text)), '-', true) ?: 'soin';
        $slug = $base;
        for ($i = 2; $this->db->table($table)->where('slug', $slug)->countAllResults() > 0; $i++) {
            $slug = $base . '-' . $i;
        }

        return $slug;
    }
}
