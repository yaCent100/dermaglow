import { api } from '../api.js';
import { toast } from '../store.js';
import { fmtShort } from '../utils.js';
import { refreshCounters } from './Layout.js';

export default {
  name: 'AdminReviews',
  data: () => ({ list: [], status: 'pending', replying: null, reply: '', loading: true }),
  created() { this.load(); },
  methods: {
    fmtShort,
    async load() { this.loading = true; try { this.list = (await api.get('/admin/reviews', { status: this.status, per_page: 100 })).data; } finally { this.loading = false; } },
    async set(r, status) { await api.patch('/admin/reviews/' + r.id, { status }); toast(status === 'approved' ? 'Avis publié.' : 'Avis masqué.', 'success'); this.load(); refreshCounters(); },
    async saveReply() { await api.patch('/admin/reviews/' + this.replying.id, { reply: this.reply }); this.replying = null; toast('Réponse enregistrée.', 'success'); this.load(); },
    async remove(r) { if (!confirm('Supprimer définitivement cet avis ?')) return; await api.del('/admin/reviews/' + r.id); this.load(); refreshCounters(); },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Avis clientes</h1></div>
    <div class="tabs">
      <button v-for="[k, l] in [['pending','À modérer'],['approved','Publiés'],['rejected','Masqués'],['','Tous']]" :key="k" :class="{on: status === k}" @click="status = k; load()">{{ l }}</button>
    </div>
    <div class="stack">
      <div v-for="r in list" :key="r.id" class="card review">
        <div class="head">
          <div><Stars :value="Number(r.rating)" /> <strong style="margin-left:8px;color:var(--navy)">{{ r.name }}</strong>
            <span v-if="Number(r.is_verified)" class="pill-badge" style="margin-left:6px">✓ Vérifiée {{ r.booking_reference }}</span></div>
          <div class="row"><span class="small muted">{{ fmtShort(r.created_at) }}<template v-if="r.service_name"> · {{ r.service_name }}</template></span><span class="badge" :class="r.status">{{ {pending:'À modérer',approved:'Publié',rejected:'Masqué'}[r.status] }}</span></div>
        </div>
        <p v-if="r.title" class="strong" style="font-weight:600;margin-bottom:4px">{{ r.title }}</p>
        <p style="margin:0">{{ r.comment }}</p>
        <p v-if="r.email" class="small muted" style="margin:8px 0 0">{{ r.email }}</p>
        <div v-if="r.reply" class="reply"><strong>Votre réponse :</strong> {{ r.reply }}</div>
        <div class="row" style="margin-top:16px">
          <button v-if="r.status !== 'approved'" class="btn xs" @click="set(r, 'approved')"><Icon name="check" /> Publier</button>
          <button v-if="r.status !== 'rejected'" class="btn ghost xs" @click="set(r, 'rejected')">Masquer</button>
          <button class="btn ghost xs" @click="replying = r; reply = r.reply || ''"><Icon name="message" /> {{ r.reply ? 'Modifier la réponse' : 'Répondre' }}</button>
          <button class="btn danger ghost xs" @click="remove(r)"><Icon name="trash" /></button>
        </div>
      </div>
      <div class="card" v-if="!loading && !list.length"><Empty icon="star" :text="status === 'pending' ? 'Aucun avis en attente. 🎉' : 'Aucun avis.'" /></div>
    </div>
    <Modal v-if="replying" title="Répondre publiquement" @close="replying = null">
      <p class="small muted">Votre réponse sera affichée sous l’avis de {{ replying.name }}.</p>
      <textarea class="textarea" v-model="reply" rows="5" placeholder="Merci beaucoup pour votre retour…"></textarea>
      <template #foot><button class="btn ghost" @click="replying = null">Annuler</button><button class="btn" @click="saveReply">Enregistrer</button></template>
    </Modal>
  </div>`,
};
