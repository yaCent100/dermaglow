import { ymd } from '../utils.js';

/**
 * Calendrier mensuel. `availability` = { 'YYYY-MM-DD': nbCreneaux }
 */
export default {
  name: 'Calendar',
  props: { modelValue: String, availability: Object, loading: Boolean, maxDays: { type: Number, default: 60 } },
  emits: ['update:modelValue', 'month'],
  data() {
    const d = this.modelValue ? new Date(this.modelValue + 'T12:00') : new Date();
    return { cursor: new Date(d.getFullYear(), d.getMonth(), 1) };
  },
  computed: {
    label() { return this.cursor.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' }); },
    monthKey() { return `${this.cursor.getFullYear()}-${String(this.cursor.getMonth() + 1).padStart(2, '0')}`; },
    todayStr() { return ymd(new Date()); },
    canPrev() { const n = new Date(); return this.cursor > new Date(n.getFullYear(), n.getMonth(), 1); },
    canNext() {
      const max = new Date(); max.setDate(max.getDate() + this.maxDays);
      return new Date(this.cursor.getFullYear(), this.cursor.getMonth() + 1, 1) <= max;
    },
    cells() {
      const y = this.cursor.getFullYear(), m = this.cursor.getMonth();
      const first = (new Date(y, m, 1).getDay() + 6) % 7; // lundi = 0
      const days = new Date(y, m + 1, 0).getDate();
      const out = Array.from({ length: first }, (_, i) => ({ key: 'e' + i, empty: true }));
      for (let d = 1; d <= days; d++) {
        const date = ymd(new Date(y, m, d));
        const n = this.availability?.[date];
        out.push({ key: date, date, d, avail: n > 0, off: !(n > 0) });
      }
      return out;
    },
  },
  watch: { monthKey: { immediate: true, handler(v) { this.$emit('month', v); } } },
  methods: {
    move(n) { this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + n, 1); },
    pick(c) { if (c.avail) this.$emit('update:modelValue', c.date); },
  },
  template: `
  <div class="calendar">
    <div class="cal-head">
      <button class="nav-btn" :disabled="!canPrev" @click="move(-1)" aria-label="Mois précédent"><Icon name="chevron-left" /></button>
      <h4>{{ label }}</h4>
      <button class="nav-btn" :disabled="!canNext" @click="move(1)" aria-label="Mois suivant"><Icon name="chevron-right" /></button>
    </div>
    <div class="dow"><span v-for="d in ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']" :key="d">{{ d }}</span></div>
    <div class="days" :style="{ opacity: loading ? .45 : 1 }">
      <button v-for="c in cells" :key="c.key" type="button" class="day"
        :class="{ empty: c.empty, avail: c.avail, off: c.off, sel: c.date === modelValue, today: c.date === todayStr }"
        :disabled="c.empty || c.off" @click="pick(c)" :aria-label="c.date" :aria-pressed="c.date === modelValue">{{ c.d }}</button>
    </div>
  </div>`,
};
