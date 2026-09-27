import { api } from '../api.js';
import { fmtDateTime } from '../utils.js';
import { refreshCounters } from './Layout.js';

export default {
  name: 'AdminMessages',
  data: () => ({ list: [], open: null, loading: true }),
  created() { this.load(); },
  methods: {
    fmtDateTime,
    async load() { this.loading = true; try { this.list = (await api.get('/admin/messages', { per_page: 100 })).data; } finally { this.loading = false; } },
    async view(m) {
      this.open = m;
      if (!m.read_at) { await api.post(`/admin/messages/${m.id}/read`); m.read_at = new Date().toISOString(); refreshCounters(); }
    },
    async remove(m) { if (!confirm('Supprimer ce message ?')) return; await api.del('/admin/messages/' + m.id); this.open = null; this.load(); refreshCounters(); },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Messages</h1></div>
    <div class="card panel">
      <div class="table-wrap"><table class="table">
        <thead><tr><th></th><th>De</th><th>Sujet</th><th>Reçu</th></tr></thead>
        <tbody><tr v-for="m in list" :key="m.id" class="click" @click="view(m)" :style="{fontWeight: m.read_at ? 400 : 600}">
          <td style="width:20px"><span v-if="!m.read_at" style="display:block;width:8px;height:8px;border-radius:50%;background:var(--navy)"></span></td>
          <td>{{ m.name }}<br><span class="small muted" style="font-weight:400">{{ m.email }}</span></td>
          <td>{{ m.subject || m.message.slice(0, 60) + '…' }}</td><td class="muted small">{{ fmtDateTime(m.created_at) }}</td>
        </tr></tbody>
      </table></div>
      <Empty v-if="!loading && !list.length" icon="message" text="Aucun message pour le moment." />
    </div>
    <Modal v-if="open" :title="open.subject || 'Message'" @close="open = null">
      <dl class="kv" style="margin-bottom:16px"><dt>De</dt><dd>{{ open.name }}</dd><dt>E-mail</dt><dd>{{ open.email }}</dd><dt v-if="open.phone">Téléphone</dt><dd v-if="open.phone">{{ open.phone }}</dd><dt>Reçu</dt><dd>{{ fmtDateTime(open.created_at) }}</dd></dl>
      <p style="white-space:pre-wrap;background:var(--cream);padding:16px;border-radius:12px">{{ open.message }}</p>
      <template #foot>
        <button class="btn danger ghost" style="margin-right:auto" @click="remove(open)"><Icon name="trash" /></button>
        <a v-if="open.phone" :href="'tel:' + open.phone" class="btn ghost"><Icon name="phone" /> Appeler</a>
        <a :href="'mailto:' + open.email + '?subject=' + encodeURIComponent('Re: ' + (open.subject || 'Votre message'))" class="btn"><Icon name="mail" /> Répondre</a>
      </template>
    </Modal>
  </div>`,
};
