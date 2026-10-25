import { store, loadCatalog, loadConfig, allServices, toggleCart } from '../store.js';
import { api } from '../api.js';
import { PostCard, NewsletterForm } from '../components/site.js';
import { euros, duration } from '../utils.js';

/**
 * Accueil DermaGlow — identité visuelle (charte oct. 2026)
 * Élément fort : la grande arche qui déborde de la couverture bleu poudré.
 * Le reste reste calme : beaucoup d'air, filets fins, typographie fine.
 */
export default {
  name: 'HomePage',
  components: { PostCard, NewsletterForm },
  data: () => ({ posts: [], reviews: [] }),
  setup: () => ({ store, toggleCart }),
  computed: {
    config() { return store.config; },
    face() { return (store.catalog || [])[0]?.services || []; },
    zones() { return (store.catalog || []).slice(1); },
    picked() { return allServices().filter((s) => store.cart.includes(s.id)); },
    pickedTotal() { return this.picked.reduce((n, s) => n + s.price_cents, 0); },
  },
  methods: {
    euros, duration,
    zoneName(c) {
      const t = (c.subtitle || c.name).replace(/^Épilation (du |des |de la |de l’)?/i, '');
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
    inCart(id) { return store.cart.includes(id); },
  },
  async created() {
    loadConfig(); loadCatalog();
    try {
      const [p, r] = await Promise.all([api.get('/posts', { per_page: 3 }), api.get('/reviews', { per_page: 3 })]);
      this.posts = p.data; this.reviews = r.data;
    } catch { /* sections masquées */ }
  },
  template: `
  <div class="dg-home">
    <!-- Couverture -->
    <section class="dg-hero">
      <div class="dg-hero-inner">
        <h1>Votre peau.<br>Toute notre<br>attention.</h1>
        <div class="dg-hero-foot">
          <p>Soins de la peau et épilation laser à {{ config?.city || 'Bruxelles' }}. Un accompagnement attentif, des soins personnalisés.</p>
          <div class="dg-hero-actions">
            <RouterLink to="/reservation" class="btn">Prendre rendez-vous</RouterLink>
            <RouterLink to="/soins" class="dg-link">Découvrir les soins</RouterLink>
          </div>
        </div>
      </div>
      <figure class="dg-arch" aria-hidden="false">
        <img src="/assets/img/hero.jpg" alt="Soin du visage chez Dermaglow" width="795" height="1086" fetchpriority="high">
      </figure>
    </section>

    <!-- Soins visage -->
    <section class="dg-face">
      <div class="container dg-face-grid">
        <div class="dg-face-intro">
          <h2>L’expertise<br>de la peau.</h2>
          <p>Des protocoles choisis avec vous, après un temps d’écoute. Nous vous expliquons simplement ce que chaque soin apporte.</p>
          <RouterLink to="/soins" class="dg-link">Toute la carte</RouterLink>
        </div>
        <ol class="dg-face-list" v-if="face.length">
          <li v-for="s in face" :key="s.id">
            <RouterLink :to="'/soins/' + s.slug">
              <span class="dg-face-name">{{ s.name.replace(' – ', ' ') }}</span>
              <span class="dg-face-price">{{ euros(s.price_cents) }}</span>
              <span class="dg-face-desc">{{ s.short_description }} — {{ duration(s.duration_min) }}</span>
            </RouterLink>
          </li>
        </ol>
        <div v-else class="skeleton" style="height:420px"></div>
      </div>
    </section>

    <!-- Épilation laser : sélection de zones -->
    <section class="dg-laser" v-if="zones.length">
      <div class="container">
        <div class="dg-laser-head">
          <h2>Épilation laser</h2>
          <p>Touchez les zones qui vous intéressent pour composer votre rendez-vous.</p>
        </div>
        <div class="dg-zones">
          <div v-for="c in zones" :key="c.id" class="dg-zone">
            <h3>{{ zoneName(c) }}</h3>
            <div class="dg-chips">
              <button v-for="s in c.services" :key="s.id" type="button" class="dg-chip" :class="{ on: inCart(s.id) }"
                :aria-pressed="inCart(s.id)" @click="toggleCart(s.id)">
                {{ s.name }} <em>{{ euros(s.price_cents) }}</em>
              </button>
            </div>
          </div>
        </div>
        <div class="dg-laser-bar" :class="{ on: picked.length }">
          <span v-if="picked.length">{{ picked.length }} soin{{ picked.length > 1 ? 's' : '' }} sélectionné{{ picked.length > 1 ? 's' : '' }} · {{ euros(pickedTotal) }}</span>
          <span v-else>Aucune zone sélectionnée</span>
          <RouterLink to="/reservation" class="btn light" :class="{ disabled: !picked.length }">Choisir un créneau</RouterLink>
        </div>
      </div>
    </section>

    <!-- Approche -->
    <section class="dg-approach">
      <div class="container">
        <div class="dg-approach-grid">
          <div><h3>Expertise</h3><p>Expliquer simplement chaque soin, son déroulé et les précautions à prendre.</p></div>
          <div><h3>Attention</h3><p>Écouter, puis adapter le soin aux besoins réels de votre peau.</p></div>
          <div><h3>Élégance</h3><p>Un lieu calme et soigné, une hygiène rigoureuse, un moment pour vous.</p></div>
        </div>
      </div>
    </section>

    <!-- Réserver -->
    <section class="dg-steps">
      <div class="container">
        <h2>Réserver, en trois temps.</h2>
        <ol>
          <li><h3>Votre soin</h3><p>Un soin du visage, une ou plusieurs zones d’épilation.</p></li>
          <li><h3>Votre créneau</h3><p>Le jour et l’heure qui vous conviennent, confirmés immédiatement.</p></li>
          <li><h3>Votre moment</h3><p>Le solde se règle sur place. Un rappel vous est envoyé la veille.</p></li>
        </ol>
        <RouterLink to="/reservation" class="btn">Prendre rendez-vous</RouterLink>
      </div>
    </section>

    <!-- Avis -->
    <section class="section" v-if="reviews.length">
      <div class="container">
        <div class="section-head"><h2>Ce qu’en disent nos clientes</h2><RouterLink to="/avis" class="dg-link">Tous les avis</RouterLink></div>
        <div class="grid c3">
          <figure v-for="r in reviews" :key="r.id" class="dg-quote">
            <Stars :value="Number(r.rating)" />
            <blockquote>{{ r.comment.length > 200 ? r.comment.slice(0, 200) + '…' : r.comment }}</blockquote>
            <figcaption>{{ r.name }}<template v-if="r.service_name">, {{ r.service_name }}</template></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Journal -->
    <section class="section" v-if="posts.length">
      <div class="container">
        <div class="section-head"><h2>Conseils peau</h2><RouterLink to="/blog" class="dg-link">Tous les articles</RouterLink></div>
        <div class="grid c3"><PostCard v-for="p in posts" :key="p.id" :post="p" /></div>
      </div>
    </section>

    <!-- Newsletter -->
    <section class="section tight">
      <div class="container">
        <div class="newsletter-band">
          <div>
            <h2>Nos conseils dans votre boîte mail</h2>
            <p style="margin:0">Conseils peau, nouveaux soins et offres réservées aux abonnées, une à deux fois par mois.</p>
          </div>
          <NewsletterForm source="home" />
        </div>
      </div>
    </section>
  </div>`,
};
