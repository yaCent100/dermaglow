import { api } from '../api.js';
import { store, loadCatalog, allServices, toast } from '../store.js';
import { fmtShort } from '../utils.js';
import { StarInput } from '../components/ui.js';

export default {
  name: 'ReviewsPage',
  components: { StarInput },
  data: () => ({
    list: [], meta: null, stats: null, loading: true, filter: 0,
    showForm: false, ctx: null, sent: false, busy: false, errors: {},
    form: { name: '', email: '', rating: 0, title: '', comment: '', service_id: '', website: '' },
  }),
  computed: {
    services() { return this.ctx?.services?.length ? this.ctx.services : allServices(); },
    link() { return this.$route.query.ref && this.$route.query.t ? { ref: this.$route.query.ref, t: this.$route.query.t } : null; },
  },
  async created() {
    loadCatalog();
    this.load();
    if (this.link) {
      try {
        this.ctx = await api.get('/reviews/context', this.link);
        this.form.name = this.ctx.name;
        if (this.ctx.services.length === 1) this.form.service_id = this.ctx.services[0].id;
        this.showForm = !this.ctx.already;
        if (this.ctx.already) this.sent = true;
      } catch { /* lien invalide : formulaire classique */ }
    }
  },
  methods: {
    fmtShort,
    async load(page = 1) {
      this.loading = true;
      try {
        const r = await api.get('/reviews', { page, rating: this.filter || '' });
        this.list = page > 1 ? [...this.list, ...r.data] : r.data; this.meta = r.meta; this.stats = r.stats;
      } finally { this.loading = false; }
    },
    setFilter(n) { this.filter = this.filter === n ? 0 : n; this.load(); },
    pct(n) { return this.stats?.count ? Math.round((this.stats.distribution[n] || 0) / this.stats.count * 100) : 0; },
    async submit() {
      if (!this.form.rating) return toast('Choisissez une note de 1 à 5 étoiles.', 'error');
      this.busy = true; this.errors = {};
      try {
        await api.post('/reviews', { ...this.form, ...(this.link || {}) });
        this.sent = true; this.showForm = false;
      } catch (e) { this.errors = e.fields || {}; toast(e.message, 'error'); } finally { this.busy = false; }
    },
  },
  template: `
  <div>
    <section class="page-head">
      <div class="container">
        <div class="eyebrow">Avis clientes</div>
        <h1>Vos mots, <em>notre fierté</em></h1>
        <p class="lead">Tous les avis sont publiés après vérification. Le badge « Cliente vérifiée » signale un avis laissé suite à un rendez-vous réservé chez nous.</p>
      </div>
    </section>

    <div class="container">
      <div class="reviews-layout">
        <aside class="card pad reviews-side">
          <div class="rating-summary" v-if="stats?.count">
            <div class="center"><div class="big">{{ String(stats.average).replace('.', ',') }}</div><Stars :value="stats.average" /><div class="small muted">{{ stats.count }} avis</div></div>
            <div style="display:grid;gap:6px">
              <button v-for="n in [5,4,3,2,1]" :key="n" class="bar-row" style="background:none;border:0;cursor:pointer;padding:2px 0" :style="{opacity: filter && filter !== n ? .4 : 1}" @click="setFilter(n)">
                <span>{{ n }}★</span><span class="bar"><i :style="{width: pct(n) + '%'}"></i></span><span>{{ stats.distribution[n] || 0 }}</span>
              </button>
            </div>
          </div>
          <p v-else class="muted">Aucun avis publié pour le moment. Soyez la première à partager votre expérience !</p>
          <hr class="divider">
          <div v-if="sent" class="alert success"><Icon name="check" /><span>Merci pour votre avis ! Il sera publié après validation par notre équipe.</span></div>
          <button v-else-if="!showForm" class="btn block" @click="showForm = true"><Icon name="edit" /> Laisser un avis</button>

          <form v-if="showForm" @submit.prevent="submit" class="stack" novalidate>
            <h3 class="mb-0">Votre avis</h3>
            <div v-if="ctx" class="alert info small"><Icon name="shield" /><span>Merci {{ ctx.name }} ! Votre avis sera marqué « Cliente vérifiée ».</span></div>
            <div class="field"><span class="label">Votre note *</span><StarInput v-model="form.rating" /></div>
            <div class="field"><label for="rv-name">Prénom (affiché) *</label><input id="rv-name" class="input" :class="{err: errors.name}" v-model.trim="form.name" maxlength="100"></div>
            <div class="field" v-if="!ctx"><label for="rv-email">E-mail <span class="muted">(non publié)</span></label><input id="rv-email" type="email" class="input" v-model.trim="form.email"></div>
            <div class="field"><label for="rv-svc">Soin reçu</label>
              <select id="rv-svc" class="select" v-model="form.service_id"><option value="">— Non précisé —</option><option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
            <div class="field"><label for="rv-title">Titre</label><input id="rv-title" class="input" v-model="form.title" maxlength="150" placeholder="Ex. Une peau transformée"></div>
            <div class="field"><label for="rv-c">Votre expérience *</label><textarea id="rv-c" class="textarea" :class="{err: errors.comment}" v-model="form.comment" maxlength="2000"></textarea></div>
            <input class="hp" v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button class="btn block" :disabled="busy">{{ busy ? 'Envoi…' : 'Publier mon avis' }}</button>
          </form>
        </aside>

        <div>
          <div v-if="list.length" class="stack">
            <div v-for="r in list" :key="r.id" class="card review">
              <div class="head">
                <div><Stars :value="Number(r.rating)" /><div class="who" style="margin-top:6px">{{ r.name }} <span v-if="Number(r.is_verified)" class="pill-badge" style="margin-left:6px">✓ Cliente vérifiée</span></div></div>
                <div class="small muted" style="text-align:right">{{ fmtShort(r.created_at) }}<br><RouterLink v-if="r.service_slug" :to="'/soins/' + r.service_slug" class="link">{{ r.service_name }}</RouterLink></div>
              </div>
              <h4 v-if="r.title" style="font-family:var(--sans);font-size:1rem;font-weight:600;margin-bottom:6px">{{ r.title }}</h4>
              <blockquote>{{ r.comment }}</blockquote>
              <div v-if="r.reply" class="reply"><strong>Réponse de DermaGlow</strong><br>{{ r.reply }}</div>
            </div>
            <div class="center" v-if="meta && meta.page < meta.pages"><button class="btn ghost" @click="load(meta.page + 1)">Voir plus d’avis</button></div>
          </div>
          <div v-else-if="loading" class="skeleton" style="height:240px"></div>
          <div v-else class="card"><Empty icon="star" :text="filter ? 'Aucun avis avec cette note.' : 'Les premiers avis arrivent bientôt.'" /></div>
        </div>
      </div>
    </div>
  </div>`,
};
