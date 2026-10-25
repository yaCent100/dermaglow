import { store, loadConfig, toast } from '../store.js';
import { api } from '../api.js';
import { euros, duration, fmtShort, DAYS, DAY_ORDER } from '../utils.js';
import { Icon } from './ui.js';

export const SiteHeader = {
  name: 'SiteHeader',
  components: { Icon },
  data: () => ({ open: false, scrolled: false }),
  watch: { $route() { this.open = false; } },
  mounted() {
    this.onScroll = () => (this.scrolled = window.scrollY > 8);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  },
  unmounted() { window.removeEventListener('scroll', this.onScroll); },
  template: `
  <header class="site-header" :class="{scrolled: scrolled || open}">
    <div class="container inner">
      <RouterLink to="/" class="brand" aria-label="DermaGlow – accueil"><img src="/assets/img/logo.png" alt="DermaGlow" width="163" height="24"></RouterLink>
      <nav class="nav" aria-label="Navigation principale">
        <RouterLink to="/soins">Soins & tarifs</RouterLink>
        <RouterLink to="/blog">Journal</RouterLink>
        <RouterLink to="/avis">Avis</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
      </nav>
      <RouterLink to="/reservation" class="btn sm header-cta">Réserver</RouterLink>
      <button class="burger" @click="open=!open" :aria-expanded="open" aria-label="Menu"><Icon :name="open ? 'x' : 'menu'" /></button>
    </div>
    <nav class="mobile-nav" v-if="open">
      <RouterLink to="/">Accueil</RouterLink>
      <RouterLink to="/soins">Soins & tarifs</RouterLink>
      <RouterLink to="/blog">Journal</RouterLink>
      <RouterLink to="/avis">Avis</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
      <RouterLink to="/reservation" class="btn block">Réserver un soin</RouterLink>
    </nav>
  </header>`,
};

export const OpeningHours = {
  name: 'OpeningHours',
  props: { hours: [Object, Array] },
  computed: {
    rows() {
      const today = new Date().getDay();
      return DAY_ORDER.map((d) => {
        const r = (this.hours && this.hours[d]) || [];
        return { d, label: DAYS[d], today: d === today, text: r.length ? r.map((x) => x.join(' – ')).join(', ') : 'Fermé' };
      });
    },
  },
  template: `<div class="hours"><div v-for="r in rows" :key="r.d" :class="{today: r.today}"><span>{{ r.label }}</span><span>{{ r.text }}</span></div></div>`,
};

export const NewsletterForm = {
  name: 'NewsletterForm',
  components: { Icon },
  props: { source: { type: String, default: 'site' } },
  data: () => ({ email: '', consent: false, website: '', loading: false, done: '' }),
  methods: {
    async submit() {
      if (!this.consent) return toast('Merci de cocher la case de consentement.', 'error');
      this.loading = true;
      try {
        const r = await api.post('/newsletter/subscribe', { email: this.email, consent: this.consent, website: this.website, source: this.source });
        this.done = r.status;
      } catch (e) { toast(e.message, 'error'); } finally { this.loading = false; }
    },
  },
  template: `
  <div v-if="done" class="alert info" style="background:rgba(255,255,255,.1);color:#fff">
    <Icon name="mail" /><span v-if="done==='already'">Vous êtes déjà inscrite, merci ! 💌</span>
    <span v-else>Presque fini ! Confirmez votre inscription via l’e-mail que nous venons de vous envoyer.</span>
  </div>
  <form v-else @submit.prevent="submit" novalidate>
    <div class="nl-row">
      <label class="sr-only" for="nl-email">E-mail</label>
      <input id="nl-email" v-model.trim="email" type="email" required placeholder="Votre adresse e-mail" autocomplete="email">
      <input class="hp" v-model="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn light sm" :disabled="loading || !email">{{ loading ? '…' : 'Je m’inscris' }}</button>
    </div>
    <label class="check"><input type="checkbox" v-model="consent"> <span>J’accepte de recevoir la newsletter. Désinscription en un clic. <RouterLink to="/confidentialite">Confidentialité</RouterLink></span></label>
  </form>`,
};

