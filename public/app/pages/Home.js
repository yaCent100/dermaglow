import { store, loadCatalog, loadConfig, allServices } from '../store.js';
import { api } from '../api.js';
import { PostCard, NewsletterForm } from '../components/site.js';
import { euros, duration } from '../utils.js';

/**
 * Accueil — charte DermaGlow : bleu poudré, marine, ivoire, nude.
 * Motif unique : l'arc ouvert qui encadre la photo.
 */
export default {
  name: 'HomePage',
  components: { PostCard, NewsletterForm },
  data: () => ({ posts: [], reviews: [], stats: null }),
  setup: () => ({ store }),
  computed: {
    config() { return store.config; },
    featured() {
      const all = allServices();
      const f = all.filter((s) => s.is_featured);
      return (f.length >= 3 ? f : all).slice(0, 4);
    },
    zones() { return (store.catalog || []).slice(1); },
  },
  methods: {
    euros, duration,
    zoneName(c) {
      const t = (c.subtitle || c.name).replace(/^Épilation (du |des |de la |de l’)?/i, '');
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
    minPrice(cat) { return Math.min(...cat.services.map((s) => s.price_cents)); },
  },
  async created() {
    loadConfig(); loadCatalog();
    try {
      const [p, r] = await Promise.all([api.get('/posts', { per_page: 3 }), api.get('/reviews', { per_page: 3 })]);
      this.posts = p.data; this.reviews = r.data; this.stats = r.stats;
    } catch { /* sections masquées */ }
  },
  template: `
  <div>
    <!-- Couverture : bleu signature + arc ouvert -->
    <section class="home-hero">
      <div class="txt">
        <h1>Votre peau.<br>Toute notre attention.</h1>
        <p>Soins de la peau et épilation laser à {{ config?.city || 'Bruxelles' }}. Prenons le temps de choisir ensemble le soin qui convient à votre peau.</p>
        <div class="actions">
          <RouterLink to="/reservation" class="btn">Prendre rendez-vous</RouterLink>
          <RouterLink to="/soins" class="btn ghost">Voir les soins</RouterLink>
        </div>
        <div class="where">{{ config?.city || 'Bruxelles' }}</div>
      </div>
      <div class="arch"><div class="ph"><img src="/assets/img/hero.jpg" alt="Soin du visage chez Dermaglow" width="795" height="1086" fetchpriority="high"></div></div>
    </section>

    <!-- Soins visage -->
    <section class="section">
      <div class="container split">
        <div class="intro">
          <h2>L’expertise de la peau.</h2>
          <p>Chaque soin commence par un temps d’écoute. Nous vous expliquons simplement ce qu’il apporte et comment s’y préparer.</p>
          <RouterLink to="/soins" class="link-arrow">Toute la carte <Icon name="arrow-right" /></RouterLink>
        </div>
        <ul class="carte" v-if="featured.length">
          <li v-for="s in featured" :key="s.id">
            <RouterLink :to="'/soins/' + s.slug">
              <b>{{ s.name }}</b><span>{{ euros(s.price_cents) }}</span>
              <small>{{ s.short_description }} · {{ duration(s.duration_min) }}</small>
            </RouterLink>
          </li>
        </ul>
        <div v-else class="skeleton" style="height:320px"></div>
      </div>
    </section>

    <!-- Épilation laser -->
    <section class="section bg-paper" v-if="zones.length">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Épilation laser</h2>
            <p class="muted" style="margin:0;max-width:52ch">Visage, jambes, bras et maillot : choisissez une ou plusieurs zones pour votre rendez-vous.</p>
          </div>
        </div>
        <div class="zones">
          <RouterLink v-for="(c, i) in zones" :key="c.id" :to="'/soins#' + c.slug" class="zone" :class="'t' + (i % 3)">
            <h3>{{ zoneName(c) }}</h3>
            <p>{{ c.services.length }} zones, dès {{ euros(minPrice(c)) }}</p>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Approche (trois piliers de la charte) -->
    <section class="section">
      <div class="container">
        <h2 style="max-width:18ch;margin-bottom:48px">Un soin adapté aux besoins de votre peau.</h2>
        <div class="pillars">
          <div><h3>Expertise</h3><p>Nous vous expliquons chaque soin simplement : son déroulé, ce qu’il apporte, les précautions à prendre.</p></div>
          <div><h3>Attention</h3><p>Un temps d’écoute avant chaque rendez-vous pour personnaliser le soin.</p></div>
          <div><h3>Élégance</h3><p>Un lieu calme, une hygiène rigoureuse et un moment rien que pour vous.</p></div>
        </div>
      </div>
    </section>

    <!-- Réserver : vraie séquence, donc numérotée -->
    <section class="section bg-navy">
      <div class="container">
        <div class="section-head">
          <h2>Réserver en ligne</h2>
          <RouterLink to="/reservation" class="btn light">Prendre rendez-vous</RouterLink>
        </div>
        <div class="steps">
          <div><h3>Choisissez votre soin</h3><p>Un soin du visage, une ou plusieurs zones d’épilation.</p></div>
          <div><h3>Choisissez votre créneau</h3><p>Le jour et l’heure qui vous conviennent, puis un acompte sécurisé en ligne.</p></div>
          <div><h3>Venez profiter de votre soin</h3><p>Le solde se règle sur place. Un rappel vous est envoyé la veille.</p></div>
        </div>
      </div>
    </section>

    <!-- Avis -->
    <section class="section" v-if="reviews.length">
      <div class="container">
        <div class="section-head">
          <h2>Ce qu’en disent nos clientes</h2>
          <RouterLink to="/avis" class="link-arrow">Tous les avis <Icon name="arrow-right" /></RouterLink>
        </div>
        <div class="grid c3">
          <div v-for="r in reviews" :key="r.id" class="card review">
            <div class="head"><Stars :value="Number(r.rating)" /><span class="muted small" v-if="r.service_name">{{ r.service_name }}</span></div>
            <blockquote>« {{ r.comment.length > 180 ? r.comment.slice(0, 180) + '…' : r.comment }} »</blockquote>
            <p class="who" style="margin:14px 0 0">{{ r.name }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Journal -->
    <section class="section" :class="{ 'bg-paper': reviews.length }" v-if="posts.length">
      <div class="container">
        <div class="section-head">
          <h2>Conseils peau</h2>
          <RouterLink to="/blog" class="link-arrow">Tous les articles <Icon name="arrow-right" /></RouterLink>
        </div>
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

    <!-- Signature -->
    <section class="section tight" style="padding-top:0">
      <div class="cta-band">
        <h2>Un moment pour vous.</h2>
        <RouterLink to="/reservation" class="btn">Prendre rendez-vous</RouterLink>
      </div>
    </section>
  </div>`,
};
