import { api, auth } from '../api.js';
import { reactive } from 'vue';

// Compteurs partagés (badges du menu)
export const counters = reactive({ reviews: 0, messages: 0 });
export async function refreshCounters() {
  try { const d = await api.get('/admin/dashboard'); counters.reviews = d.pending_reviews; counters.messages = d.unread_messages; return d; } catch { return null; }
}

export default {
  name: 'AdminLayout',
  data: () => ({ user: null, open: false, counters }),
  watch: { $route() { this.open = false; } },
  async created() {
    this.onUnauth = () => this.$router.replace({ path: '/admin/connexion', query: { next: this.$route.fullPath } });
    window.addEventListener('dg:unauthorized', this.onUnauth);
    try { this.user = await api.get('/admin/me'); refreshCounters(); } catch { /* redirection gérée */ }
  },
  unmounted() { window.removeEventListener('dg:unauthorized', this.onUnauth); },
  methods: {
    async logout() {
      try { await api.post('/admin/logout'); } catch { /* ignore */ }
      auth.token = ''; this.$router.replace('/admin/connexion');
    },
  },
  template: `
  <div class="admin">
    <div class="admin-mobilebar">
      <img src="/assets/img/logo-light.png" alt="DermaGlow">
      <button class="icon-btn" @click="open = !open" aria-label="Menu"><Icon :name="open ? 'x' : 'menu'" /></button>
    </div>
    <aside class="admin-side" :class="{open}">
      <RouterLink to="/admin"><img src="/assets/img/logo-light.png" class="logo" alt="DermaGlow"></RouterLink>
      <nav>
        <RouterLink to="/admin" active-class="is-parent" exact-active-class="router-link-active"><Icon name="home" /> Tableau de bord</RouterLink>
        <RouterLink to="/admin/planning"><Icon name="calendar" /> Planning</RouterLink>
        <RouterLink to="/admin/rendez-vous"><Icon name="list" /> Rendez-vous</RouterLink>
        <div class="sep">Contenu</div>
        <RouterLink to="/admin/soins"><Icon name="sparkles" /> Soins & tarifs</RouterLink>
        <RouterLink to="/admin/blog"><Icon name="file" /> Blog</RouterLink>
        <RouterLink to="/admin/avis"><Icon name="star" /> Avis <span v-if="counters.reviews" class="count">{{ counters.reviews }}</span></RouterLink>
        <div class="sep">Clientes</div>
        <RouterLink to="/admin/newsletter"><Icon name="mail" /> Newsletter</RouterLink>
        <RouterLink to="/admin/messages"><Icon name="message" /> Messages <span v-if="counters.messages" class="count">{{ counters.messages }}</span></RouterLink>
        <RouterLink to="/admin/reglages"><Icon name="settings" /> Réglages</RouterLink>
      </nav>
      <div class="foot">
        <div style="color:var(--cream)">{{ user?.name }}</div>
        <div class="small" style="margin-bottom:12px">{{ user?.email }}</div>
        <div class="row" style="gap:14px">
          <a href="/" target="_blank" class="row" style="gap:6px"><Icon name="external" size="15" /> Site</a>
          <button @click="logout" class="row" style="gap:6px;background:none;border:0;color:inherit;cursor:pointer;padding:0"><Icon name="logout" size="15" /> Déconnexion</button>
        </div>
      </div>
    </aside>
    <main class="admin-main"><RouterView :key="$route.path.startsWith('/admin/rendez-vous') ? 'rdv' : $route.path" /></main>
  </div>`,
};
