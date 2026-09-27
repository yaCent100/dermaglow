import { api } from '../api.js';
import { store, loadCatalog, loadConfig, toggleCart, allServices } from '../store.js';
import { euros, duration, fmtDate, cap } from '../utils.js';
import Calendar from '../components/Calendar.js';

const STEPS = ['Soins', 'Date & heure', 'Coordonnées', 'Confirmation'];

function readForm() {
  try { return JSON.parse(sessionStorage.getItem('dg_form') || 'null'); } catch { return null; }
}

export default {
  name: 'BookingPage',
  components: { Calendar },
  data: () => ({
    step: 0,
    steps: STEPS,
    date: '',
    time: '',
    month: '',
    days: {},
    slots: [],
    loadingDays: false,
    loadingSlots: false,
    submitting: false,
    error: '',
    fieldErrors: {},
    form: readForm() || { first_name: '', last_name: '', email: '', phone: '', notes: '', newsletter: false, accept_terms: false, website: '' },
  }),
  computed: {
    catalog() { return store.catalog || []; },
    config() { return store.config; },
    selected() { const all = allServices(); return store.cart.map((id) => all.find((s) => s.id === id)).filter(Boolean); },
    total() { return this.selected.reduce((n, s) => n + s.price_cents, 0); },
    totalDuration() { return this.selected.reduce((n, s) => n + s.duration_min, 0); },
    deposit() {
      // Aperçu : l'API recalcule le montant exact
      if (!this.selected.length || !this.config) return 0;
      let sum = 0;
      const pct = Number(this.config.deposit_value || 30);
      for (const s of this.selected) {
        if (this.config.deposit_type === 'fixed') sum = Math.max(sum, Math.round(pct * 100));
        else sum += s.deposit_cents ?? Math.round(s.price_cents * pct / 100);
      }
      return Math.min(Math.max(sum, Number(this.config.deposit_min_cents || 0)), this.total);
    },
    serviceIds() { return this.selected.map((s) => s.id).join(','); },
    slotGroups() {
      const g = [
        { label: 'Matin', items: this.slots.filter((t) => t < '12:00') },
        { label: 'Après-midi', items: this.slots.filter((t) => t >= '12:00' && t < '17:00') },
        { label: 'Fin de journée', items: this.slots.filter((t) => t >= '17:00') },
      ];
      return g.filter((x) => x.items.length);
    },
    canNext() {
      if (this.step === 0) return this.selected.length > 0;
      if (this.step === 1) return !!(this.date && this.time);
      if (this.step === 2) return this.form.first_name && this.form.last_name && /.+@.+\..+/.test(this.form.email) && this.form.phone.length >= 6;
      return this.form.accept_terms;
    },
    maxDays() { return Number(this.config?.max_advance_days || 60); },
  },
  watch: {
    serviceIds() { this.time = ''; this.slots = []; this.days = {}; if (this.month) this.loadMonth(this.month); if (this.date) this.loadSlots(); },
    date(v) { this.time = ''; if (v) this.loadSlots(); },
    form: { deep: true, handler(v) { try { sessionStorage.setItem('dg_form', JSON.stringify({ ...v, accept_terms: false, website: '' })); } catch { /* ignore */ } } },
  },
  async created() {
    loadConfig();
    await loadCatalog();
    // Soin passé dans l'URL : /reservation?soin=hydrafacial-expert-signature
    const slug = this.$route.query.soin;
    if (slug) { const s = allServices().find((x) => x.slug === slug); if (s && !store.cart.includes(s.id)) toggleCart(s.id); }
    if (this.selected.length && this.$route.query.etape !== '0') this.step = 1;
  },
  methods: {
    euros, duration, fmtDate, cap, toggleCart,
    inCart(id) { return store.cart.includes(id); },
    goto(i) { if (i < this.step) { this.step = i; this.scrollTop(); } },
    next() {
      if (!this.canNext) return;
      if (this.step === 3) return this.submit();
      this.step++; this.scrollTop();
    },
    back() { if (this.step > 0) { this.step--; this.scrollTop(); } },
    scrollTop() { this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' })); },
    async loadMonth(m) {
      this.month = m;
      if (!this.serviceIds) return;
      this.loadingDays = true;
      try {
        const r = await api.get('/availability/month', { month: m, services: this.serviceIds });
        this.days = { ...this.days, ...r.days };
        if (this.date && !(this.days[this.date] > 0)) this.date = '';
      } catch (e) { this.error = e.message; } finally { this.loadingDays = false; }
    },
    async loadSlots() {
      this.loadingSlots = true; this.slots = [];
      try {
        const r = await api.get('/availability', { date: this.date, services: this.serviceIds });
        this.slots = r.slots;
      } catch (e) { this.error = e.message; } finally { this.loadingSlots = false; }
    },
    async submit() {
      this.submitting = true; this.error = ''; this.fieldErrors = {};
      try {
        const r = await api.post('/bookings', { services: this.selected.map((s) => s.id), date: this.date, time: this.time, ...this.form });
        try { sessionStorage.setItem('dg_last_booking', JSON.stringify({ ref: r.reference, t: r.token })); } catch { /* ignore */ }
        window.location.assign(r.checkout_url);
      } catch (e) {
        this.error = e.message; this.fieldErrors = e.fields || {};
        if (e.status === 409) { this.step = 1; this.time = ''; this.loadSlots(); this.loadMonth(this.month); }
        else if (Object.keys(this.fieldErrors).some((k) => ['first_name', 'last_name', 'email', 'phone'].includes(k))) this.step = 2;
        this.submitting = false;
        this.scrollTop();
      }
    },
  },
  template: `
  <div>
    <section class="page-head" style="padding-bottom:24px">
      <div class="container">
        <div class="eyebrow">Réservation en ligne</div>
        <h1>Réserver votre <em>soin</em></h1>
      </div>
    </section>

    <div class="container">
      <div class="stepper" role="list">
        <button v-for="(s, i) in steps" :key="s" role="listitem" class="st" :class="{current: i === step, done: i < step}" @click="goto(i)" :aria-current="i === step ? 'step' : null">
          <span class="n"><Icon v-if="i < step" name="check" size="14" /><template v-else>{{ i + 1 }}</template></span><span class="lbl">{{ s }}</span>
        </button>
      </div>

      <div class="booking-layout">
        <div>
          <div v-if="error" class="alert error" style="margin-bottom:20px"><Icon name="alert" /><span>{{ error }}</span></div>

          <!-- 1. SOINS -->
          <div v-show="step === 0" class="card pad">
            <h3>Quels soins souhaitez-vous ?</h3>
            <p class="muted small">Vous pouvez combiner plusieurs soins dans le même rendez-vous.</p>
            <div v-if="!catalog.length" class="skeleton" style="height:240px"></div>
            <details v-for="(c, ci) in catalog" :key="c.id" class="cat" :open="ci === 0 || c.services.some(s => inCart(s.id))">
              <summary><span>{{ c.subtitle || c.name }} <small>{{ c.services.length }} soins</small></span><Icon name="chevron-down" /></summary>
              <div class="pick-list">
                <button v-for="s in c.services" :key="s.id" type="button" class="pick" :class="{on: inCart(s.id)}" @click="toggleCart(s.id)" :aria-pressed="inCart(s.id)">
                  <span><span class="t">{{ s.name }}</span><br><span class="d">{{ duration(s.duration_min) }}</span></span>
                  <span class="p">{{ euros(s.price_cents) }}</span>
                  <span class="ck"><Icon name="check" /></span>
                </button>
              </div>
            </details>
          </div>

          <!-- 2. DATE & HEURE -->
          <div v-show="step === 1" class="date-step">
            <div class="card pad">
              <Calendar v-model="date" :availability="days" :loading="loadingDays" :max-days="maxDays" @month="loadMonth" />
              <p class="small muted" style="margin:14px 0 0"><Icon name="info" size="14" style="display:inline;vertical-align:-2px" /> Les jours marqués d’un point ont des disponibilités pour {{ duration(totalDuration) }}.</p>
            </div>
            <div class="card pad">
              <template v-if="!date">
                <h4 class="mt-0">Choisissez une date</h4>
                <p class="muted small mb-0">Les créneaux disponibles s’afficheront ici.</p>
              </template>
              <template v-else>
                <h4 class="mt-0">{{ cap(fmtDate(date)) }}</h4>
                <div v-if="loadingSlots" class="center" style="padding:24px"><Spinner /></div>
                <p v-else-if="!slots.length" class="muted">Plus de créneau ce jour-là. Essayez une autre date.</p>
                <div v-else>
                  <div v-for="g in slotGroups" :key="g.label" class="slot-group">
                    <h5>{{ g.label }}</h5>
                    <div class="slots"><button v-for="t in g.items" :key="t" type="button" class="slot" :class="{on: time === t}" @click="time = t">{{ t.replace(':', 'h') }}</button></div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 3. COORDONNÉES -->
          <form v-show="step === 2" class="card pad" @submit.prevent="next" novalidate>
            <h3>Vos coordonnées</h3>
            <p class="muted small">Pour vous envoyer la confirmation et vous prévenir en cas d’imprévu.</p>
            <div class="form-grid">
              <div class="field"><label for="fn">Prénom *</label><input id="fn" class="input" :class="{err: fieldErrors.first_name}" v-model.trim="form.first_name" autocomplete="given-name" required></div>
              <div class="field"><label for="ln">Nom *</label><input id="ln" class="input" :class="{err: fieldErrors.last_name}" v-model.trim="form.last_name" autocomplete="family-name" required></div>
              <div class="field"><label for="em">E-mail *</label><input id="em" type="email" class="input" :class="{err: fieldErrors.email}" v-model.trim="form.email" autocomplete="email" required></div>
              <div class="field"><label for="ph">Téléphone *</label><input id="ph" type="tel" class="input" :class="{err: fieldErrors.phone}" v-model.trim="form.phone" autocomplete="tel" placeholder="+32 4xx xx xx xx" required></div>
              <div class="field full"><label for="nt">Un message pour nous ? <span class="muted">(allergies, grossesse, première visite…)</span></label><textarea id="nt" class="textarea" v-model="form.notes" rows="3" maxlength="1000"></textarea></div>
              <input class="hp" v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true">
              <label class="check full"><input type="checkbox" v-model="form.newsletter"> <span>Je souhaite recevoir les conseils et offres DermaGlow par e-mail.</span></label>
            </div>
            <button type="submit" class="sr-only">Continuer</button>
          </form>

          <!-- 4. RÉCAP -->
          <div v-show="step === 3" class="card pad">
            <h3>Vérifiez et confirmez</h3>
            <dl class="kv" style="margin:18px 0 22px">
              <dt>Date</dt><dd>{{ cap(fmtDate(date)) }} à {{ time.replace(':', 'h') }}</dd>
              <dt>Durée</dt><dd>{{ duration(totalDuration) }}</dd>
              <dt>Nom</dt><dd>{{ form.first_name }} {{ form.last_name }}</dd>
              <dt>Contact</dt><dd>{{ form.email }} · {{ form.phone }}</dd>
              <template v-if="form.notes"><dt>Message</dt><dd>{{ form.notes }}</dd></template>
            </dl>
            <div class="alert info" style="margin-bottom:18px">
              <Icon name="lock" />
              <span>Vous allez être redirigée vers notre page de paiement sécurisée pour régler l’acompte de <strong>{{ euros(deposit) }}</strong>. Votre créneau est bloqué pendant {{ config?.pending_minutes || 30 }} minutes.</span>
            </div>
            <label class="check"><input type="checkbox" v-model="form.accept_terms"> <span>J’accepte les <RouterLink to="/conditions" target="_blank" class="link">conditions de réservation</RouterLink> : acompte remboursé en cas d’annulation au moins {{ config?.cancellation_hours || 48 }} h avant le rendez-vous.</span></label>
            <p v-if="config?.payment_mode === 'simulation'" class="small" style="margin:16px 0 0;color:var(--warning)"><Icon name="info" size="14" style="display:inline;vertical-align:-2px" /> Mode test : le paiement est simulé (aucune clé Stripe configurée).</p>
          </div>

          <div class="row between" style="margin-top:22px">
            <button class="btn ghost" v-if="step > 0" @click="back" :disabled="submitting"><Icon name="arrow-left" /> Retour</button>
            <span v-else></span>
            <button class="btn" @click="next" :disabled="!canNext || submitting">
              <template v-if="submitting"><Spinner /> Redirection…</template>
              <template v-else-if="step === 3"><Icon name="lock" /> Payer l’acompte de {{ euros(deposit) }}</template>
              <template v-else>Continuer <Icon name="arrow-right" /></template>
            </button>
          </div>
        </div>

        <!-- RÉSUMÉ -->
        <aside class="booking-summary card pad">
          <div class="eyebrow" style="margin-bottom:12px">Votre rendez-vous</div>
          <p v-if="!selected.length" class="muted small">Aucun soin sélectionné pour l’instant.</p>
          <div v-for="s in selected" :key="s.id" class="summary-line">
            <span class="l">{{ s.name }}<br><span class="small muted">{{ duration(s.duration_min) }}</span></span>
            <span class="r">{{ euros(s.price_cents) }}
              <button v-if="step === 0" class="icon-btn" style="width:28px;height:28px;display:inline-grid;vertical-align:middle" @click="toggleCart(s.id)" :aria-label="'Retirer ' + s.name"><Icon name="x" size="14" /></button>
            </span>
          </div>
          <div v-if="date && step > 0" class="summary-line" style="border-top:1px solid var(--cream-2);margin-top:6px;padding-top:12px">
            <span class="l row" style="gap:8px"><Icon name="calendar" size="16" /> {{ cap(fmtDate(date, { weekday: 'short', day: 'numeric', month: 'long' })) }}</span>
            <span class="r">{{ time ? time.replace(':', 'h') : '—' }}</span>
          </div>
          <div class="summary-total" v-if="selected.length"><span>Total · {{ duration(totalDuration) }}</span><span class="v">{{ euros(total) }}</span></div>
          <div class="deposit-box" v-if="selected.length">
            <div class="row between"><span>Acompte à régler en ligne</span><span class="v">{{ euros(deposit) }}</span></div>
            <div class="small" style="opacity:.8;margin-top:4px">Solde de {{ euros(total - deposit) }} à régler sur place.</div>
          </div>
        </aside>
      </div>
    </div>
  </div>`,
};
