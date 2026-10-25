<?php /** @var array $b */ ?>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3ED;border-radius:14px;margin:20px 0;">
  <tr><td style="padding:20px 22px;">
    <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7A8497;">Rendez-vous · <?= esc($b['reference']) ?></div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:#092743;margin:6px 0 14px;"><?= esc(ucfirst(fr_date($b['start_at'], true))) ?></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <?php foreach ($b['items'] as $it): ?>
      <tr><td style="padding:4px 0;color:#092743;"><?= esc($it['service_name']) ?> <span style="color:#7A8497;">· <?= (int) $it['duration_min'] ?> min</span></td><td align="right" style="padding:4px 0;"><?= euros($it['price_cents']) ?></td></tr>
      <?php endforeach ?>
      <tr><td colspan="2" style="border-top:1px solid #DDCFC2;padding-top:8px;"></td></tr>
      <tr><td style="padding:3px 0;"><strong>Total</strong></td><td align="right"><strong><?= euros($b['total_cents']) ?></strong></td></tr>
      <?php if ((int) $b['deposit_cents'] > 0 && $b['payment_status'] !== 'unpaid'): ?>
      <tr><td style="padding:3px 0;color:#3E7A63;">Acompte réglé en ligne</td><td align="right" style="color:#3E7A63;">− <?= euros($b['deposit_cents']) ?></td></tr>
      <?php endif ?>
      <?php if ($b['status'] !== 'cancelled'): ?>
      <tr><td style="padding:3px 0;">Reste à régler sur place</td><td align="right"><?= euros($b['balance_cents']) ?></td></tr>
      <?php endif ?>
    </table>
  </td></tr>
</table>
