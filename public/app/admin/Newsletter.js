import { api } from '../api.js';
import { toast } from '../store.js';
import { fmtShort, fmtDateTime, renderMarkdown, debounce } from '../utils.js';

export default {
  name: 'AdminNewsletter',
  data: () => ({ tab: 'campaigns', subs: [], counts: {}, meta: null, q: '', st: 'active', campaigns: [], edit: null, previewHtml: '', testEmail: '', busy: false, adding: null }),
  created() { this.search = debounce(() => this.loadSubs(), 300); this.loadSubs(); this.loadCampaigns(); },
  methods: {
    fmtShort, fmtDateTime,
    async loadSubs(page = 1) { const r = await api.get('/admin/subscribers', { page, q: this.q, status: this.st }); this.subs = r.data; this.meta = r.meta; this.counts = r.counts; },
    async loadCampaigns() { this.campaigns = await api.get('/admin/campaigns'); },
    async delSub(s) { if (!confirm('Supprimer ' + s.email + ' ?')) return; await api.del('/admin/subscribers/' + s.id); this.loadSubs(); },
    exportCsv() { api.download('/admin/subscribers/export', 'abonnees.csv'); },
    async addSub() {
      try { await api.post('/admin/subscribers', this.adding); toast(this.adding.confirmed ? 'Abonnée ajoutée.' : 'E-mail de confirmation envoyé.', 'success'); this.adding = null; this.loadSubs(); }
      catch (e) { toast(e.message, 'error'); }
    },
    newCampaign() { this.edit = { subject: '', preheader: '', content: 'Bonjour,\n\n## Les nouveautés du mois\n\nÉcrivez ici votre message…\n\n[Réserver mon soin](' + location.origin + '/reservation)\n\nÀ très vite,\nL’équipe DermaGlow' }; this.previewHtml = ''; },
    async openCampaign(c) { this.edit = { ...c }; this.previewHtml = await renderMarkdown(c.content); },
    async preview() { this.previewHtml = await renderMarkdown(this.edit.content); },
    async saveCampaign() {
      this.busy = true;
      try { const r = this.edit.id ? await api.put('/admin/campaigns/' + this.edit.id, this.edit) : await api.post('/admin/campaigns', this.edit); this.edit = { ...r }; toast('Campagne enregistrée.', 'success'); this.loadCampaigns(); return r; }
      catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    async sendTest() {
      if (!this.testEmail) return toast('Indiquez une adresse de test.', 'error');
      const c = await this.saveCampaign(); if (!c) return;
      await api.post(`/admin/campaigns/${c.id}/send`, { test_email: this.testEmail }); toast('E-mail de test envoyé.', 'success');
    },
    async sendAll() {
      if (!confirm(`Envoyer « ${this.edit.subject} » à ${this.counts.active} abonnée(s) ? Cette action est définitive.`)) return;
      const c = await this.saveCampaign(); if (!c) return;
      this.busy = true;
      try { const r = await api.post(`/admin/campaigns/${c.id}/send`); toast(`Campagne envoyée à ${r.sent} abonnée(s).`, 'success'); this.edit = null; this.loadCampaigns(); }
      catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    async delCampaign(c) { if (!confirm('Supprimer ce brouillon ?')) return; await api.del('/admin/campaigns/' + c.id); this.loadCampaigns(); },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Newsletter</h1>
      <div class="row"><button v-if="tab === 'subs'" class="btn ghost sm" @click="exportCsv"><Icon name="download" /> Export CSV</button>
        <button v-if="tab === 'subs'" class="btn sm" @click="adding = { email: '', first_name: '', confirmed: false }"><Icon name="plus" /> Ajouter</button>
        <button v-else class="btn sm" @click="newCampaign"><Icon name="plus" /> Nouvelle campagne</button></div>
    </div>
    <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="card kpi"><div class="l">Abonnées actives</div><div class="v">{{ counts.active || 0 }}</div></div>
      <div class="card kpi"><div class="l">En attente de confirmation</div><div class="v">{{ counts.pending || 0 }}</div></div>
      <div class="card kpi"><div class="l">Désinscrites</div><div class="v">{{ counts.unsubscribed || 0 }}</div></div>
    </div>
    <div class="tabs"><button :class="{on: tab === 'campaigns'}" @click="tab = 'campaigns'">Campagnes</button><button :class="{on: tab === 'subs'}" @click="tab = 'subs'">Abonnées</button></div>

    <div v-if="tab === 'campaigns'" class="card panel">
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Objet</th><th>Statut</th><th>Envoi</th><th>Destinataires</th><th></th></tr></thead>
        <tbody><tr v-for="c in campaigns" :key="c.id" class="click" @click="openCampaign(c)">
          <td class="strong">{{ c.subject }}</td><td><span class="badge" :class="c.status">{{ c.status === 'sent' ? 'Envoyée' : 'Brouillon' }}</span></td>
          <td class="muted">{{ c.sent_at ? fmtDateTime(c.sent_at) : '—' }}</td><td>{{ c.status === 'sent' ? c.recipients_count : '' }}</td>
          <td @click.stop><button v-if="c.status === 'draft'" class="icon-btn" @click="delCampaign(c)"><Icon name="trash" /></button></td>
        </tr></tbody>
      </table></div>
      <Empty v-if="!campaigns.length" icon="send" text="Aucune campagne. Créez votre première newsletter !" />
    </div>

    <div v-else class="card panel">
      <div class="filters">
        <input class="input" v-model="q" @input="search" placeholder="Rechercher…">
        <select class="select" v-model="st" @change="loadSubs()"><option value="active">Actives</option><option value="pending">En attente</option><option value="unsubscribed">Désinscrites</option><option value="">Toutes</option></select>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>E-mail</th><th>Prénom</th><th>Statut</th><th>Source</th><th>Inscription</th><th></th></tr></thead>
        <tbody><tr v-for="s in subs" :key="s.id">
          <td class="strong">{{ s.email }}</td><td>{{ s.first_name || '—' }}</td><td><span class="badge" :class="s.status">{{ {active:'Active',pending:'En attente',unsubscribed:'Désinscrite'}[s.status] }}</span></td>
          <td class="muted">{{ s.source }}</td><td class="muted">{{ fmtShort(s.created_at) }}</td>
          <td><button class="icon-btn" @click="delSub(s)" title="Supprimer (RGPD)"><Icon name="trash" /></button></td>
        </tr></tbody>
      </table></div>
      <Empty v-if="!subs.length" icon="users" text="Aucune abonnée." />
    </div>

    <Modal v-if="edit" :title="edit.status === 'sent' ? 'Campagne envoyée' : (edit.id ? 'Modifier la campagne' : 'Nouvelle campagne')" wide @close="edit = null">
      <div class="grid c2" style="align-items:start">
        <div class="stack">
          <div class="field"><label>Objet *</label><input class="input" v-model="edit.subject" :disabled="edit.status === 'sent'" placeholder="Ex. Votre peau prête pour l’hiver ❄️"></div>
          <div class="field"><label>Texte d’aperçu</label><input class="input" v-model="edit.preheader" :disabled="edit.status === 'sent'" placeholder="Affiché après l’objet dans la boîte mail"></div>
          <div class="field"><label>Contenu (Markdown)</label><textarea class="textarea md-area" style="min-height:300px;border-radius:12px" v-model="edit.content" :disabled="edit.status === 'sent'" @input="preview"></textarea></div>
        </div>
        <div><span class="label">Aperçu</span><div class="preview-box prose" style="min-height:300px;margin-top:8px;font-size:.95rem" v-html="previewHtml"></div></div>
      </div>
      <template #foot v-if="edit.status !== 'sent'">
        <input class="input" style="width:auto;flex:1;min-width:200px" type="email" v-model="testEmail" placeholder="adresse@test.be">
        <button class="btn ghost" @click="sendTest" :disabled="busy || !edit.subject">Envoyer un test</button>
        <button class="btn soft" @click="saveCampaign" :disabled="busy || !edit.subject">Enregistrer</button>
        <button class="btn" @click="sendAll" :disabled="busy || !edit.subject || !counts.active"><Icon name="send" /> Envoyer à {{ counts.active || 0 }}</button>
      </template>
    </Modal>

    <Modal v-if="adding" title="Ajouter une abonnée" @close="adding = null">
      <div class="stack">
        <div class="field"><label>E-mail *</label><input type="email" class="input" v-model.trim="adding.email"></div>
        <div class="field"><label>Prénom</label><input class="input" v-model.trim="adding.first_name"></div>
        <label class="check"><input type="checkbox" v-model="adding.confirmed"> <span>J’ai déjà son consentement écrit (sinon un e-mail de confirmation lui est envoyé)</span></label>
      </div>
      <template #foot><button class="btn ghost" @click="adding = null">Annuler</button><button class="btn" @click="addSub" :disabled="!adding.email">Ajouter</button></template>
    </Modal>
  </div>`,
};
