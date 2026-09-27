import { store, loadCatalog, loadConfig, allServices } from '../store.js';
import { api } from '../api.js';
import { ServiceCard, PostCard, NewsletterForm } from '../components/site.js';

export default {
  name: 'HomePage',
  components: { ServiceCard, PostCard, NewsletterForm },
  data: () => ({ posts: [], reviews: [], stats: null }),
  setup: () => ({ store }),
  computed: {
    config() { return store.config; },
    featured() {
      const all = allServices();
      const f = all.filter((s) => s.is_featured);
      return (f.length >= 3 ? f : all).slice(0, 3);
    },
    categories() { return store.catalog || []; },
    minPrice() {
      return (cat) => Math.min(...cat.services.map((s) => s.price_cents)) / 100;
    },
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
    <!-- HERO -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="container hero-grid">
        <div>
          <div class="eyebrow">{{ config?.tagline || 'Institut de soins de peau' }}<template v-if="config?.city"> · {{ config.city }}</template></div>
          <h1>Révélez l’éclat <em>naturel</em> de votre peau</h1>
          <p class="lead">Hydrafacial, soins dermatologiques et épilation : des protocoles experts, pensés pour votre peau, dans un cadre calme et raffiné.</p>
          <div class="actions">
            <RouterLink to="/reservation" class="btn">Réserver un soin <Icon name="arrow-right" /></RouterLink>
            <RouterLink to="/soins" class="btn ghost">Découvrir la carte</RouterLink>
          </div>
          <div class="hero-meta">
            <div><strong>{{ (store.catalog || []).reduce((n, c) => n + c.services.length, 0) || '—' }}</strong>soins à la carte</div>
            <div><strong>24/7</strong>réservation en ligne</div>
            <div v-if="stats?.count"><strong>{{ String(stats.average).replace('.', ',') }}/5</strong>{{ stats.count }} avis clientes</div>
            <div v-else><strong>{{ Math.round(Number(config?.deposit_value || 30)) }}{{ config?.deposit_type === 'fixed' ? ' €' : ' %' }}</strong>d’acompte seulement</div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-photo"><img src="/assets/img/hero.jpg" alt="Peau lumineuse après un soin DermaGlow" width="795" height="1086" fetchpriority="high"></div>
          <div class="hero-badge">
            <div class="num">48h</div>
            <div class="txt">L’éclat continue de s’amplifier après votre soin DermaBright.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- SOINS SIGNATURE -->
    <section class="section bg-paper">
      <div class="container">
        <div class="section-head">
          <div>
            <div class="eyebrow">Clinical Skin Treatments</div>
            <h2>Nos soins <em>signature</em></h2>
          </div>
          <RouterLink to="/soins" class="link-arrow">Toute la carte <Icon name="arrow-right" /></RouterLink>
        </div>
        <div class="grid c3" v-if="featured.length">
          <div v-for="(s, i) in featured" :key="s.id" v-reveal="i * 90"><ServiceCard :service="s" :index="i" /></div>
        </div>
        <div class="grid c3" v-else><div v-for="i in 3" :key="i" class="skeleton" style="height:290px"></div></div>
      </div>
    </section>

    <!-- UNIVERS -->
    <section class="section">
      <div class="container">
        <div class="center" style="margin-bottom:48px" v-reveal>
          <div class="eyebrow center">La carte</div>
          <h2>Un soin pour chaque <em>envie</em></h2>
        </div>
        <div class="grid c4">
          <RouterLink v-for="(c, i) in categories.slice(1)" :key="c.id" :to="'/soins#' + c.slug" class="card pad" v-reveal="i * 80" style="display:block">
            <div class="eyebrow" style="margin-bottom:10px">{{ c.name }}</div>
            <h3 style="font-size:1.55rem">{{ c.subtitle }}</h3>
            <p class="muted small">{{ c.services.length }} zones · dès {{ minPrice(c) }} €</p>
            <span class="link-arrow">Voir les tarifs <Icon name="arrow-right" /></span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- POURQUOI -->
    <section class="section tight">
      <div class="container grid c3">
        <div class="pillar" v-reveal>
          <div class="ic"><Icon name="sparkles" /></div>
          <h3>Des résultats visibles</h3>
          <p>Des technologies et des actifs choisis pour leur efficacité, avec un effet glow dès la première séance.</p>
        </div>
        <div class="pillar" v-reveal="90">
          <div class="ic"><Icon name="leaf" /></div>
          <h3>Un protocole sur-mesure</h3>
          <p>Chaque soin commence par un diagnostic de peau pour adapter le protocole à vos besoins réels.</p>
        </div>
        <div class="pillar" v-reveal="180">
          <div class="ic"><Icon name="shield" /></div>
          <h3>Hygiène & expertise</h3>
          <p>Un cadre clinique et apaisant, du matériel stérilisé et des praticiennes formées en continu.</p>
        </div>
      </div>
    </section>

    <!-- COMMENT ÇA MARCHE -->
    <section class="section bg-navy">
      <div class="container">
        <div class="section-head">
          <div>
            <div class="eyebrow" style="color:#8E9BB0">Réserver en toute simplicité</div>
            <h2>Trois étapes, <em style="color:var(--powder)">zéro stress</em></h2>
          </div>
          <RouterLink to="/reservation" class="btn light">Réserver maintenant <Icon name="arrow-right" /></RouterLink>
        </div>
        <div class="steps">
          <div v-reveal><h3>Choisissez vos soins</h3><p>Composez votre rendez-vous : un soin visage, une ou plusieurs zones d’épilation.</p></div>
          <div v-reveal="90"><h3>Bloquez votre créneau</h3><p>Choisissez le jour et l’heure qui vous conviennent, puis réglez un petit acompte sécurisé en ligne.</p></div>
          <div v-reveal="180"><h3>Profitez de votre soin</h3><p>Le solde se règle sur place. Vous recevez un rappel la veille de votre rendez-vous.</p></div>
        </div>
      </div>
    </section>

    <!-- AVIS -->
    <section class="section" v-if="reviews.length">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">Elles en parlent</div><h2>Avis <em>clientes</em></h2></div>
          <RouterLink to="/avis" class="link-arrow">Tous les avis <Icon name="arrow-right" /></RouterLink>
        </div>
        <div class="grid c3">
          <div v-for="(r, i) in reviews" :key="r.id" class="card review" v-reveal="i * 90">
            <div class="head"><Stars :value="Number(r.rating)" /><span class="muted small" v-if="r.service_name">{{ r.service_name }}</span></div>
            <blockquote>« {{ r.comment.length > 180 ? r.comment.slice(0, 180) + '…' : r.comment }} »</blockquote>
            <p class="who" style="margin:14px 0 0">— {{ r.name }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- JOURNAL -->
    <section class="section" :class="{ 'bg-paper': reviews.length }" v-if="posts.length">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">Le journal</div><h2>Conseils & <em>rituels</em></h2></div>
          <RouterLink to="/blog" class="link-arrow">Tous les articles <Icon name="arrow-right" /></RouterLink>
        </div>
        <div class="grid c3"><div v-for="(p, i) in posts" :key="p.id" v-reveal="i * 90"><PostCard :post="p" /></div></div>
      </div>
    </section>

    <!-- NEWSLETTER -->
    <section class="section tight">
      <div class="container">
        <div class="newsletter-band" v-reveal>
          <div>
            <div class="eyebrow" style="color:#8E9BB0">Newsletter</div>
            <h2>Le glow, <em style="color:var(--powder)">dans votre boîte mail</em></h2>
            <p style="margin:0">Conseils de nos expertes, nouveaux soins et offres réservées aux abonnées. Une à deux fois par mois, jamais plus.</p>
          </div>
          <NewsletterForm source="home" />
        </div>
      </div>
    </section>
  </div>`,
};
