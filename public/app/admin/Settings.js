import { api } from '../api.js';
import { toast, loadConfig, store } from '../store.js';
import { DAYS, DAY_ORDER, fmtShort, euros } from '../utils.js';

export default {
  name: 'AdminSettings',
  data: () => ({ tab: 'info', s: null, closures: [], sys: {}, busy: false, cl: { start_date: '', end_date: '', reason: '' }, pw: { current: '', password: '' } }),
  computed: {
    days() { return DAY_ORDER.map((d) => ({ d, label: DAYS[d] })); },
    depositExample() {
      if (!this.s) return '';
      const price = 12000;
      const dep = this.s.deposit_type === 'fixed' ? Math.round(Number(this.s.deposit_value) * 100) : Math.round(price * Number(this.s.deposit_value) / 100);
      return euros(Math.min(price, Math.max(dep, Math.round(Number(this.s.deposit_min_eur || 0) * 100))));
    },
  },
  async created() { await this.load(); },
  methods: {
    fmtShort,
    async load() {
      const r = await api.get('/admin/settings');
      const hours = {};
      for (let d = 0; d < 7; d++) hours[d] = ((r.settings.opening_hours || {})[d] || []).map((x) => [...x]);
      this.s = { ...r.settings, opening_hours: hours, deposit_min_eur: (Number(r.settings.deposit_min_cents || 0) / 100).toString() };
      this.closures = r.closures; this.sys = r.system;
    },
    async save() {
      this.busy = true;
      try {
        await api.put('/admin/settings', { ...this.s, deposit_min_cents: Math.round(Number(String(this.s.deposit_min_eur).replace(',', '.')) * 100) });
        toast('Réglages enregistrés.', 'success');
        loadConfig(true);
        await this.load();
      } catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    addRange(d) { this.s.opening_hours[d].push(['10:00', '19:00']); },
    async addClosure() {
      try {
        const r = await api.post('/admin/closures', this.cl);
        toast('Fermeture ajoutée.', 'success');
        if (r.conflicts.length) toast(`Attention : ${r.conflicts.length} rendez-vous confirmé(s) sur cette période (${r.conflicts.map((c) => c.first_name).join(', ')}).`, 'error', 9000);
        this.cl = { start_date: '', end_date: '', reason: '' }; this.load();
      } catch (e) { toast(e.message, 'error'); }
    },
    async delClosure(c) { await api.del('/admin/closures/' + c.id); this.load(); },
    async changePw() {
      try { await api.post('/admin/password', this.pw); toast('Mot de passe modifié.', 'success'); this.pw = { current: '', password: '' }; }
      catch (e) { toast(e.message, 'error'); }
    },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Réglages</h1><button v-if="['info','hours','booking'].includes(tab)" class="btn sm" @click="save" :disabled="busy"><Icon name="check" /> Enregistrer</button></div>
    <div class="tabs">
      <button v-for="[k, l] in [['info','L’institut'],['hours','Horaires'],['booking','Réservation'],['closures','Fermetures'],['system','Sécurité & système']]" :key="k" :class="{on: tab === k}" @click="tab = k">{{ l }}</button>
    </div>
    <div v-if="!s" class="skeleton" style="height:300px"></div>
    <template v-else>
      <div v-show="tab === 'info'" class="card panel" style="max-width:820px">
        <div class="form-grid">
          <div class="field"><label>Nom de l’institut</label><input class="input" v-model="s.salon_name"></div>
          <div class="field"><label>Accroche</label><input class="input" v-model="s.tagline"></div>
          <div class="field"><label>Adresse</label><input class="input" v-model="s.address" placeholder="Rue, numéro"></div>
          <div class="field"><label>Ville</label><input class="input" v-model="s.city" placeholder="1000 Bruxelles"></div>
          <div class="field"><label>Téléphone</label><input class="input" v-model="s.phone"></div>
          <div class="field"><label>E-mail public</label><input class="input" v-model="s.email"></div>
          <div class="field"><label>Instagram (URL)</label><input class="input" v-model="s.instagram"></div>
          <div class="field"><label>Lien Google Maps (itinéraire)</label><input class="input" v-model="s.map_url"></div>
          <div class="field full"><label>Message affiché lors de la réservation</label><textarea class="textarea" v-model="s.booking_notice" rows="2"></textarea></div>
        </div>
      </div>

      <div v-show="tab === 'hours'" class="card panel hours-editor" style="max-width:820px">
        <p class="muted small">Plusieurs plages possibles par jour (ex. pause déjeuner). Jour sans plage = fermé.</p>
        <div v-for="d in days" :key="d.d" class="day-row">
          <strong style="padding-top:8px">{{ d.label }}</strong>
          <div class="ranges">
            <span v-if="!s.opening_hours[d.d].length" class="muted" style="padding-top:8px">Fermé</span>
            <div v-for="(r, i) in s.opening_hours[d.d]" :key="i" class="range">
              <input type="time" class="input" v-model="r[0]" step="900"><span>→</span><input type="time" class="input" v-model="r[1]" step="900">
              <button class="icon-btn" @click="s.opening_hours[d.d].splice(i, 1)" aria-label="Supprimer"><Icon name="x" /></button>
            </div>
            <div><button class="btn ghost xs" @click="addRange(d.d)"><Icon name="plus" /> Plage horaire</button></div>
          </div>
        </div>
      </div>

      <div v-show="tab === 'booking'" class="grid c2" style="align-items:start;max-width:1100px">
        <div class="card panel stack">
          <template v-if="sys.payment_mode !== 'disabled'">
          <h3>Acompte</h3>
          <div class="field"><label>Type d’acompte</label><select class="select" v-model="s.deposit_type"><option value="percent">Pourcentage du prix</option><option value="fixed">Montant fixe par rendez-vous</option></select></div>
          <div class="field"><label>{{ s.deposit_type === 'fixed' ? 'Montant (€)' : 'Pourcentage (%)' }}</label><input class="input" inputmode="decimal" v-model="s.deposit_value"></div>
          <div class="field"><label>Acompte minimum (€)</label><input class="input" inputmode="decimal" v-model="s.deposit_min_eur"></div>
          <div class="alert info small"><Icon name="info" /><span>Exemple : pour un soin à 120 €, l’acompte sera de <strong>{{ depositExample }}</strong>. Un acompte fixe peut aussi être défini soin par soin.</span></div>
          </template>
          <template v-else>
            <h3>Paiement</h3>
            <div class="alert info small"><Icon name="info" /><span>Le paiement en ligne (Stripe) est désactivé : les rendez-vous sont confirmés immédiatement et réglés sur place.</span></div>
          </template>
          <div class="field"><label>Délai d’annulation demandé (heures avant)</label><input type="number" class="input" v-model="s.cancellation_hours"></div>
          <div class="field" v-if="sys.payment_mode !== 'disabled'"><label>Durée de blocage du créneau pendant le paiement (min)</label><input type="number" class="input" min="30" v-model="s.pending_minutes"></div>
        </div>
        <div class="card panel stack">
          <h3>Agenda</h3>
          <div class="field"><label>Intervalle entre les créneaux proposés (min)</label><select class="select" v-model="s.slot_interval"><option v-for="n in [10,15,20,30,45,60]" :key="n" :value="String(n)">{{ n }} min</option></select></div>
          <div class="field"><label>Pause après chaque rendez-vous (min)</label><input type="number" class="input" v-model="s.buffer_min"></div>
          <div class="field"><label>Délai minimum avant un rendez-vous (heures)</label><input type="number" class="input" v-model="s.min_notice_hours"></div>
          <div class="field"><label>Réservation possible jusqu’à (jours à l’avance)</label><input type="number" class="input" v-model="s.max_advance_days"></div>
          <div class="field"><label>Rendez-vous simultanés (cabines / praticiennes)</label><input type="number" class="input" min="1" v-model="s.capacity"></div>
        </div>
      </div>

      <div v-show="tab === 'closures'" class="card panel" style="max-width:820px">
        <p class="muted small">Congés, jours fériés, formation… Aucun créneau ne sera proposé ces jours-là.</p>
        <div class="form-grid" style="grid-template-columns:1fr 1fr 2fr auto;align-items:end">
          <div class="field"><label>Du</label><input type="date" class="input" v-model="cl.start_date"></div>
          <div class="field"><label>Au (inclus)</label><input type="date" class="input" v-model="cl.end_date"></div>
          <div class="field"><label>Motif</label><input class="input" v-model="cl.reason" placeholder="Congés d’été"></div>
          <button class="btn" @click="addClosure" :disabled="!cl.start_date">Ajouter</button>
        </div>
        <div style="margin-top:20px">
          <div v-for="c in closures" :key="c.id" class="list-row"><Icon name="calendar" /><span class="grow">{{ fmtShort(c.start_date) }}<template v-if="c.end_date !== c.start_date"> → {{ fmtShort(c.end_date) }}</template> <span class="muted">· {{ c.reason || 'Fermeture' }}</span></span><button class="icon-btn" @click="delClosure(c)"><Icon name="trash" /></button></div>
          <Empty v-if="!closures.length" icon="calendar" text="Aucune fermeture prévue." />
        </div>
      </div>

      <div v-show="tab === 'system'" class="grid c2" style="align-items:start;max-width:1100px">
        <div class="card panel stack">
          <h3>Mot de passe</h3>
          <div class="field"><label>Mot de passe actuel</label><input type="password" class="input" v-model="pw.current" autocomplete="current-password"></div>
          <div class="field"><label>Nouveau mot de passe (10 caractères min.)</label><input type="password" class="input" v-model="pw.password" autocomplete="new-password"></div>
          <button class="btn" @click="changePw" :disabled="!pw.current || pw.password.length < 10">Modifier</button>
        </div>
        <div class="card panel">
          <h3>État du système</h3>
          <div class="list-row"><span class="grow">Paiement Stripe</span><span class="badge" :class="sys.payment_mode === 'stripe_live' ? 'active' : sys.payment_mode === 'stripe_test' ? 'completed' : 'pending'">{{ {stripe_live:'Actif (réel)',stripe_test:'Mode test Stripe',simulation:'Simulation locale',disabled:'Désactivé (paiement sur place)'}[sys.payment_mode] }}</span></div>
          <div class="list-row" v-if="sys.payment_mode !== 'disabled'"><span class="grow">Webhook Stripe</span><span class="badge" :class="sys.webhook ? 'active' : 'pending'">{{ sys.webhook ? 'Configuré' : 'Manquant' }}</span></div>
          <div class="list-row"><span class="grow">Envoi d’e-mails (SMTP)</span><span class="badge" :class="sys.smtp ? 'active' : 'pending'">{{ sys.smtp ? 'Configuré' : 'Non configuré' }}</span></div>
          <div class="list-row"><span class="grow">Environnement</span><span class="badge plain">{{ sys.environment }}</span></div>
          <p class="small muted" style="margin-top:14px" v-if="sys.payment_mode !== 'disabled'">URL du webhook à déclarer dans Stripe :<br><code>{{ sys.webhook_url }}</code></p>
          <p class="small muted">Les clés se règlent dans le fichier <code>.env</code> sur l’hébergement (voir le guide).</p>
        </div>
      </div>
    </template>
  </div>`,
};
