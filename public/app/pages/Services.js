import { store, loadCatalog, toggleCart, allServices } from '../store.js';
import { euros, duration } from '../utils.js';

export default {
  name: 'ServicesPage',
  data: () => ({ active: null, error: '' }),
  computed: {
    catalog() { return store.catalog || []; },
    cart() { return store.cart; },
    selected() { return allServices().filter((s) => store.cart.includes(s.id)); },
    total() { return this.selected.reduce((n, s) => n + s.price_cents, 0); },
    totalDuration() { return this.selected.reduce((n, s) => n + s.duration_min, 0); },
  },
  async created() {
    try { await loadCatalog(); } catch (e) { this.error = e.message; }
    this.$nextTick(() => {
      if (this.$route.hash) document.querySelector(this.$route.hash)?.scrollIntoView({ behavior: 'smooth' });
      this.observe();
    });
  },
  unmounted() { this.obs?.disconnect(); },
  methods: {
    euros, duration, toggleCart,
    go(slug) {
      this.active = slug;
      document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(history.state, '', '#' + slug);
    },
    observe() {
      if (typeof IntersectionObserver === 'undefined') return;
      this.obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) this.active = e.target.id; });
      }, { rootMargin: '-40% 0px -55% 0px' });
      document.querySelectorAll('.menu-cat').forEach((el) => this.obs.observe(el));
    },
  },
  template: `
  <div>
    <section class="page-head">
      <div class="container">
        <div class="eyebrow">Nos prix</div>
        <h1>Soins <em>&</em> tarifs</h1>
        <p class="lead">Sélectionnez un ou plusieurs soins avec le bouton <strong>+</strong>, puis choisissez votre créneau. Un acompte confirme votre réservation, le solde se règle sur place.</p>
      </div>
    </section>

    <div class="container">
      <div v-if="error" class="alert error"><Icon name="alert" />{{ error }}</div>
      <nav class="menu-nav" aria-label="Catégories" v-if="catalog.length">
        <button v-for="c in catalog" :key="c.id" class="chip" :class="{active: active === c.slug}" @click="go(c.slug)">{{ c.subtitle || c.name }}</button>
      </nav>

      <template v-if="catalog.length">
        <section v-for="c in catalog" :key="c.id" :id="c.slug" class="card menu-cat">
          <div class="menu-cat-head">
            <h2>{{ c.name }}</h2>
            <span class="sub">{{ c.subtitle }}</span>
            <p v-if="c.description">{{ c.description }}</p>
          </div>
          <div v-for="s in c.services" :key="s.id" class="menu-item" :class="{selected: cart.includes(s.id)}">
            <div class="name">
              <RouterLink :to="'/soins/' + s.slug">{{ s.name }}</RouterLink>
              <span v-if="s.is_featured" class="pill-badge">Signature</span>
            </div>
            <p class="desc" v-if="s.description">{{ s.description }}</p>
            <div class="meta">
              <span class="dur">{{ duration(s.duration_min) }}</span>
              <span class="price">{{ euros(s.price_cents) }}</span>
            </div>
            <button class="add-btn add" :class="{on: cart.includes(s.id)}" @click="toggleCart(s.id)"
              :aria-pressed="cart.includes(s.id)" :aria-label="(cart.includes(s.id) ? 'Retirer ' : 'Ajouter ') + s.name">
              <Icon :name="cart.includes(s.id) ? 'check' : 'plus'" />
            </button>
          </div>
        </section>
      </template>
      <div v-else-if="!error"><div v-for="i in 3" :key="i" class="skeleton" style="height:320px;margin-bottom:24px"></div></div>

      <p class="small muted center" style="margin-top:32px">Les durées sont indicatives et incluent la préparation. Tarifs TTC.</p>
    </div>

    <Transition name="fade">
      <div class="cart-bar" v-if="selected.length">
        <div class="info">
          <div>{{ selected.length }} soin{{ selected.length > 1 ? 's' : '' }} · {{ duration(totalDuration) }}</div>
          <strong>{{ euros(total) }}</strong>
        </div>
        <RouterLink to="/reservation" class="btn light">Choisir un créneau <Icon name="arrow-right" /></RouterLink>
      </div>
    </Transition>
  </div>`,
};
