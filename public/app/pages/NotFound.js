export default {
  name: 'NotFoundPage',
  template: `
  <section class="section"><div class="container narrow state">
    <div class="eyebrow center">Erreur 404</div>
    <h1>Page <em>introuvable</em></h1>
    <p class="lead mx-auto">Cette page n’existe pas ou a été déplacée.</p>
    <div class="row" style="justify-content:center"><RouterLink to="/" class="btn">Accueil</RouterLink><RouterLink to="/soins" class="btn ghost">Nos soins</RouterLink></div>
  </div></section>`,
};
