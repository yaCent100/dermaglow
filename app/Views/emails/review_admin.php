<?php /** @var array $r @var string $siteUrl */ ?>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;color:#0E1F3D;margin:0 0 12px;">Nouvel avis à modérer</h1>
<p><strong><?= esc($r['name']) ?></strong> — <?= str_repeat('★', (int) $r['rating']) . str_repeat('☆', 5 - (int) $r['rating']) ?></p>
<?php if (! empty($r['title'])): ?><p><strong><?= esc($r['title']) ?></strong></p><?php endif ?>
<p style="background:#F6EFE8;border-radius:12px;padding:16px;"><?= nl2br(esc($r['comment'])) ?></p>
<p><a href="<?= esc($siteUrl) ?>/admin/avis" style="color:#0E1F3D">Modérer dans l’administration →</a></p>
