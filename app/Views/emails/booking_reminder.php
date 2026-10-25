<?php /** @var array $b @var string $siteUrl @var array $salon */ ?>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#092743;margin:0 0 12px;">À demain, <?= esc($b['first_name']) ?>&nbsp;!</h1>
<p>Petit rappel de votre rendez-vous chez <?= esc($salon['salon_name'] ?? 'DermaGlow') ?>&nbsp;:</p>
<?= view('emails/_booking_summary', ['b' => $b]) ?>
<p style="color:#4A5568;font-size:14px;">Pensez à venir avec une peau propre, sans maquillage sur la zone traitée.</p>
<p><a href="<?= esc($siteUrl) ?>/mon-rendez-vous?ref=<?= esc($b['reference']) ?>&t=<?= esc($b['manage_token']) ?>" style="color:#092743">Voir mon rendez-vous</a></p>
