<?php /** @var string $content @var string $subject @var array $salon @var string $siteUrl */ ?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= esc($subject) ?></title>
</head>
<body style="margin:0;padding:0;background:#F6F3ED;font-family:'Helvetica Neue',Arial,sans-serif;color:#092743;">
<?php if (! empty($preheader)): ?><div style="display:none;max-height:0;overflow:hidden;opacity:0"><?= esc($preheader) ?></div><?php endif ?>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3ED;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
      <tr><td align="center" style="padding:8px 0 28px;">
        <a href="<?= esc($siteUrl) ?>"><img src="<?= esc($siteUrl) ?>/assets/img/logo.png" width="190" alt="<?= esc($salon['salon_name'] ?? 'DermaGlow') ?>" style="display:block;border:0;width:190px;height:auto;"></a>
      </td></tr>
      <tr><td style="background:#FFFFFF;border-radius:18px;padding:36px 32px;font-size:15px;line-height:1.65;color:#092743;">
        <?= $content ?>
      </td></tr>
      <tr><td align="center" style="padding:24px 16px;font-size:12px;line-height:1.6;color:#7A8497;">
        <?= esc($salon['salon_name'] ?? 'DermaGlow') ?> · <?= esc($salon['address'] ?? '') ?> <?= esc($salon['city'] ?? '') ?><br>
        <?= esc($salon['phone'] ?? '') ?> · <a href="mailto:<?= esc($salon['email'] ?? '') ?>" style="color:#7A8497"><?= esc($salon['email'] ?? '') ?></a>
        <?php if (! empty($unsubscribe)): ?><br><br><a href="<?= esc($unsubscribe) ?>" style="color:#7A8497">Se désinscrire de la newsletter</a><?php endif ?>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