export const SiteFooter = {
  name: 'SiteFooter',
  components: { Icon, OpeningHours },
  props: { flush: Boolean },
  setup() { loadConfig(); return { store, year: new Date().getFullYear() }; },
  template: `
  <footer class="site-footer" :class="{flush}">
    <div class="container">
      <div class="footer-grid">
        <div>
          <img src="/assets/img/logo-light.png" class="logo" alt="DermaGlow" width="170" height="25">
          <p style="max-width:34ch;color:var(--cream)">Votre peau. Toute notre attention.</p>
          <p style="max-width:34ch">{{ store.config?.tagline }}<template v-if="store.config?.city"> · {{ store.config.city }}</template></p>
          <a v-if="store.config?.instagram" :href="store.config.instagram" target="_blank" rel="noopener" class="row" style="gap:8px"><Icon name="instagram" /> Instagram</a>
        </div>
        <div>
          <h4>L’institut</h4>
          <ul>
            <li><RouterLink to="/soins">Soins & tarifs</RouterLink></li>
            <li><RouterLink to="/reservation">Réserver</RouterLink></li>
            <li><RouterLink to="/blog">Journal beauté</RouterLink></li>
            <li><RouterLink to="/avis">Avis clientes</RouterLink></li>
            <li><RouterLink to="/contact">Contact</RouterLink></li>
          </ul>
        </div>
        <div>
          <h4>Nous trouver</h4>
          <ul>
            <li class="row" style="gap:8px;align-items:flex-start"><Icon name="pin" /> <span>{{ store.config?.address }}<br>{{ store.config?.city }}</span></li>
            <li><a :href="'tel:' + (store.config?.phone || '').replace(/\\s/g,'')" class="row" style="gap:8px"><Icon name="phone" /> {{ store.config?.phone }}</a></li>
            <li><a :href="'mailto:' + store.config?.email" class="row" style="gap:8px"><Icon name="mail" /> {{ store.config?.email }}</a></li>
          </ul>
        </div>
        <div>
          <h4>Horaires</h4>
          <OpeningHours :hours="store.config?.opening_hours" />
        </div>
      </div>
      <div class="footer-mark"><img src="/assets/img/logo-light.png" alt="" width="734" height="108" loading="lazy"></div>
      <div class="footer-bottom">
        <span>© {{ year }} {{ store.config?.salon_name || 'DermaGlow' }}. Tous droits réservés.</span>
        <span class="row" style="gap:20px"><RouterLink to="/conditions">Conditions de réservation</RouterLink><RouterLink to="/confidentialite">Confidentialité</RouterLink></span>
      </div>
    </div>
  </footer>`,
};

export const ServiceCard = {
  name: 'ServiceCard',
  components: { Icon },
  props: { service: Object, index: Number },
  setup: () => ({ euros, duration }),
  template: `
  <RouterLink :to="'/soins/' + service.slug" class="svc-card">
    <div class="num">{{ String((index ?? 0) + 1).padStart(2, '0') }}</div>
    <h3>{{ service.name }}</h3>
    <p>{{ service.short_description || service.description }}</p>
    <div class="foot">
      <span class="dur"><Icon name="clock" /> {{ duration(service.duration_min) }}</span>
      <span class="price">{{ euros(service.price_cents) }}</span>
    </div>
  </RouterLink>`,
};

export const PostCover = {
  name: 'PostCover',
  props: { post: Object },
  computed: { variant() { return 'v' + ((this.post?.id || this.post?.title?.length || 0) % 3); } },
  template: `<img v-if="post.cover_image" :src="post.cover_image" :alt="post.title" loading="lazy">
    <div v-else class="cover-placeholder" :class="variant"><span>{{ post.category || 'Journal' }}</span></div>`,
};

export const PostCard = {
  name: 'PostCard',
  components: { PostCover },
  props: { post: Object },
  setup: () => ({ fmtShort }),
  template: `
  <RouterLink :to="'/blog/' + post.slug" class="post-card">
    <div class="cover"><PostCover :post="post" /></div>
    <div class="body">
      <div class="cat">{{ post.category || 'Journal' }}</div>
      <h3>{{ post.title }}</h3>
      <p>{{ post.excerpt }}</p>
      <div class="foot"><span>{{ fmtShort(post.published_at) }}</span><span>· {{ post.reading_minutes }} min de lecture</span></div>
    </div>
  </RouterLink>`,
};
