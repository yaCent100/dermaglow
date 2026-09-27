import { api } from '../api.js';
import { toast, loadCatalog, allServices, store } from '../store.js';
import { euros, fmtDateTime, fmtDate, fmtTime, cap, duration, STATUS, PAYMENT, ymd } from '../utils.js';

/** Panneau latéral : détail et actions sur un rendez-vous */
export const BookingDrawer = {
  name: 'BookingDrawer',
  props: { id: [Number, String] },
  emits: ['close', 'changed'],
  data: () => ({ b: null, notes: '', busy: false, moving: false, move: { date: '', time: '', force: false }, slots: [], cancelOpen: false, cancel: { reason: '', refund: true } }),
  watch: { id: { immediate: true, handler() { this.load(); } } },
  methods: {
    euros, fmtDateTime, fmtDate, fmtTime, cap, duration,
    async load() {
      this.b = null;
      try { this.b = await api.get('/admin/bookings/' + this.id); this.notes = this.b.admin_notes || ''; }
      catch (e) { toast(e.message, 'error'); this.$emit('close'); }
    },
    async act(fn, msg) {
      this.busy = true;
      try { this.b = { ...(await fn()), history: this.b.history }; toast(msg, 'success'); this.$emit('changed'); }
      catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    setStatus(status) { this.act(() => api.patch('/admin/bookings/' + this.id, { status }), 'Statut mis à jour.'); },
    saveNotes() { this.act(() => api.patch('/admin/bookings/' + this.id, { admin_notes: this.notes }), 'Note enregistrée.'); },
    paid(method) { this.act(() => api.post(`/admin/bookings/${this.id}/paid`, { method }), 'Paiement du solde enregistré.'); },
    askReview() { this.act(() => api.post(`/admin/bookings/${this.id}/review-request`), 'Demande d’avis envoyée.'); },
    async doCancel() {
      await this.act(() => api.post(`/admin/bookings/${this.id}/cancel`, this.cancel), 'Rendez-vous annulé.');
      this.cancelOpen = false;
    },
    openMove() { this.moving = true; this.move = { date: this.b.start_at.slice(0, 10), time: '', force: false }; this.loadSlots(); },
    async loadSlots() {
      if (!this.move.date) return;
      const r = await api.get('/admin/bookings/slots', { date: this.move.date, duration: this.b.duration_min, ignore: this.b.id });
      this.slots = r.slots;
    },
    async doMove() {
      await this.act(() => api.patch('/admin/bookings/' + this.id, this.move), 'Rendez-vous déplacé.');
      this.moving = false;
    },
  },
  template: `
  <Teleport to="body">
    <div class="drawer-back" @click="$emit('close')"></div>
    <aside class="drawer" role="dialog" aria-modal="true">
      <div class="drawer-head">
        <div><div class="small muted">{{ b?.reference }}</div><h3 class="mb-0" style="font-size:1.5rem">{{ b ? b.first_name + ' ' + b.last_name : '…' }}</h3></div>
        <button class="icon-btn" @click="$emit('close')" aria-label="Fermer"><Icon name="x" /></button>
      </div>
      <div class="drawer-body" v-if="b">
        <div class="row" style="margin-bottom:18px"><StatusBadge :status="b.status" /><StatusBadge :status="b.payment_status" payment /><span v-if="b.source === 'admin'" class="badge plain">Saisi par l’institut</span></div>
        <h3 style="font-size:1.6rem">{{ cap(fmtDateTime(b.start_at)) }}</h3>
        <p class="muted small" style="margin-top:-6px">Fin prévue {{ fmtTime(b.end_at) }} · {{ duration(b.duration_min) }}</p>

        <div class="card flat pad" style="padding:16px 18px;margin:16px 0">
          <div v-for="i in b.items" :key="i.id" class="summary-line"><span>{{ i.service_name }}</span><span>{{ euros(i.price_cents) }}</span></div>
          <div class="summary-line" style="border-top:1px solid var(--cream-2);margin-top:4px"><strong>Total</strong><strong>{{ euros(b.total_cents) }}</strong></div>
          <div class="summary-line" v-if="b.deposit_cents > 0"><span class="muted">Acompte {{ b.payment_status === 'unpaid' ? '(non payé)' : 'payé en ligne' }}</span><span>{{ euros(b.deposit_cents) }}</span></div>
          <div class="summary-line" v-if="b.refunded_cents > 0" style="color:var(--danger)"><span>Remboursé</span><span>{{ euros(b.refunded_cents) }}</span></div>
          <div class="summary-line" v-if="b.payment_status !== 'paid' && b.status !== 'cancelled'"><strong>Reste à encaisser</strong><strong>{{ euros(b.balance_cents) }}</strong></div>
          <div class="summary-line" v-if="b.paid_on_site_at" style="color:var(--success)"><span>Soldé sur place ({{ b.paid_on_site_method }})</span><span>{{ fmtDate(b.paid_on_site_at, {day:'numeric',month:'short'}) }}</span></div>
        </div>

        <div class="row" style="margin-bottom:18px" v-if="['confirmed','no_show','completed'].includes(b.status) && b.payment_status !== 'paid'">
          <button class="btn sm" @click="paid('card')" :disabled="busy"><Icon name="card" /> Solde payé (carte)</button>
          <button class="btn ghost sm" @click="paid('cash')" :disabled="busy">Espèces</button>
        </div>
        <div class="row" style="margin-bottom:22px" v-if="b.status === 'confirmed'">
          <button class="btn soft sm" @click="setStatus('completed')" :disabled="busy"><Icon name="check" /> Terminé</button>
          <button class="btn soft sm" @click="setStatus('no_show')" :disabled="busy">Absente</button>
          <button class="btn soft sm" @click="openMove" :disabled="busy"><Icon name="calendar" /> Déplacer</button>
          <button class="btn danger ghost sm" @click="cancelOpen = true" :disabled="busy">Annuler</button>
        </div>
        <div class="row" style="margin-bottom:22px" v-else-if="b.status === 'no_show' || b.status === 'completed'">
          <button class="btn soft sm" @click="setStatus('confirmed')" :disabled="busy">Remettre en « confirmé »</button>
          <button class="btn soft sm" v-if="b.email" @click="askReview" :disabled="busy"><Icon name="star" /> {{ b.review_requested_at ? 'Relancer l’avis' : 'Demander un avis' }}</button>
        </div>

        <div v-if="moving" class="card flat pad" style="padding:16px 18px;margin-bottom:22px">
          <h4>Déplacer le rendez-vous</h4>
          <div class="form-grid">
            <div class="field"><label>Date</label><input type="date" class="input" v-model="move.date" @change="loadSlots"></div>
            <div class="field"><label>Heure</label>
              <select class="select" v-model="move.time"><option value="">—</option><option v-for="s in slots" :key="s" :value="s">{{ s }}</option></select></div>
            <div class="field full" v-if="move.force"><label>Heure libre (forcée)</label><input type="time" class="input" v-model="move.time" step="300"></div>
            <label class="check full"><input type="checkbox" v-model="move.force"> <span>Forcer (ignorer les disponibilités)</span></label>
          </div>
          <div class="row" style="margin-top:12px"><button class="btn sm" @click="doMove" :disabled="!move.time || busy">Enregistrer</button><button class="btn ghost sm" @click="moving=false">Fermer</button></div>
        </div>

        <dl class="kv">
          <dt>E-mail</dt><dd><a :href="'mailto:' + b.email" class="link">{{ b.email || '—' }}</a></dd>
          <dt>Téléphone</dt><dd><a :href="'tel:' + b.phone" class="link">{{ b.phone || '—' }}</a></dd>
          <dt>Message cliente</dt><dd>{{ b.notes || '—' }}</dd>
          <dt>Réservé le</dt><dd>{{ fmtDateTime(b.created_at) }}</dd>
          <template v-if="b.cancelled_at"><dt>Annulé le</dt><dd>{{ fmtDateTime(b.cancelled_at) }}<br><span class="muted small">{{ b.cancel_reason }}</span></dd></template>
          <template v-if="b.stripe_payment_intent"><dt>Stripe</dt><dd class="small"><a :href="'https://dashboard.stripe.com/payments/' + b.stripe_payment_intent" target="_blank" rel="noopener" class="link">{{ b.stripe_payment_intent }}</a></dd></template>
        </dl>

        <div class="field" style="margin-top:22px"><label>Note interne (visible uniquement par l’équipe)</label><textarea class="textarea" v-model="notes" rows="3" placeholder="Type de peau, préférences, réactions…"></textarea></div>
        <button class="btn soft sm" style="margin-top:8px" @click="saveNotes" :disabled="busy || notes === (b.admin_notes || '')">Enregistrer la note</button>

        <template v-if="b.history?.length">
          <h4 style="margin-top:28px">Historique de la cliente</h4>
          <div v-for="h in b.history" :key="h.id" class="list-row small"><span class="grow">{{ fmtDate(h.start_at, {day:'numeric',month:'short',year:'numeric'}) }} · {{ h.reference }}</span><StatusBadge :status="h.status" /><span>{{ euros(h.total_cents) }}</span></div>
        </template>
      </div>
      <div v-else class="drawer-body"><div class="skeleton" style="height:300px"></div></div>
    </aside>

    <Modal v-if="cancelOpen" title="Annuler ce rendez-vous ?" @close="cancelOpen = false">
      <div class="stack">
        <p class="mb-0">La cliente sera prévenue par e-mail.</p>
        <div class="field"><label>Motif (envoyé à la cliente)</label><input class="input" v-model="cancel.reason" placeholder="Ex. Indisponibilité de la praticienne"></div>
        <label class="check" v-if="b.payment_status === 'deposit_paid'"><input type="checkbox" v-model="cancel.refund"> <span>Rembourser l’acompte de {{ euros(b.deposit_cents) }}</span></label>
      </div>
      <template #foot><button class="btn ghost" @click="cancelOpen = false">Retour</button><button class="btn danger" @click="doCancel" :disabled="busy">Annuler le RDV</button></template>
    </Modal>
  </Teleport>`,
};

/** Création manuelle d'un rendez-vous (téléphone, sur place) */
export const BookingCreate = {
  name: 'BookingCreate',
  props: { date: String, time: String },
  emits: ['close', 'created'],
  data() {
    return {
      f: { services: [], date: this.date || ymd(new Date()), time: this.time || '', first_name: '', last_name: '', email: '', phone: '', notes: '', send_email: true },
      slots: [], busy: false, q: '',
    };
  },
  computed: {
    services() { return allServices(); },
    filtered() { const q = this.q.toLowerCase(); return this.services.filter((s) => !q || s.name.toLowerCase().includes(q)); },
    chosen() { return this.f.services.map((id) => this.services.find((s) => s.id === id)).filter(Boolean); },
    dur() { return this.chosen.reduce((n, s) => n + s.duration_min, 0); },
    total() { return this.chosen.reduce((n, s) => n + s.price_cents, 0); },
  },
  watch: { 'f.date'() { this.loadSlots(); }, dur() { this.loadSlots(); } },
  async created() { await loadCatalog(); },
  methods: {
    euros, duration,
    toggle(id) { const i = this.f.services.indexOf(id); i >= 0 ? this.f.services.splice(i, 1) : this.f.services.push(id); },
    async loadSlots() {
      if (!this.dur || !this.f.date) { this.slots = []; return; }
      const r = await api.get('/admin/bookings/slots', { date: this.f.date, duration: this.dur });
      this.slots = r.slots;
    },
    async save() {
      this.busy = true;
      try { const b = await api.post('/admin/bookings', this.f); toast('Rendez-vous créé.', 'success'); this.$emit('created', b); }
      catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
  },
  template: `
  <Modal title="Nouveau rendez-vous" wide @close="$emit('close')">
    <div class="grid c2" style="align-items:start">
      <div>
        <div class="label" style="margin-bottom:8px">Soins</div>
        <input class="input" v-model="q" placeholder="Rechercher un soin…" style="margin-bottom:10px">
        <div class="pick-list" style="max-height:340px;overflow:auto;padding-right:4px">
          <button v-for="s in filtered" :key="s.id" type="button" class="pick" :class="{on: f.services.includes(s.id)}" @click="toggle(s.id)" style="padding:10px 14px">
            <span><span class="t" style="font-size:.92rem">{{ s.name }}</span><br><span class="d">{{ s.category_sub }} · {{ duration(s.duration_min) }}</span></span>
            <span class="p" style="font-size:1.1rem">{{ euros(s.price_cents) }}</span><span class="ck"><Icon name="check" /></span>
          </button>
        </div>
      </div>
      <div class="stack">
        <div class="form-grid">
          <div class="field"><label>Date</label><input type="date" class="input" v-model="f.date"></div>
          <div class="field"><label>Heure</label>
            <select class="select" v-model="f.time"><option value="">{{ dur ? (slots.length ? 'Choisir' : 'Aucun créneau libre') : 'Choisir des soins' }}</option><option v-for="s in slots" :key="s" :value="s">{{ s }}</option></select></div>
          <div class="field"><label>Prénom *</label><input class="input" v-model.trim="f.first_name"></div>
          <div class="field"><label>Nom</label><input class="input" v-model.trim="f.last_name"></div>
          <div class="field"><label>Téléphone</label><input class="input" v-model.trim="f.phone"></div>
          <div class="field"><label>E-mail</label><input type="email" class="input" v-model.trim="f.email"></div>
          <div class="field full"><label>Note</label><input class="input" v-model="f.notes"></div>
          <label class="check full" v-if="f.email"><input type="checkbox" v-model="f.send_email"> <span>Envoyer la confirmation par e-mail</span></label>
        </div>
        <div class="deposit-box" v-if="chosen.length"><div class="row between"><span>{{ chosen.length }} soin(s) · {{ duration(dur) }}</span><span class="v">{{ euros(total) }}</span></div><div class="small">Sans acompte en ligne : tout se règle sur place.</div></div>
      </div>
    </div>
    <template #foot><button class="btn ghost" @click="$emit('close')">Annuler</button><button class="btn" @click="save" :disabled="busy || !f.services.length || !f.time || !f.first_name">Créer le rendez-vous</button></template>
  </Modal>`,
};
