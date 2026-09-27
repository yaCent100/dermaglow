import { euros, fmtTime, fmtDate, cap, duration } from '../utils.js';
import { refreshCounters } from './Layout.js';

export default {
  name: 'AdminDashboard',
  data: () => ({ d: null }),
  computed: {
    max14() { return Math.max(1, ...Object.values(this.d?.next14 || {})); },
    greeting() { const h = new Date().getHours(); return h < 12 ? 'Bonjour' : h < 18 ? 'Bel après-midi' : 'Bonsoir'; },
  },
  async created() { this.d = await refreshCounters(); },
  methods: {
    euros, fmtTime, fmtDate, cap, duration,
    dayLabel(d) { return new Date(d + 'T12:00').toLocaleDateString('fr-BE', { weekday: 'narrow' }); },
    isWe(d) { const w = new Date(d + 'T12:00').getDay(); return w === 0 || w === 6; },
  },
  template: `
  <div>
    <div class="admin-top">
      <div><div class="eyebrow" style="margin-bottom:8px">{{ cap(fmtDate(new Date())) }}</div><h1>{{ greeting }} ✨</h1></div>
      <div class="row"><RouterLink to="/admin/planning" class="btn ghost sm"><Icon name="calendar" /> Planning</RouterLink><RouterLink to="/admin/rendez-vous?nouveau=1" class="btn sm"><Icon name="plus" /> Nouveau RDV</RouterLink></div>
    </div>
    <template v-if="d">
      <div class="kpis">
        <div class="card kpi"><div class="l"><Icon name="calendar" size="16" /> Aujourd’hui</div><div class="v">{{ d.today.length }}</div><div class="s">rendez-vous</div></div>
        <div class="card kpi"><div class="l"><Icon name="euro" size="16" /> Ce mois-ci</div><div class="v">{{ euros(d.month.revenue_cents) }}</div><div class="s">{{ d.month.bookings }} RDV · {{ euros(d.month.deposits_cents) }} d’acomptes</div></div>
        <div class="card kpi"><div class="l"><Icon name="sparkles" size="16" /> 7 derniers jours</div><div class="v">{{ d.week_bookings }}</div><div class="s">nouvelles réservations</div></div>
        <div class="card kpi"><div class="l"><Icon name="mail" size="16" /> Newsletter</div><div class="v">{{ d.subscribers }}</div><div class="s">abonnées actives</div></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));align-items:start">
        <div class="card panel">
          <div class="panel-head"><h3>Aujourd’hui</h3><RouterLink to="/admin/planning" class="link-arrow small">Planning <Icon name="arrow-right" /></RouterLink></div>
          <Empty v-if="!d.today.length" icon="calendar" text="Aucun rendez-vous aujourd’hui." />
          <RouterLink v-for="b in d.today" :key="b.id" :to="'/admin/rendez-vous/' + b.id" class="list-row">
            <span class="time-pill">{{ fmtTime(b.start_at) }}</span>
            <span class="grow"><span class="strong" style="color:var(--navy);font-weight:500">{{ b.first_name }} {{ b.last_name }}</span><br><span class="small muted">{{ b.items.map(i => i.service_name).join(' + ') }} · {{ duration(b.duration_min) }}</span></span>
            <span style="text-align:right"><StatusBadge :status="b.status" /><br><span class="small muted">reste {{ euros(b.balance_cents) }}</span></span>
          </RouterLink>
        </div>
        <div class="stack" style="margin:0">
          <div class="card panel">
            <div class="panel-head"><h3>Les 14 prochains jours</h3></div>
            <div class="bars14">
              <div v-for="(n, day) in d.next14" :key="day" class="b" :class="{we: isWe(day)}" :title="day + ' : ' + n + ' RDV'">
                <em>{{ n || '' }}</em><i :style="{height: (n / max14 * 80) + '%'}"></i><span>{{ dayLabel(day) }}</span>
              </div>
            </div>
          </div>
          <div class="card panel">
            <div class="panel-head"><h3>À faire</h3></div>
            <RouterLink to="/admin/avis" class="list-row"><Icon name="star" /><span class="grow">Avis à modérer</span><span class="badge plain" :class="{pending: d.pending_reviews}">{{ d.pending_reviews }}</span></RouterLink>
            <RouterLink to="/admin/messages" class="list-row"><Icon name="message" /><span class="grow">Messages non lus</span><span class="badge plain" :class="{pending: d.unread_messages}">{{ d.unread_messages }}</span></RouterLink>
          </div>
          <div class="card panel" v-if="d.top_services.length">
            <div class="panel-head"><h3>Soins populaires</h3><span class="small muted">90 jours</span></div>
            <div v-for="t in d.top_services" :key="t.service_name" class="list-row"><span class="grow">{{ t.service_name }}</span><strong>{{ t.n }}</strong></div>
          </div>
        </div>
      </div>
      <div class="card panel" style="margin-top:24px" v-if="d.upcoming.length">
        <div class="panel-head"><h3>Prochains rendez-vous</h3><RouterLink to="/admin/rendez-vous" class="link-arrow small">Tout voir <Icon name="arrow-right" /></RouterLink></div>
        <div class="table-wrap"><table class="table"><tbody>
          <tr v-for="b in d.upcoming" :key="b.id" class="click" @click="$router.push('/admin/rendez-vous/' + b.id)">
            <td class="strong">{{ cap(fmtDate(b.start_at, { weekday: 'short', day: 'numeric', month: 'short' })) }} · {{ fmtTime(b.start_at) }}</td>
            <td>{{ b.first_name }} {{ b.last_name }}</td><td class="muted">{{ b.reference }}</td><td style="text-align:right">{{ euros(b.total_cents) }}</td>
          </tr></tbody></table></div>
      </div>
    </template>
    <div v-else class="kpis"><div v-for="i in 4" :key="i" class="skeleton" style="height:120px"></div></div>
  </div>`,
};
