<?php /** @var array $b @var string $siteUrl */ ?>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:26px;color:#0E1F3D;margin:0 0 12px;">Comment s’est passé votre soin&nbsp;?</h1>
<p>Bonjour <?= esc($b['first_name']) ?>,</p>
<p>Merci pour votre visite. Votre avis compte énormément pour nous et aide d’autres clientes à nous découvrir. Cela ne prend qu’une minute.</p>
<p><a href="<?= esc($siteUrl) ?>/avis?ref=<?= esc($b['reference']) ?>&t=<?= esc($b['manage_token']) ?>" style="display:inline-block;background:#0E1F3D;color:#F6EFE8;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;">Laisser un avis</a></p>
