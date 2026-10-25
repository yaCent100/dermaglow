<?php /** @var array $b @var string $siteUrl */ ?>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#092743;margin:0 0 12px;">Comment s’est passé votre soin&nbsp;?</h1>
<p>Bonjour <?= esc($b['first_name']) ?>,</p>
<p>Merci pour votre visite. Votre avis compte énormément pour nous et aide d’autres clientes à nous découvrir. Cela ne prend qu’une minute.</p>
<p><a href="<?= esc($siteUrl) ?>/avis?ref=<?= esc($b['reference']) ?>&t=<?= esc($b['manage_token']) ?>" style="display:inline-block;background:#092743;color:#F6F3ED;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;">Laisser un avis</a></p>
