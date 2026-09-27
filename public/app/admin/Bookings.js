import { api } from '../api.js';
import { euros, fmtDate, fmtTime, cap, debounce } from '../utils.js';
import { BookingDrawer, BookingCreate } from './shared.js';

export default {
  name: 'AdminBookings',
  components: { BookingDrawer, BookingCreate },
  data: () => ({ list: [], meta: null, loading: true, f: { status: 'active', q: '', from: '', to: '' }, creating: false }),
  computed: { openId() { return this.$route.params.id; } },
  created() {
    this.search = debounce(() => this.load(), 300);
    if (this.$route.query.nouveau) this.creating = true;
    this.load();
  },
  methods: {
    euros, fmtDate, fmtTime, cap,
    async load(page = 1) {
      this.loading = true;
      try {
        const r = await api.get('/admin/bookings', { ...this.f, page, order: this.f.status === 'active' ? 'asc' : 'desc', from: this.f.from || (this.f.status === 'active' ? new Date().toISOString().slice(0, 10) : '') });
        this.list = r.data; this.meta = r.meta;
      } finally { this.loading = false; }
    },
    open(id) { this.$router.push('/admin/rendez-vous/' + id); },
    close() { this.$router.push('/admin/rendez-vous'); },
    created2(b) { this.creating = false; this.load(); this.open(b.id); },
    exportCsv() { api.download('/admin/bookings/export', 'rendez-vous.csv'); },
  },
  template: `
  <div>
    <div class="admin-top">
      <h1>Rendez-vous</h1>
      <div class="row"><button class="btn ghost sm" @click="exportCsv"><Icon name="download" /> Export CSV</button><button class="btn sm" @click="creating = true"><Icon name="plus" /> Nouveau</button></div>
    </div>
    <div class="card panel">
      <div class="filters">
        <input class="input" v-model="f.q" @input="search" placeholder="Nom, e-mail, téléphone, référence…">
        <select class="select" v-model="f.status" @change="load()">
          <option value="active">À venir</option><option value="">Tous</option><option value="confirmed">Confirmés</option><option value="completed">Terminés</option>
          <option value="cancelled">Annulés</option><option value="no_show">Absentes</option><option value="pending_payment">Paiement en attente</option><option value="expired">Expirés</option>
        </select>
        <input type="date" class="input" style="min-width:0" v-model="f.from" @change="load()" aria-label="Du">
        <input type="date" class="input" style="min-width:0" v-model="f.to" @change="load()" aria-label="Au">
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Date</th><th>Cliente</th><th>Soins</th><th>Total</th><th>Paiement</th><th>Statut</th></tr></thead>
          <tbody>
            <tr v-for="b in list" :key="b.id" class="click" @click="open(b.id)">
              <td class="strong">{{ cap(fmtDate(b.start_at, { weekday: 'short', day: 'numeric', month: 'short' })) }}<br><span class="muted">{{ fmtTime(b.start_at) }}</span></td>
              <td>{{ b.first_name }} {{ b.last_name }}<br><span class="muted small">{{ b.phone }}</span></td>
              <td class="small">{{ b.items.map(i => i.service_name).join(', ') }}</td>
              <td>{{ euros(b.total_cents) }}</td>
              <td><StatusBadge :status="b.payment_status" payment /></td>
              <td><StatusBadge :status="b.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Empty v-if="!loading && !list.length" icon="calendar" text="Aucun rendez-vous pour ces critères." />
      <div class="row between" style="margin-top:14px" v-if="meta && meta.pages > 1">
        <span class="small muted">{{ meta.total }} résultats</span>
        <div class="row"><button class="btn ghost xs" :disabled="meta.page <= 1" @click="load(meta.page - 1)">Précédent</button><span class="small">{{ meta.page }} / {{ meta.pages }}</span><button class="btn ghost xs" :disabled="meta.page >= meta.pages" @click="load(meta.page + 1)">Suivant</button></div>
      </div>
    </div>
    <BookingDrawer v-if="openId" :id="openId" @close="close" @changed="load(meta?.page || 1)" />
    <BookingCreate v-if="creating" @close="creating = false" @created="created2" />
  </div>`,
};
