import { api } from '../api.js';
import { fmtShort, debounce } from '../utils.js';

export default {
  name: 'AdminPosts',
  data: () => ({ list: [], meta: null, status: '', q: '', loading: true }),
  created() { this.search = debounce(() => this.load(), 300); this.load(); },
  methods: {
    fmtShort,
    async load(page = 1) {
      this.loading = true;
      try { const r = await api.get('/admin/posts', { page, status: this.status, q: this.q }); this.list = r.data; this.meta = r.meta; }
      finally { this.loading = false; }
    },
  },
  template: `
  <div>
    <div class="admin-top"><h1>Blog</h1><RouterLink to="/admin/blog/nouveau" class="btn sm"><Icon name="plus" /> Nouvel article</RouterLink></div>
    <div class="card panel">
      <div class="filters">
        <input class="input" v-model="q" @input="search" placeholder="Rechercher un titre…">
        <select class="select" v-model="status" @change="load()"><option value="">Tous</option><option value="published">Publiés</option><option value="draft">Brouillons</option></select>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Publication</th><th>Vues</th></tr></thead>
        <tbody>
          <tr v-for="p in list" :key="p.id" class="click" @click="$router.push('/admin/blog/' + p.id)">
            <td class="strong">{{ p.title }} <span v-if="Number(p.is_featured)" class="pill-badge">À la une</span></td>
            <td class="muted">{{ p.category || '—' }}</td>
            <td><span class="badge" :class="p.status">{{ p.status === 'published' ? 'Publié' : 'Brouillon' }}</span></td>
            <td class="muted">{{ p.published_at ? fmtShort(p.published_at) : '—' }}</td>
            <td>{{ p.views }}</td>
          </tr>
        </tbody>
      </table></div>
      <Empty v-if="!loading && !list.length" icon="file" text="Aucun article." />
    </div>
  </div>`,
};
