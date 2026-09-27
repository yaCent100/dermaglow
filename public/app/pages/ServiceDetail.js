import { api } from '../api.js';
import { store, toggleCart } from '../store.js';
import { euros, duration, setTitle } from '../utils.js';
import { ServiceCard } from '../components/site.js';

export default {
  name: 'ServiceDetailPage',
  components: { ServiceCard },
  data: () => ({ s: null, notFound: false }),
  computed: { inCart() { return this.s && store.cart.includes(this.s.id); } },
  watch: { '$route.params.slug': { immediate: true, handler() { this.load(); } } },
  methods: {
    euros, duration,
    async load() {
      if (!this.$route.params.slug) return;
      this.s = null; this.notFound = false;
      try { this.s = await api.get('/services/' + this.$route.params.slug); setTitle(this.s.name); }
      catch { this.notFound = true; setTitle('Soin introuvable'); }
    },
    book() {
      if (!this.inCart) toggleCart(this.s.id);
      this.$router.push('/reservation');
    },
  },
  template: `
  <div>
    <div v-if="notFound" class="container state">
      <div class="ring bad"><Icon name="x" /></div>
      <h2>Ce soin n’existe plus</h2>
      <RouterLink to="/soins" class="btn">Voir la carte</RouterLink>
    </div>
    <template v-else-if="s">
      <section class="page-head">
        <div class="container">
          <RouterLink :to="'/soins#' + s.category_slug" class="link-arrow" style="margin-bottom:28px"><Icon name="arrow-left" /> {{ s.category_subtitle || s.category_name }}</RouterLink>
          <div class="grid c2" style="align-items:end;gap:48px">
            <div>
              <div class="eyebrow">{{ s.category_name }}</div>
              <h1>{{ s.name }}</h1>
              <p class="lead">{{ s.description || s.short_description }}</p>
            </div>
            <div class="card pad">
              <div class="summary-line"><span class="l muted">Durée</span><span class="r">{{ duration(s.duration_min) }}</span></div>
              <div class="summary-line"><span class="l muted">Acompte en ligne</span><span class="r">{{ euros(s.deposit_cents) }}</span></div>
              <div class="summary-total"><span>Prix</span><span class="v">{{ euros(s.price_cents) }}</span></div>
              <div class="row" style="margin-top:22px">
                <button class="btn grow" @click="book">Réserver ce soin <Icon name="arrow-right" /></button>
                <button class="btn ghost" @click="toggleCart(s.id)" :aria-pressed="inCart" :title="inCart ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'">
                  <Icon :name="inCart ? 'check' : 'plus'" />
                </button>
              </div>
              <p class="small muted" style="margin:14px 0 0">Le solde de {{ euros(s.price_cents - s.deposit_cents) }} se règle sur place.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section tight" v-if="s.reviews?.length">
        <div class="container">
          <h2 style="font-size:2rem">Ce qu’elles en pensent</h2>
          <div class="grid c2">
            <div v-for="(r, i) in s.reviews" :key="i" class="card review">
              <div class="head"><Stars :value="Number(r.rating)" /><span class="small muted" v-if="Number(r.is_verified)">✓ Cliente vérifiée</span></div>
              <blockquote>« {{ r.comment }} »</blockquote>
              <p class="who" style="margin:12px 0 0">— {{ r.name }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section tight" v-if="s.related?.length">
        <div class="container">
          <div class="section-head"><h2 style="font-size:2rem">Dans la même catégorie</h2></div>
          <div class="grid c3"><ServiceCard v-for="(r, i) in s.related" :key="r.id" :service="r" :index="i" /></div>
        </div>
      </section>
    </template>
    <div v-else class="container" style="padding:80px var(--gutter)"><div class="skeleton" style="height:300px"></div></div>
  </div>`,
  setup: () => ({ toggleCart }),
};
