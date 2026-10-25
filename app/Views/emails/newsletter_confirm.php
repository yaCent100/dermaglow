<?php /** @var string $url */ ?>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#092743;margin:0 0 12px;">Encore une petite étape<?= ! empty($firstName) ? ', ' . esc($firstName) : '' ?></h1>
<p>Confirmez votre adresse pour recevoir nos conseils beauté, nos nouveautés et nos offres réservées aux abonnées.</p>
<p><a href="<?= esc($url) ?>" style="display:inline-block;background:#092743;color:#F6F3ED;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;">Je confirme mon inscription</a></p>
<p style="color:#7A8497;font-size:13px;">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.</p>
