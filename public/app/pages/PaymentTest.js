import { api } from '../api.js';
import { euros, fmtDateTime, cap } from '../utils.js';

/**
 * Page de paiement SIMULÉ — uniquement quand aucune clé Stripe n'est configurée
 * (environnement de développement). En production, la cliente est redirigée vers Stripe.
 */
export default {
  name: 'PaymentTestPage',
  data: () => ({ b: null, error: '', paying: false }),
  async created() {
    try { this.b = await api.get('/bookings/' + this.$route.query.ref, { t: this.$route.query.t }); }
    catch (e) { this.error = e.message; }
  },
  methods: {
    euros, fmtDateTime, cap,
    async pay() {
      this.paying = true;
      try {
        await api.post(`/bookings/${this.$route.query.ref}/simulate-payment?t=${this.$route.query.t}`);
        this.$router.replace({ path: '/reservation/confirmation', query: { ref: this.$route.query.ref, t: this.$route.query.t } });
      } catch (e) { this.error = e.message; this.paying = false; }
    },
    cancel() {
      this.$router.replace({ path: '/reservation/confirmation', query: { ref: this.$route.query.ref, t: this.$route.query.t, cancelled: 1 } });
    },
  },
  template: `
  <section class="section">
    <div class="container narrow">
      <div class="alert warning" style="margin-bottom:24px"><Icon name="alert" /><span><strong>Mode test.</strong> Aucune clé Stripe n’est configurée : ce paiement est simulé. En ligne, vos clientes paieront sur la page sécurisée de Stripe (carte, Bancontact, Apple Pay…).</span></div>
      <div v-if="error" class="alert error"><Icon name="alert" />{{ error }}</div>
      <div v-else-if="b" class="card pad">
        <div class="eyebrow">Paiement de l’acompte</div>
        <h2 style="font-size:2.2rem">{{ euros(b.deposit_cents) }}</h2>
        <p class="muted">{{ b.items.map(i => i.service_name).join(' + ') }}<br>{{ cap(fmtDateTime(b.start_at)) }}</p>
        <div class="form-grid" style="margin:24px 0">
          <div class="field full"><label>Numéro de carte</label><input class="input" value="4242 4242 4242 4242" disabled></div>
          <div class="field"><label>Expiration</label><input class="input" value="12 / 34" disabled></div>
          <div class="field"><label>CVC</label><input class="input" value="123" disabled></div>
        </div>
        <div class="row">
          <button class="btn grow" @click="pay" :disabled="paying"><Icon name="lock" /> {{ paying ? 'Paiement…' : 'Simuler le paiement réussi' }}</button>
          <button class="btn ghost" @click="cancel" :disabled="paying">Abandonner</button>
        </div>
      </div>
      <div v-else class="skeleton" style="height:320px"></div>
    </div>
  </section>`,
};
