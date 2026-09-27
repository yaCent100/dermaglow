import { api } from '../api.js';
import { clearCart, store, loadConfig } from '../store.js';
import { euros, fmtDateTime, cap, duration } from '../utils.js';

export default {
  name: 'BookingConfirmationPage',
  data: () => ({ b: null, error: '', tries: 0, released: false }),
  computed: {
    q() { return this.$route.query; },
    state() {
      if (this.error) return 'error';
      if (!this.b) return 'loading';
      if (this.b.status === 'confirmed' || this.b.payment_status === 'deposit_paid') return 'ok';
      if (this.q.cancelled || this.released) return 'cancelled';
      if (this.b.status === 'expired' || this.b.status === 'cancelled') return 'expired';
      return 'waiting';
    },
    config() { return store.config; },
    manageUrl() { return `/mon-rendez-vous?ref=${this.q.ref}&t=${this.q.t}`; },
  },
  async created() { loadConfig(); await this.load(); },
  unmounted() { clearTimeout(this.timer); },
  methods: {
    euros, fmtDateTime, cap, duration,
    async load() {
      try {
        this.b = await api.get('/bookings/' + this.q.ref, { t: this.q.t, session_id: this.q.session_id || '' });
        if (this.state === 'ok') {
          clearCart();
          try { sessionStorage.removeItem('dg_form'); } catch { /* ignore */ }
        } else if (this.state === 'cancelled' && !this.released && this.b.status === 'pending_payment') {
          // Paiement abandonné : on libère le créneau immédiatement
          await api.post(`/bookings/${this.q.ref}/abandon?t=${this.q.t}`).catch(() => {});
          this.released = true;
        } else if (this.state === 'waiting' && this.tries < 15) {
          // Le webhook Stripe peut arriver quelques secondes après la redirection
          this.tries++;
          this.timer = setTimeout(() => this.load(), 2000);
        }
      } catch (e) { this.error = e.message; }
    },
  },
  template: `
  <section class="section">
    <div class="container narrow">
      <div v-if="state === 'loading' || state === 'waiting'" class="state">
        <div class="ring wait"><Spinner lg /></div>
        <h2>Vérification du paiement…</h2>
        <p class="muted">Cela ne prend que quelques secondes.</p>
      </div>

      <div v-else-if="state === 'ok'">
        <div class="state" style="padding-bottom:32px">
          <div class="ring"><Icon name="check" /></div>
          <div class="eyebrow center">Réservation {{ b.reference }}</div>
          <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">Merci {{ b.first_name }}, <em>c’est confirmé</em> !</h1>
          <p class="lead mx-auto">Un e-mail de confirmation vient d’être envoyé à <strong>{{ b.email }}</strong>. Nous avons hâte de vous accueillir.</p>
        </div>
        <div class="card pad">
          <div class="row between" style="margin-bottom:10px">
            <h3 class="mb-0">{{ cap(fmtDateTime(b.start_at)) }}</h3>
            <span class="badge confirmed">Confirmé</span>
          </div>
          <div v-for="i in b.items" :key="i.service_name" class="summary-line"><span class="l">{{ i.service_name }} <span class="muted small">· {{ duration(i.duration_min) }}</span></span><span class="r">{{ euros(i.price_cents) }}</span></div>
          <div class="summary-line" style="color:var(--success)"><span>Acompte payé</span><span>− {{ euros(b.deposit_cents) }}</span></div>
          <div class="summary-total"><span>Reste à régler sur place</span><span class="v">{{ euros(b.balance_cents) }}</span></div>
          <hr class="divider">
          <div class="row" style="gap:10px">
            <span class="row muted small" style="gap:8px"><Icon name="pin" size="16" /> {{ config?.address }}, {{ config?.city }}</span>
          </div>
          <div class="row" style="margin-top:22px">
            <RouterLink :to="manageUrl" class="btn ghost">Gérer mon rendez-vous</RouterLink>
            <RouterLink to="/" class="btn">Retour à l’accueil</RouterLink>
          </div>
        </div>
      </div>

      <div v-else-if="state === 'cancelled'" class="state">
        <div class="ring bad"><Icon name="x" /></div>
        <h2>Paiement annulé</h2>
        <p class="muted">Aucun montant n’a été prélevé et le créneau a été libéré. Vous pouvez recommencer quand vous le souhaitez.</p>
        <RouterLink to="/reservation" class="btn">Reprendre ma réservation</RouterLink>
      </div>

      <div v-else-if="state === 'expired'" class="state">
        <div class="ring bad"><Icon name="clock" /></div>
        <h2>Délai de paiement dépassé</h2>
        <p class="muted">Le créneau a été libéré. Si un paiement a été débité, contactez-nous : nous confirmerons votre rendez-vous.</p>
        <RouterLink to="/reservation" class="btn">Choisir un nouveau créneau</RouterLink>
      </div>

      <div v-else class="state">
        <div class="ring bad"><Icon name="alert" /></div>
        <h2>Réservation introuvable</h2>
        <p class="muted">{{ error }}</p>
        <RouterLink to="/contact" class="btn ghost">Nous contacter</RouterLink>
      </div>
    </div>
  </section>`,
};
