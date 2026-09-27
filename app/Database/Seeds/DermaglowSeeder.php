<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Données de départ : carte des soins (d'après "Nos Prix"), réglages, compte admin
 * et trois articles de blog d'exemple (modifiables dans l'admin).
 *
 * Les durées ne figurent pas sur la carte : ce sont des estimations à ajuster
 * dans Admin > Soins.
 */
class DermaglowSeeder extends Seeder
{
    public function run(): void
    {
        $now = date('Y-m-d H:i:s');

        // ------------------------------------------------------------------ Admin
        $email    = env('ADMIN_EMAIL', 'admin@dermaglow.local');
        $password = env('ADMIN_PASSWORD', 'ChangeMoi!2026');
        if (! $this->db->table('users')->where('email', $email)->countAllResults()) {
            $this->db->table('users')->insert([
                'name'          => 'DermaGlow',
                'email'         => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'role'          => 'admin',
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        }

        // ------------------------------------------------------------------ Réglages
        $settings = [
            'salon_name'         => 'DermaGlow',
            'tagline'            => 'Institut de soins de peau & épilation',
            'address'            => 'Adresse à compléter',
            'city'               => 'Bruxelles',
            'phone'              => '+32 000 00 00 00',
            'email'              => env('MAIL_ADMIN', 'contact@dermaglow.be'),
            'instagram'          => 'https://instagram.com/',
            'map_url'            => '',
            'opening_hours'      => json_encode([
                // 0 = dimanche … 6 = samedi ; [] = fermé
                '0' => [],
                '1' => [],
                '2' => [['10:00', '19:00']],
                '3' => [['10:00', '19:00']],
                '4' => [['10:00', '20:00']],
                '5' => [['10:00', '19:00']],
                '6' => [['09:30', '17:00']],
            ]),
            'slot_interval'      => '15',   // minutes entre deux créneaux proposés
            'buffer_min'         => '10',   // pause après chaque rendez-vous
            'min_notice_hours'   => '12',   // délai minimum avant un RDV
            'max_advance_days'   => '60',   // réservation possible jusqu'à X jours
            'capacity'           => '1',    // nb de RDV simultanés (cabines / praticiennes)
            'deposit_type'       => 'percent', // percent | fixed
            'deposit_value'      => '30',   // 30 % ou montant en euros si fixed
            'deposit_min_cents'  => '2000', // acompte minimum 20 €
            'cancellation_hours' => '48',   // annulation gratuite (acompte remboursé) jusqu'à 48 h avant
            'pending_minutes'    => '30',   // durée de blocage du créneau pendant le paiement
            'booking_notice'     => "Un acompte est demandé pour confirmer votre rendez-vous. Le solde se règle sur place, par carte ou en espèces.",
        ];
        foreach ($settings as $key => $value) {
            if (! $this->db->table('settings')->where('key', $key)->countAllResults()) {
                $this->db->table('settings')->insert(['key' => $key, 'value' => $value, 'updated_at' => $now]);
            }
        }

        if ($this->db->table('service_categories')->countAllResults() > 0) {
            return; // catalogue déjà présent
        }

        // ------------------------------------------------------------------ Soins
        $catalog = [
            [
                'name'     => 'Clinical Skin Treatments',
                'subtitle' => 'Soins de peau cliniques',
                'desc'     => 'Des protocoles experts pour une peau nette, lisse et lumineuse, adaptés à chaque type de peau.',
                'items'    => [
                    ['Hydrafacial Expert Signature', 12000, 60, true, 'Nettoyage profond, exfoliation douce et infusion de sérums actifs.', 'Nettoyage profond, exfoliation douce et infusion ciblée de sérums actifs pour une peau plus lisse, plus fraîche, intensément hydratée et lumineuse dès la première séance.'],
                    ['DermaClean Pro – Nettoyage de Peau Dermatologique', 11000, 75, false, 'Affine le grain de peau et libère les pores, masque + LED.', 'Affine le grain de peau, exfolie en douceur, libère les pores congestionnés et associe masque + LED pour révéler une peau plus lisse, uniforme, fraîche et visiblement plus lumineuse.'],
                    ['DermaGlow Soft', 9000, 45, true, 'Exfoliation douce et éclat instantané.', 'Exfoliation douce et éclat instantané. Ce soin illumine le teint, affine la texture et révèle un glow naturel, subtil et frais.'],
                    ['DermaBright Reveal', 12000, 60, false, 'Lisse la texture, resserre les pores, unifie le teint.', 'Lisse la texture, resserre les pores et unifie le teint. La peau devient plus douce, plus nette et intensément lumineuse, avec un résultat qui continue de s’amplifier dans les 48 heures.'],
                    ['DermaReverse Intense', 13000, 75, false, 'Soin intensif de renouveau cutané.', 'Soin intensif de renouveau cutané : amélioration de la texture, de la densité, de l’éclat et du rebond pour une peau plus lisse, plus claire, revitalisée et visiblement repulpée.'],
                    ['DermaNeedling', 12000, 75, true, 'Stimulation profonde du renouvellement cutané.', 'Stimulation profonde du renouvellement cutané grâce à des micro-perforations contrôlées et l’action d’actifs ciblés. Pour une peau repulpée, rides et ridules lissées, cicatrices atténuées et teint plus uniforme et éclatant.'],
                ],
            ],
            [
                'name'     => 'Facial Hair Removal',
                'subtitle' => 'Épilation du visage',
                'desc'     => 'Des zones précises traitées avec douceur pour un résultat net et durable.',
                'items'    => [
                    ['Sourcils', 6000, 15], ['Lèvre Supérieure', 6000, 15], ['Menton', 6000, 15],
                    ['Lèvre Supérieure – Menton', 10000, 20], ['Visage Complet', 15000, 30],
                    ['Visage Complet + Cou', 19000, 40], ['Visage Complet + Nuque', 16000, 40],
                    ['Cou', 10000, 20], ['Nuque', 6000, 15],
                ],
            ],
            [
                'name'     => 'Legs Hair Removal',
                'subtitle' => 'Épilation des jambes',
                'desc'     => 'Des jambes douces et lisses, sans compromis.',
                'items'    => [
                    ['Demi Jambes', 18000, 30], ['Cuisses', 24000, 40],
                    ['Jambes Complètes', 38000, 60], ['Pieds et/ou Orteils', 5000, 15],
                ],
            ],
            [
                'name'     => 'Arms Hair Removal',
                'subtitle' => 'Épilation des bras',
                'desc'     => 'Aisselles et bras, pour une peau nette au quotidien.',
                'items'    => [
                    ['Aisselles', 10000, 15], ['Haut du Bras', 8000, 20],
                    ['Avant-Bras', 12000, 20], ['Bras Entier', 16000, 30],
                ],
            ],
            [
                'name'     => 'Bikini Hair Removal',
                'subtitle' => 'Épilation du maillot',
                'desc'     => 'Du classique à l’intégral, en toute discrétion.',
                'items'    => [
                    ['Maillot Classique', 10000, 20], ['Maillot Échancré', 13000, 25], ['Maillot Complet', 15000, 30],
                ],
            ],
        ];

        helper('text');
        $cPos = 0;
        foreach ($catalog as $cat) {
            $this->db->table('service_categories')->insert([
                'name'        => $cat['name'],
                'slug'        => url_title(convert_accented_characters($cat['subtitle']), '-', true),
                'subtitle'    => $cat['subtitle'],
                'description' => $cat['desc'],
                'position'    => $cPos++,
                'is_active'   => 1,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
            $catId = $this->db->insertID();
            $sPos  = 0;
            foreach ($cat['items'] as $it) {
                $slugBase = url_title(convert_accented_characters(str_replace('–', '-', $it[0])), '-', true);
                $slug     = $slugBase;
                for ($n = 2; $this->db->table('services')->where('slug', $slug)->countAllResults() > 0; $n++) {
                    $slug = $slugBase . '-' . $n;
                }
                $this->db->table('services')->insert([
                    'category_id'       => $catId,
                    'name'              => $it[0],
                    'slug'              => $slug,
                    'short_description' => $it[4] ?? null,
                    'description'       => $it[5] ?? null,
                    'price_cents'       => $it[1],
                    'duration_min'      => $it[2],
                    'deposit_cents'     => null,
                    'is_featured'       => ! empty($it[3]) ? 1 : 0,
                    'is_active'         => 1,
                    'position'          => $sPos++,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ]);
            }
        }

        // ------------------------------------------------------------------ Blog (exemples)
        $posts = [
            [
                'title'    => 'Hydrafacial : à quoi s’attendre lors de votre première séance',
                'category' => 'Soins visage',
                'excerpt'  => 'Déroulé du soin, sensations, résultats et conseils pour les jours qui suivent : tout ce qu’il faut savoir avant de réserver.',
                'content'  => "Le Hydrafacial fait partie des soins les plus demandés à l’institut, et pour cause : il nettoie, exfolie et hydrate en une seule séance, sans éviction sociale.\n\n## Le déroulé, étape par étape\n\n1. **Diagnostic de peau** – nous prenons quelques minutes pour comprendre vos besoins et adapter les sérums.\n2. **Nettoyage & exfoliation douce** – les cellules mortes sont délicatement éliminées.\n3. **Extraction** – un système d’aspiration douce libère les pores, sans pincer ni marquer.\n4. **Infusion de sérums** – antioxydants, peptides et acide hyaluronique pénètrent dans une peau parfaitement préparée.\n\n## Ce que vous ressentez\n\nLa plupart de nos clientes décrivent une sensation de fraîcheur, proche d’un massage léger. Aucune douleur, aucune rougeur durable.\n\n## Après la séance\n\n- Évitez le maquillage pendant quelques heures pour laisser la peau respirer.\n- Appliquez une protection solaire, même en hiver.\n- Buvez de l’eau : l’hydratation se joue aussi de l’intérieur.\n\n> Le petit plus : l’éclat est visible immédiatement, ce qui en fait le soin idéal avant un événement.\n\nEnvie d’essayer ? Réservez directement en ligne, un acompte suffit pour bloquer votre créneau.",
            ],
            [
                'title'    => 'Épilation : bien préparer sa peau avant une séance',
                'category' => 'Épilation',
                'excerpt'  => 'Rasage, soleil, hydratation… les bons réflexes pour une séance plus confortable et un résultat optimal.',
                'content'  => "Une séance d’épilation réussie commence quelques jours avant le rendez-vous. Voici nos conseils.\n\n## Les jours qui précèdent\n\n- **Rasez la zone la veille** (sauf indication contraire) : le poil doit être présent sous la peau, mais pas en surface.\n- **Évitez le soleil et l’autobronzant** pendant au moins deux semaines.\n- **N’utilisez pas de cire ni de pince à épiler** : le bulbe doit rester en place.\n\n## Le jour J\n\n- Venez avec une peau propre, sans crème, déodorant ni parfum sur la zone.\n- Signalez-nous tout traitement en cours (photosensibilisant, antibiotiques…).\n\n## Après la séance\n\nUne légère rougeur est normale et disparaît rapidement. Hydratez la zone avec un soin apaisant et protégez-la du soleil.\n\nLes résultats se construisent au fil des séances : la régularité fait toute la différence.",
            ],
            [
                'title'    => 'Routine d’automne : 5 gestes pour garder une peau lumineuse',
                'category' => 'Conseils beauté',
                'excerpt'  => 'Changement de saison, chauffage, froid : la peau a besoin d’attention. Cinq gestes simples pour garder votre glow.',
                'content'  => "Avec la baisse des températures, la peau a tendance à tirer et à perdre de son éclat. Quelques ajustements suffisent.\n\n## 1. Un nettoyant plus doux\n\nPassez à une texture crème ou huile qui respecte le film hydrolipidique.\n\n## 2. Une exfoliation mesurée\n\nUne à deux fois par semaine, pas plus : l’objectif est d’affiner le grain, pas de fragiliser la peau.\n\n## 3. Un sérum hydratant\n\nL’acide hyaluronique ou la glycérine aident à retenir l’eau dans l’épiderme.\n\n## 4. Une crème plus riche le soir\n\nLa nuit, la peau se répare : c’est le moment idéal pour la nourrir.\n\n## 5. Le SPF, toute l’année\n\nMême par temps gris, les UV sont présents. C’est le geste anti-âge par excellence.\n\n---\n\nPour relancer l’éclat en début de saison, un soin **DermaGlow Soft** ou **Hydrafacial** en institut est un excellent point de départ.",
            ],
        ];
        $i = 0;
        foreach ($posts as $p) {
            $words = preg_match_all('/\S+/u', $p['content']);
            $date  = date('Y-m-d H:i:s', strtotime('-' . (($i * 9) + 2) . ' days'));
            $this->db->table('posts')->insert([
                'title'           => $p['title'],
                'slug'            => url_title(convert_accented_characters(str_replace('’', '', $p['title'])), '-', true),
                'category'        => $p['category'],
                'excerpt'         => $p['excerpt'],
                'content'         => $p['content'],
                'cover_image'     => null,
                'status'          => 'published',
                'is_featured'     => $i === 0 ? 1 : 0,
                'reading_minutes' => max(1, (int) ceil($words / 200)),
                'author_name'     => 'L’équipe DermaGlow',
                'published_at'    => $date,
                'created_at'      => $date,
                'updated_at'      => $date,
            ]);
            $i++;
        }
    }
}
