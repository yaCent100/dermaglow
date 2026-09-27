import { api } from '../api.js';
import { toast, loadCatalog } from '../store.js';
import { euros, duration } from '../utils.js';

export default {
  name: 'AdminCatalog',
  data: () => ({ cats: [], svc: null, cat: null, busy: false }),
  created() { this.load(); },
  methods: {
    euros, duration,
    async load() { this.cats = await api.get('/admin/catalog'); loadCatalog(true).catch(() => {}); },
    editService(s, catId) {
      this.svc = s ? { ...s, price: (s.price_cents / 100).toString(), deposit: s.deposit_cents === null ? '' : (s.deposit_cents / 100).toString(), is_active: !!Number(s.is_active), is_featured: !!Number(s.is_featured) }
        : { category_id: catId, name: '', short_description: '', description: '', price: '', duration_min: 30, deposit: '', is_active: true, is_featured: false };
    },
    async saveService() {
      this.busy = true;
      try {
        this.svc.id ? await api.put('/admin/services/' + this.svc.id, this.svc) : await api.post('/admin/services', this.svc);
        toast('Soin enregistré.', 'success'); this.svc = null; this.load();
      } catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    async delService() {
      if (!confirm('Supprimer définitivement « ' + this.svc.name + ' » ? (Vous pouvez aussi simplement le masquer.)')) return;
      await api.del('/admin/services/' + this.svc.id); this.svc = null; this.load(); toast('Soin supprimé.');
    },
    async toggle(s) { await api.put('/admin/services/' + s.id, { ...s, price: s.price_cents / 100, deposit: s.deposit_cents === null ? '' : s.deposit_cents / 100, is_active: !Number(s.is_active) }); this.load(); },
    editCat(c) { this.cat = c ? { ...c, is_active: !!Number(c.is_active) } : { name: '', subtitle: '', description: '', is_active: true }; },
    async saveCat() {
      this.busy = true;
      try { this.cat.id ? await api.put('/admin/categories/' + this.cat.id, this.cat) : await api.post('/admin/categories', this.cat); this.cat = null; this.load(); toast('Catégorie enregistrée.', 'success'); }
      catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    async delCat() {
      try { await api.del('/admin/categories/' + this.cat.id); this.cat = null; this.load(); } catch (e) { toast(e.message, 'error'); }
    },
    async moveSvc(c, i, dir) {
      const list = [...c.services]; const j = i + dir; if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]]; c.services = list;
      await api.post('/admin/catalog/reorder', { type: 'services', ids: list.map((s) => s.id) }); loadCatalog(true);
    },
    async moveCat(i, dir) {
      const list = [...this.cats]; const j = i + dir; if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]]; this.cats = list;
      await api.post('/admin/catalog/reorder', { type: 'categories', ids: list.map((c) => c.id) }); loadCatalog(true);
    },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Soins & tarifs</h1><button class="btn sm" @click="editCat(null)"><Icon name="plus" /> Catégorie</button></div>
    <div v-for="(c, ci) in cats" :key="c.id" class="card panel" style="margin-bottom:20px">
      <div class="panel-head">
        <div><h3>{{ c.name }} <span v-if="!Number(c.is_active)" class="badge expired">Masquée</span></h3><div class="small muted">{{ c.subtitle }}</div></div>
        <div class="row" style="gap:4px">
          <button class="icon-btn" @click="moveCat(ci, -1)" :disabled="ci === 0" title="Monter"><Icon name="chevron-left" style="transform:rotate(90deg)" /></button>
          <button class="icon-btn" @click="moveCat(ci, 1)" :disabled="ci === cats.length - 1" title="Descendre"><Icon name="chevron-right" style="transform:rotate(90deg)" /></button>
          <button class="btn ghost xs" @click="editCat(c)"><Icon name="edit" /> Modifier</button>
          <button class="btn xs" @click="editService(null, c.id)"><Icon name="plus" /> Soin</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th style="width:60px"></th><th>Soin</th><th>Durée</th><th>Prix</th><th>Acompte</th><th>Visible</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in c.services" :key="s.id" class="click" @click="editService(s)" :style="{opacity: Number(s.is_active) ? 1 : .5}">
            <td @click.stop><div class="row" style="gap:0;flex-wrap:nowrap">
              <button class="icon-btn" style="width:28px;height:28px" @click="moveSvc(c, i, -1)" :disabled="i === 0"><Icon name="chevron-left" size="14" style="transform:rotate(90deg)" /></button>
              <button class="icon-btn" style="width:28px;height:28px" @click="moveSvc(c, i, 1)" :disabled="i === c.services.length - 1"><Icon name="chevron-right" size="14" style="transform:rotate(90deg)" /></button></div></td>
            <td class="strong">{{ s.name }} <span v-if="Number(s.is_featured)" class="pill-badge">Signature</span></td>
            <td>{{ duration(s.duration_min) }}</td>
            <td>{{ euros(s.price_cents) }}</td>
            <td class="muted">{{ s.deposit_cents === null ? 'auto' : euros(s.deposit_cents) }}</td>
            <td @click.stop><label class="switch"><input type="checkbox" :checked="!!Number(s.is_active)" @change="toggle(s)"></label></td>
          </tr>
        </tbody>
      </table></div>
      <Empty v-if="!c.services.length" text="Aucun soin dans cette catégorie." />
    </div>

    <Modal v-if="svc" :title="svc.id ? 'Modifier le soin' : 'Nouveau soin'" @close="svc = null">
      <div class="form-grid">
        <div class="field full"><label>Nom *</label><input class="input" v-model="svc.name"></div>
        <div class="field full"><label>Catégorie</label><select class="select" v-model="svc.category_id"><option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
        <div class="field"><label>Prix (€) *</label><input class="input" inputmode="decimal" v-model="svc.price"></div>
        <div class="field"><label>Durée (min) *</label><input type="number" class="input" min="5" step="5" v-model.number="svc.duration_min"></div>
        <div class="field full"><label>Acompte fixe (€) <span class="muted">— vide = règle générale des réglages</span></label><input class="input" inputmode="decimal" v-model="svc.deposit" placeholder="auto"></div>
        <div class="field full"><label>Accroche courte</label><input class="input" v-model="svc.short_description" maxlength="255"></div>
        <div class="field full"><label>Description</label><textarea class="textarea" v-model="svc.description" rows="4"></textarea></div>
        <label class="switch"><input type="checkbox" v-model="svc.is_active"> Visible sur le site</label>
        <label class="switch"><input type="checkbox" v-model="svc.is_featured"> Soin « signature » (accueil)</label>
      </div>
      <template #foot>
        <button v-if="svc.id" class="btn danger ghost" style="margin-right:auto" @click="delService"><Icon name="trash" /></button>
        <button class="btn ghost" @click="svc = null">Annuler</button><button class="btn" @click="saveService" :disabled="busy">Enregistrer</button>
      </template>
    </Modal>

    <Modal v-if="cat" :title="cat.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'" @close="cat = null">
      <div class="stack">
        <div class="field"><label>Nom *</label><input class="input" v-model="cat.name" placeholder="Ex. Facial Hair Removal"></div>
        <div class="field"><label>Sous-titre</label><input class="input" v-model="cat.subtitle" placeholder="Ex. Épilation du visage"></div>
        <div class="field"><label>Description</label><textarea class="textarea" v-model="cat.description" rows="3"></textarea></div>
        <label class="switch"><input type="checkbox" v-model="cat.is_active"> Visible sur le site</label>
      </div>
      <template #foot>
        <button v-if="cat.id" class="btn danger ghost" style="margin-right:auto" @click="delCat"><Icon name="trash" /></button>
        <button class="btn ghost" @click="cat = null">Annuler</button><button class="btn" @click="saveCat" :disabled="busy">Enregistrer</button>
      </template>
    </Modal>
  </div>`,
};
