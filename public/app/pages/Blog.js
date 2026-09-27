import { api } from '../api.js';
import { debounce } from '../utils.js';
import { PostCard, NewsletterForm } from '../components/site.js';

export default {
  name: 'BlogPage',
  components: { PostCard, NewsletterForm },
  data: () => ({ posts: [], meta: null, cats: [], cat: '', q: '', loading: true }),
  async created() {
    this.cat = this.$route.query.categorie || '';
    this.load();
    api.get('/posts/categories').then((c) => (this.cats = c)).catch(() => {});
    this.search = debounce(() => this.load(), 350);
  },
  methods: {
    async load(page = 1) {
      this.loading = true;
      try {
        const r = await api.get('/posts', { page, per_page: 9, category: this.cat, q: this.q });
        this.posts = page > 1 ? [...this.posts, ...r.data] : r.data;
        this.meta = r.meta;
      } finally { this.loading = false; }
    },
    pick(c) {
      this.cat = c; this.load();
      this.$router.replace({ query: c ? { categorie: c } : {} });
    },
  },
  template: `
  <div>
    <section class="page-head">
      <div class="container">
        <div class="eyebrow">Le journal</div>
        <h1>Conseils, rituels <em>&</em> coulisses</h1>
        <p class="lead">Nos expertes partagent leurs conseils pour prendre soin de votre peau entre deux rendez-vous.</p>
      </div>
    </section>
    <div class="container">
      <div class="row between" style="margin-bottom:28px">
        <div class="row" style="gap:8px">
          <button class="chip" :class="{active: !cat}" @click="pick('')">Tous</button>
          <button v-for="c in cats" :key="c.category" class="chip" :class="{active: cat === c.category}" @click="pick(c.category)">{{ c.category }}</button>
        </div>
        <div style="position:relative;min-width:240px">
          <input class="input" v-model="q" @input="search" placeholder="Rechercher un article" aria-label="Rechercher" style="padding-left:42px">
          <Icon name="search" size="18" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)" />
        </div>
      </div>
      <div class="grid c3" v-if="posts.length">
        <div v-for="(p, i) in posts" :key="p.id" v-reveal="(i % 3) * 80"><PostCard :post="p" /></div>
      </div>
      <div v-else-if="loading" class="grid c3"><div v-for="i in 3" :key="i" class="skeleton" style="height:380px"></div></div>
      <Empty v-else icon="file" text="Aucun article ne correspond à votre recherche." />
      <div class="center" style="margin-top:36px" v-if="meta && meta.page < meta.pages">
        <button class="btn ghost" @click="load(meta.page + 1)" :disabled="loading">Voir plus d’articles</button>
      </div>
    </div>
  </div>`,
};
