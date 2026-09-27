<?php
/**
 * Page unique qui charge l'application Vue 3 (modules ES, sans étape de build).
 *
 * @var array  $meta
 * @var bool   $noindex
 * @var string $url
 * @var bool   $dev
 * @var string $v
 * @var ?array $ldjson
 */
?>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= esc($meta['title']) ?></title>
  <meta name="description" content="<?= esc($meta['description']) ?>">
  <?php if ($noindex): ?><meta name="robots" content="noindex"><?php endif ?>
  <link rel="canonical" href="<?= esc($url) ?>">
  <meta property="og:type" content="<?= esc($meta['type']) ?>">
  <meta property="og:title" content="<?= esc($meta['title']) ?>">
  <meta property="og:description" content="<?= esc($meta['description']) ?>">
  <meta property="og:image" content="<?= esc($meta['image']) ?>">
  <meta property="og:url" content="<?= esc($url) ?>">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#F6EFE8">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/jost.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="/assets/fonts/cormorant.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="/assets/css/main.css?v=<?= esc($v) ?>">
  <?php if ($ldjson): ?><script type="application/ld+json"><?= json_encode($ldjson, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script><?php endif ?>
  <script type="importmap">
  {
    "imports": {
      "vue": "/vendor/<?= $dev ? 'vue.esm-browser.dev.js' : 'vue.esm-browser.prod.js' ?>",
      "vue-router": "/vendor/vue-router.esm-browser.prod.js",
      "marked": "/vendor/marked.esm.js"
    }
  }
  </script>
  <script src="/vendor/purify.min.js" defer></script>
</head>
<body>
  <div id="app">
    <!-- Écran de chargement (remplacé par Vue) -->
    <div class="boot"><img src="/assets/img/logo.png" alt="DermaGlow" width="220"></div>
  </div>
  <noscript><p style="padding:24px;text-align:center">Merci d’activer JavaScript pour réserver en ligne.</p></noscript>
  <script type="module" src="/app/main.js?v=<?= esc($v) ?>"></script>
</body>
</html>
