import { api } from '../api.js';
import { fmtDate, renderMarkdown, setTitle } from '../utils.js';
import { PostCard, PostCover, NewsletterForm } from '../components/site.js';

export default {
  name: 'PostPage',
  components: { PostCard, PostCover, NewsletterForm },
  data: () => ({ p: null, html: '', notFound: false }),
  watch: { '$route.params.slug': { immediate: true, handler(v) { if (v) this.load(); } } },
  methods: {
    fmtDate,
    async load() {
      this.p = null; this.notFound = false;
      try {
        this.p = await api.get('/posts/' + this.$route.params.slug);
        this.html = await renderMarkdown(this.p.content);
        setTitle(this.p.meta_title || this.p.title);
      } catch { this.notFound = true; setTitle('Article introuvable'); }
    },
    share() {
      const data = { title: this.p.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard?.writeText(location.href);
    },
  },
  template: `
  <div>
    <div v-if="notFound" class="container state"><div class="ring bad"><Icon name="file" /></div><h2>Article introuvable</h2><RouterLink to="/blog" class="btn">Retour au journal</RouterLink></div>
    <article v-else-if="p">
      <header class="article-head">
        <div class="container narrow center">
          <RouterLink :to="'/blog?categorie=' + encodeURIComponent(p.category || '')" class="eyebrow center">{{ p.category || 'Journal' }}</RouterLink>
          <h1 style="font-size:clamp(2.4rem,5vw,3.8rem)">{{ p.title }}</h1>
          <p class="muted">{{ fmtDate(p.published_at) }} · {{ p.reading_minutes }} min de lecture · {{ p.author_name }}</p>
        </div>
      </header>
      <div class="container">
        <div class="article-cover"><PostCover :post="p" /></div>
      </div>
      <div class="container narrow">
        <p class="lead" v-if="p.excerpt" style="font-family:var(--serif);font-size:1.45rem;color:var(--navy);line-height:1.5;max-width:none">{{ p.excerpt }}</p>
        <div class="prose" v-html="html"></div>
        <hr class="divider">
        <div class="row between">
          <RouterLink to="/blog" class="link-arrow"><Icon name="arrow-left" /> Tous les articles</RouterLink>
          <div class="row"><button class="btn ghost sm" @click="share"><Icon name="send" /> Partager</button><RouterLink to="/reservation" class="btn sm">Réserver un soin</RouterLink></div>
        </div>
      </div>
      <section class="section tight" v-if="p.related?.length">
        <div class="container">
          <h2 style="font-size:2rem">À lire aussi</h2>
          <div class="grid c3"><PostCard v-for="r in p.related" :key="r.slug" :post="r" /></div>
        </div>
      </section>
    </article>
    <div v-else class="container narrow" style="padding:80px 0"><div class="skeleton" style="height:48px;margin-bottom:16px"></div><div class="skeleton" style="height:360px"></div></div>
  </div>`,
};
