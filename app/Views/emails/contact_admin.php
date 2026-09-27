<?php /** @var array $m */ ?>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;color:#0E1F3D;margin:0 0 12px;">Nouveau message</h1>
<p><strong><?= esc($m['name']) ?></strong> · <a href="mailto:<?= esc($m['email']) ?>" style="color:#0E1F3D"><?= esc($m['email']) ?></a><?= ! empty($m['phone']) ? ' · ' . esc($m['phone']) : '' ?></p>
<?php if (! empty($m['subject'])): ?><p><strong>Sujet :</strong> <?= esc($m['subject']) ?></p><?php endif ?>
<p style="background:#F6EFE8;border-radius:12px;padding:16px;"><?= nl2br(esc($m['message'])) ?></p>
