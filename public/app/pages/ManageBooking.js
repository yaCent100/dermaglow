import { api } from '../api.js';
import { store, loadConfig, toast } from '../store.js';
import { euros, fmtDateTime, cap, duration } from '../utils.js';

export default {
  name: 'ManageBookingPage',
  data: () => ({ b: null, error: '', confirm: false, reason: '', busy: false }),
  computed: { config() { return store.config; } },
  async created() {
    loadConfig();
    try { this.b = await api.get('/bookings/' + this.$route.query.ref, { t: this.$route.query.t }); }
    catch (e) { this.error = e.message; }
  },
  methods: {
    euros, fmtDateTime, cap, duration,
    async cancel() {
      this.busy = true;
      try {
        this.b = await api.post(`/bookings/${this.$route.query.ref}/cancel`, { t: this.$route.query.t, reason: this.reason });
        this.confirm = false;
        toast('Votre rendez-vous a été annulé.', 'success');
      } catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
  },
  template: `
  <section class="section">
    <div class="container narrow">
      <div class="eyebrow">Mon rendez-vous</div>
      <div v-if="error" class="state"><div class="ring bad"><Icon name="alert" /></div><h2>Lien invalide</h2><p class="muted">Utilisez le lien reçu dans votre e-mail de confirmation, ou contactez-nous.</p><RouterLink to="/contact" class="btn ghost">Nous contacter</RouterLink></div>
      <template v-else-if="b">
        <h1 style="font-size:clamp(2.2rem,5vw,3.2rem)">{{ cap(fmtDateTime(b.start_at)) }}</h1>
        <div class="card pad" style="margin-top:24px">
          <div class="row between" style="margin-bottom:8px"><span class="muted small">Réf. {{ b.reference }}</span><StatusBadge :status="b.status" /></div>
          <div v-for="i in b.items" :key="i.service_name" class="summary-line"><span class="l">{{ i.service_name }} <span class="muted small">· {{ duration(i.duration_min) }}</span></span><span class="r">{{ euros(i.price_cents) }}</span></div>
          <div class="summary-total"><span>Total</span><span class="v">{{ euros(b.total_cents) }}</span></div>
          <p class="small muted" v-if="b.payment_status === 'deposit_paid'">Acompte payé : {{ euros(b.deposit_cents) }} · reste {{ euros(b.balance_cents) }} à régler sur place.</p>
          <p class="small" v-if="b.refunded_cents > 0" style="color:var(--success)">Acompte remboursé : {{ euros(b.refunded_cents) }}.</p>

          <template v-if="b.can_cancel">
            <hr class="divider">
            <p class="small"><template v-if="b.payment_status === 'deposit_paid'">{{ b.refund_if_cancel ? 'Vous pouvez annuler gratuitement : votre acompte vous sera remboursé.' : 'Le rendez-vous a lieu dans moins de ' + (config?.cancellation_hours || 48) + ' h : en cas d’annulation, l’acompte reste acquis.' }}</template>
              <template v-else>Un empêchement ? Merci d’annuler au moins {{ config?.cancellation_hours || 48 }} h à l’avance pour libérer le créneau.</template>
              Pour <strong>déplacer</strong> votre rendez-vous, appelez-nous au <a :href="'tel:' + (config?.phone||'').replace(/\\s/g,'')" class="link">{{ config?.phone }}</a>.</p>
            <button class="btn danger ghost" @click="confirm = true">Annuler mon rendez-vous</button>
          </template>
        </div>
      </template>
      <div v-else class="skeleton" style="height:300px;margin-top:24px"></div>
    </div>

    <Modal v-if="confirm" title="Annuler le rendez-vous ?" @close="confirm = false">
      <p v-if="b.payment_status === 'deposit_paid'">{{ b.refund_if_cancel ? 'Votre acompte de ' + euros(b.deposit_cents) + ' sera remboursé sous 5 à 10 jours.' : 'L’acompte de ' + euros(b.deposit_cents) + ' ne sera pas remboursé (annulation tardive).' }}</p>
      <p v-else>Le créneau sera libéré pour une autre cliente.</p>
      <div class="field"><label>Motif (facultatif)</label><input class="input" v-model="reason" maxlength="200"></div>
      <template #foot>
        <button class="btn ghost" @click="confirm = false">Garder mon RDV</button>
        <button class="btn danger" @click="cancel" :disabled="busy">{{ busy ? '…' : 'Confirmer l’annulation' }}</button>
      </template>
    </Modal>
  </section>`,
};
