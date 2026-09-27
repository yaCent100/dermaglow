<?php

namespace App\Controllers;

use App\Libraries\Settings;

/**
 * Sert l'application Vue (une seule page HTML) pour toutes les URL du site,
 * avec les balises title / description / Open Graph adaptées (SEO + partage).
 */
class Spa extends BaseController
{
    public function index(...$segments)
    {
        $path  = trim(implode('/', $segments), '/');
        $name  = Settings::get('salon_name', 'DermaGlow');
        $city  = Settings::get('city', '');
        $meta  = [
            'title'       => $name . ' – Soins de peau & épilation' . ($city ? ' à ' . $city : ''),
            'description' => 'Hydrafacial, soins de peau cliniques et épilation. Réservez votre soin en ligne chez ' . $name . ($city ? ', ' . $city : '') . '.',
            'image'       => base_url('assets/img/og-image.jpg'),
            'type'        => 'website',
        ];
        $status = 200;

        if (preg_match('#^blog/([a-z0-9-]+)$#', $path, $m)) {
            $p = $this->db->table('posts')->select('title, excerpt, meta_title, meta_description, cover_image')
                ->where('slug', $m[1])->where('status', 'published')->get()->getRowArray();
            if ($p) {
                $meta['title']       = ($p['meta_title'] ?: $p['title']) . ' | ' . $name;
                $meta['description'] = $p['meta_description'] ?: ($p['excerpt'] ?: $meta['description']);
                $meta['type']        = 'article';
                if ($p['cover_image']) {
                    $meta['image'] = base_url(ltrim($p['cover_image'], '/'));
                }
            } else {
                $status = 404;
            }
        } elseif (preg_match('#^soins/([a-z0-9-]+)$#', $path, $m)) {
            $s = $this->db->table('services')->select('name, short_description')->where('slug', $m[1])->where('is_active', 1)->get()->getRowArray();
            if ($s) {
                $meta['title']       = $s['name'] . ' | ' . $name;
                $meta['description'] = $s['short_description'] ?: $meta['description'];
            } else {
                $status = 404;
            }
        } else {
            $titles = [
                'soins'       => 'Nos soins & tarifs',
                'reservation' => 'Réserver un soin',
                'blog'        => 'Le journal beauté',
                'avis'        => 'Avis clientes',
                'contact'     => 'Contact & accès',
                'a-propos'    => 'L’institut',
            ];
            if (isset($titles[$path])) {
                $meta['title'] = $titles[$path] . ' | ' . $name;
            }
        }

        $noindex = str_starts_with($path, 'admin') || str_starts_with($path, 'mon-rendez-vous') || str_starts_with($path, 'reservation/') || str_starts_with($path, 'newsletter');

        return $this->response->setStatusCode($status)->setBody(view('spa', [
            'meta'    => $meta,
            'noindex' => $noindex,
            'url'     => base_url($path),
            'dev'     => ENVIRONMENT !== 'production',
            'v'       => ENVIRONMENT === 'production' ? substr(md5((string) @filemtime(FCPATH . 'app/main.js')), 0, 8) : time(),
            'ldjson'  => $path === '' ? $this->businessLd() : null,
        ]));
    }

    public function sitemap()
    {
        $urls = ['', 'soins', 'reservation', 'blog', 'avis', 'contact', 'conditions', 'confidentialite'];
        foreach ($this->db->table('services')->select('slug')->where('is_active', 1)->get()->getResultArray() as $s) {
            $urls[] = 'soins/' . $s['slug'];
        }
        foreach ($this->db->table('posts')->select('slug')->where('status', 'published')->where('published_at <=', date('Y-m-d H:i:s'))->get()->getResultArray() as $p) {
            $urls[] = 'blog/' . $p['slug'];
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($urls as $u) {
            $xml .= '<url><loc>' . esc(base_url($u)) . '</loc></url>';
        }

        return $this->response->setContentType('application/xml')->setBody($xml . '</urlset>');
    }

    public function robots()
    {
        return $this->response->setContentType('text/plain')->setBody("User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: " . base_url('sitemap.xml') . "\n");
    }

    private function businessLd(): array
    {
        $days  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $hours = [];
        foreach (Settings::json('opening_hours') as $d => $ranges) {
            foreach ($ranges as [$o, $c]) {
                $hours[] = ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $days[(int) $d], 'opens' => $o, 'closes' => $c];
            }
        }

        return [
            '@context'    => 'https://schema.org',
            '@type'       => 'BeautySalon',
            'name'        => Settings::get('salon_name'),
            'url'         => base_url(),
            'telephone'   => Settings::get('phone'),
            'email'       => Settings::get('email'),
            'image'       => base_url('assets/img/og-image.jpg'),
            'address'     => ['@type' => 'PostalAddress', 'streetAddress' => Settings::get('address'), 'addressLocality' => Settings::get('city'), 'addressCountry' => 'BE'],
            'openingHoursSpecification' => $hours,
        ];
    }
}
