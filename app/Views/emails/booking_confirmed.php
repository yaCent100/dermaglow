<?php /** @var array $b @var string $siteUrl @var array $salon */ ?>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#092743;margin:0 0 12px;">Merci <?= esc($b['first_name']) ?>, c’est confirmé&nbsp;!</h1>
<p style="margin:0 0 8px;">Nous avons hâte de vous accueillir. Voici le récapitulatif de votre rendez-vous&nbsp;:</p>
<?= view('emails/_booking_summary', ['b' => $b]) ?>
<p style="margin:0 0 6px;"><strong>Adresse&nbsp;:</strong> <?= esc($salon['address'] ?? '') ?> <?= esc($salon['city'] ?? '') ?></p>
<p style="margin:0 0 18px;color:#4A5568;font-size:14px;">Besoin de modifier ou d’annuler&nbsp;? L’acompte est remboursé si vous annulez au moins <?= (int) ($salon['cancellation_hours'] ?? 48) ?>&nbsp;h à l’avance.</p>
<p style="margin:0 0 6px;"><a href="<?= esc($siteUrl) ?>/mon-rendez-vous?ref=<?= esc($b['reference']) ?>&t=<?= esc($b['manage_token']) ?>" style="display:inline-block;background:#092743;color:#F6F3ED;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;">Gérer mon rendez-vous</a></p>
