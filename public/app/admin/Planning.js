import { api } from '../api.js';
import { store, loadConfig } from '../store.js';
import { ymd, fmtTime } from '../utils.js';
import { BookingDrawer, BookingCreate } from './shared.js';

const PX = 1.1; // pixels par minute

export default {
  name: 'AdminPlanning',
  components: { BookingDrawer, BookingCreate },
  data() {
    const d = new Date(); const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { start: monday, data: null, openId: null, create: null };
  },
  computed: {
    days() { return Array.from({ length: 7 }, (_, i) => { const d = new Date(this.start); d.setDate(d.getDate() + i); return d; }); },
    hours() { return store.config?.opening_hours || {}; },
    range() {
      let min = 9 * 60, max = 19 * 60;
      Object.values(this.hours).flat().forEach(([o, c]) => { min = Math.min(min, this.toMin(o)); max = Math.max(max, this.toMin(c)); });
      return { min: Math.floor(min / 60) * 60, max: Math.ceil(max / 60) * 60 };
    },
    height() { return (this.range.max - this.range.min) * PX; },
    ticks() { const t = []; for (let m = this.range.min; m <= this.range.max; m += 60) t.push(m); return t; },
    label() {
      const e = this.days[6];
      return this.start.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }) + ' – ' + e.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  },
  created() { loadConfig(); this.load(); },
  methods: {
    fmtTime,
    toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    async load() {
      this.data = await api.get('/admin/bookings/calendar', { from: ymd(this.days[0]), to: ymd(this.days[6]) });
    },
    move(n) { const d = new Date(this.start); d.setDate(d.getDate() + n * 7); this.start = d; this.load(); },
    today() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); this.start = d; this.load(); },
    events(d) {
      const key = ymd(d);
      return (this.data?.bookings || []).filter((b) => b.start_at.startsWith(key)).map((b) => {
        const s = this.toMin(b.start_at.slice(11, 16)), e = this.toMin(b.end_at.slice(11, 16));
        return { ...b, top: (s - this.range.min) * PX, h: Math.max(24, (e - s) * PX - 2) };
      });
    },
    closed(d) {
      const key = ymd(d);
      return !(this.hours[d.getDay()] || []).length || (this.data?.closures || []).some((c) => c.start_date <= key && c.end_date >= key);
    },
    offBands(d) {
      if (this.closed(d)) return [{ top: 0, h: this.height }];
      const r = (this.hours[d.getDay()] || []).map(([o, c]) => [this.toMin(o), this.toMin(c)]).sort((a, b) => a[0] - b[0]);
      const out = []; let cur = this.range.min;
      r.forEach(([o, c]) => { if (o > cur) out.push({ top: (cur - this.range.min) * PX, h: (o - cur) * PX }); cur = Math.max(cur, c); });
      if (cur < this.range.max) out.push({ top: (cur - this.range.min) * PX, h: (this.range.max - cur) * PX });
      return out;
    },
    isToday(d) { return ymd(d) === ymd(new Date()); },
    clickCol(d, ev) {
      if (ev.target !== ev.currentTarget) return;
      const m = this.range.min + Math.floor(ev.offsetY / PX / 15) * 15;
      this.create = { date: ymd(d), time: String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') };
    },
  },
  template: `
  <div>
    <div class="admin-top">
      <div><h1>Planning</h1><div class="muted" style="text-transform:capitalize">{{ label }}</div></div>
      <div class="row">
        <button class="btn ghost sm" @click="move(-1)"><Icon name="chevron-left" /></button>
        <button class="btn ghost sm" @click="today">Cette semaine</button>
        <button class="btn ghost sm" @click="move(1)"><Icon name="chevron-right" /></button>
        <button class="btn sm" @click="create = {}"><Icon name="plus" /> Nouveau</button>
      </div>
    </div>
    <p class="small muted">Cliquez sur un rendez-vous pour le gérer, ou sur un espace libre pour créer un rendez-vous.</p>
    <div style="overflow-x:auto">
      <div class="week">
        <div class="h" style="border-left:0"></div>
        <div v-for="d in days" :key="'h' + d" class="h" :class="{today: isToday(d), closed: closed(d)}">
          {{ d.toLocaleDateString('fr-BE', { weekday: 'short' }) }}<strong>{{ d.getDate() }}</strong>
        </div>
        <div class="times" :style="{height: height + 'px'}"><span v-for="t in ticks" :key="t" :style="{top: (t - range.min) * 1.1 + 'px'}">{{ String(t / 60).padStart(2, '0') }}h</span></div>
        <div v-for="d in days" :key="'c' + d" class="col" :class="{closed: closed(d)}" :style="{height: height + 'px', backgroundSize: '100% ' + (60 * 1.1) + 'px'}" @click="clickCol(d, $event)">
          <div v-for="(o, i) in offBands(d)" :key="i" class="off-band" :style="{top: o.top + 'px', height: o.h + 'px'}" style="pointer-events:none"></div>
          <div v-for="b in events(d)" :key="b.id" class="ev" :class="b.status" :style="{top: b.top + 'px', height: b.h + 'px'}" @click.stop="openId = b.id" :title="b.items.map(i => i.service_name).join(' + ')">
            <strong>{{ fmtTime(b.start_at) }} · {{ b.first_name }} {{ b.last_name.charAt(0) }}.</strong>{{ b.items.map(i => i.service_name).join(' + ') }}
          </div>
        </div>
      </div>
    </div>
    <BookingDrawer v-if="openId" :id="openId" @close="openId = null" @changed="load" />
    <BookingCreate v-if="create" :date="create.date" :time="create.time" @close="create = null" @created="create = null; load()" />
  </div>`,
};
