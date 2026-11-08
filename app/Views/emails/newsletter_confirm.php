<?php /** @var string $url */ ?>
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:26px;color:#0E1F3D;margin:0 0 12px;">Encore une petite étape<?= ! empty($firstName) ? ', ' . esc($firstName) : '' ?></h1>
<p>Confirmez votre adresse pour recevoir nos conseils beauté, nos nouveautés et nos offres réservées aux abonnées.</p>
<p><a href="<?= esc($url) ?>" style="display:inline-block;background:#0E1F3D;color:#F6EFE8;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;">Je confirme mon inscription</a></p>
<p style="color:#7A8497;font-size:13px;">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.</p>
