<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;

/**
 * Articles du blog (contenu en Markdown) + envoi d'images.
 */
class Posts extends BaseController
{
    public function index()
    {
        [$page, $per, $offset] = $this->paging(20, 100);
        $b = $this->db->table('posts')->select('id, title, slug, category, status, is_featured, views, published_at, updated_at, cover_image');
        if ($s = $this->request->getGet('status')) {
            $b->where('status', $s);
        }
        if ($q = trim((string) $this->request->getGet('q'))) {
            $b->like('title', $q);
        }
        $total = $b->countAllResults(false);

        return $this->paginated($b->orderBy('updated_at', 'DESC')->limit($per, $offset)->get()->getResultArray(), $total, $page, $per);
    }

    public function show(int $id)
    {
        $p = $this->db->table('posts')->where('id', $id)->get()->getRowArray();

        return $p ? $this->ok($p) : $this->error('Introuvable.', 404);
    }

    public function save(?int $id = null)
    {
        $in = $this->input();
        if ($r = $this->invalid($in, [
            'title'            => 'required|max_length[200]',
            'category'         => 'permit_empty|max_length[80]',
            'excerpt'          => 'permit_empty|max_length[400]',
            'meta_title'       => 'permit_empty|max_length[200]',
            'meta_description' => 'permit_empty|max_length[300]',
            'status'           => 'permit_empty|in_list[draft,published]',
            'slug'             => 'permit_empty|max_length[220]',
        ], ['title' => ['required' => 'Le titre est requis.']])) {
            return $r;
        }

        $content = (string) ($in['content'] ?? '');
        $status  = $in['status'] ?? 'draft';
        $now     = date('Y-m-d H:i:s');
        $row     = [
            'title'            => trim($in['title']),
            'category'         => trim((string) ($in['category'] ?? '')) ?: null,
            'excerpt'          => trim((string) ($in['excerpt'] ?? '')) ?: null,
            'content'          => $content,
            'cover_image'      => trim((string) ($in['cover_image'] ?? '')) ?: null,
            'meta_title'       => trim((string) ($in['meta_title'] ?? '')) ?: null,
            'meta_description' => trim((string) ($in['meta_description'] ?? '')) ?: null,
            'status'           => $status,
            'is_featured'      => (int) ! empty($in['is_featured']),
            'author_name'      => trim((string) ($in['author_name'] ?? '')) ?: 'L’équipe DermaGlow',
            'reading_minutes'  => max(1, (int) ceil(preg_match_all('/\S+/u', strip_tags($content)) / 200)),
            'updated_at'       => $now,
        ];

        $existing = $id ? $this->db->table('posts')->where('id', $id)->get()->getRowArray() : null;
        if ($id && ! $existing) {
            return $this->error('Introuvable.', 404);
        }

        $row['slug'] = $this->uniqueSlug(trim((string) ($in['slug'] ?? '')) ?: $row['title'], $id);

        if (! empty($in['published_at'])) {
            $row['published_at'] = date('Y-m-d H:i:s', strtotime((string) $in['published_at']));
        } elseif ($status === 'published' && empty($existing['published_at'])) {
            $row['published_at'] = $now;
        }

        if ($id) {
            $this->db->table('posts')->where('id', $id)->update($row);
        } else {
            $row['created_at'] = $now;
            $this->db->table('posts')->insert($row);
            $id = $this->db->insertID();
        }

        return $this->ok($this->db->table('posts')->where('id', $id)->get()->getRowArray());
    }

    public function delete(int $id)
    {
        $this->db->table('posts')->where('id', $id)->delete();

        return $this->ok(['ok' => true]);
    }

    /** POST multipart "image" → {url} ; redimensionnée à 1600 px max */
    public function upload()
    {
        $file = $this->request->getFile('image');
        if (! $file || ! $file->isValid()) {
            return $this->error('Aucune image reçue.', 422);
        }
        if (! in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return $this->error('Formats acceptés : JPG, PNG, WebP.', 422);
        }
        if ($file->getSizeByUnit('mb') > 8) {
            return $this->error('Image trop lourde (8 Mo max).', 422);
        }

        $dir = FCPATH . 'uploads/' . date('Y/m');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = $file->getRandomName();
        $file->move($dir, $name);
        $path = $dir . '/' . $name;

        try {
            $img = \Config\Services::image('gd')->withFile($path);
            if ($img->getWidth() > 1600) {
                $img->resize(1600, 1600, true, 'width')->save($path, 82);
            }
        } catch (\Throwable $e) {
            log_message('warning', 'Redimensionnement: ' . $e->getMessage());
        }

        return $this->ok(['url' => '/uploads/' . date('Y/m') . '/' . $name], 201);
    }

    private function uniqueSlug(string $text, ?int $ignoreId): string
    {
        $base = url_title(convert_accented_characters(str_replace(['’', "'"], '', $text)), '-', true) ?: 'article';
        $slug = $base;
        for ($i = 2; ; $i++) {
            $q = $this->db->table('posts')->where('slug', $slug);
            if ($ignoreId) {
                $q->where('id !=', $ignoreId);
            }
            if ($q->countAllResults() === 0) {
                return $slug;
            }
            $slug = $base . '-' . $i;
        }
    }
}
