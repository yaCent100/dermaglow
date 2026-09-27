<?php /** @var array $b @var string $siteUrl */ $cancelled = ! empty($cancelled); ?>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;color:#0E1F3D;margin:0 0 12px;"><?= $cancelled ? 'Rendez-vous annulé' : 'Nouveau rendez-vous confirmé' ?></h1>
<p style="margin:0;"><strong><?= esc($b['first_name'] . ' ' . $b['last_name']) ?></strong><br>
<a href="mailto:<?= esc($b['email']) ?>" style="color:#0E1F3D"><?= esc($b['email']) ?></a> · <?= esc($b['phone']) ?></p>
<?= view('emails/_booking_summary', ['b' => $b]) ?>
<?php if (! empty($b['notes'])): ?><p style="margin:0 0 12px;"><strong>Note de la cliente&nbsp;:</strong><br><?= nl2br(esc($b['notes'])) ?></p><?php endif ?>
<?php if ($cancelled): ?><p style="margin:0 0 12px;color:#9B4A3C;">Acompte remboursé&nbsp;: <?= euros($b['refunded_cents']) ?></p><?php endif ?>
<p><a href="<?= esc($siteUrl) ?>/admin/rendez-vous/<?= (int) $b['id'] ?>" style="color:#0E1F3D">Ouvrir dans l’administration →</a></p>
