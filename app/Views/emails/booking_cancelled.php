<?php /** @var array $b @var string $by @var string $siteUrl */ ?>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#092743;margin:0 0 12px;">Votre rendez-vous est annulé</h1>
<p>Bonjour <?= esc($b['first_name']) ?>,</p>
<p><?= $by === 'salon' ? 'Nous sommes navrées de devoir annuler votre rendez-vous.' : 'Nous confirmons l’annulation de votre rendez-vous.' ?></p>
<?= view('emails/_booking_summary', ['b' => $b]) ?>
<?php if ((int) $b['refunded_cents'] > 0): ?>
<p>Votre acompte de <strong><?= euros($b['refunded_cents']) ?></strong> vous est remboursé. Il apparaîtra sur votre compte sous 5 à 10 jours ouvrés.</p>
<?php elseif ($b['deposit_paid_at']): ?>
<p>L’annulation ayant eu lieu moins de <?= (int) ($salon['cancellation_hours'] ?? 48) ?>&nbsp;h avant le rendez-vous, l’acompte reste acquis, conformément à nos conditions.</p>
<?php endif ?>
<p><a href="<?= esc($siteUrl) ?>/reservation" style="display:inline-block;background:#092743;color:#F6F3ED;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;">Reprendre rendez-vous</a></p>
