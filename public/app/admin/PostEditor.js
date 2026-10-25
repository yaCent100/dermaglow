import { api } from '../api.js';
import { toast } from '../store.js';
import { renderMarkdown } from '../utils.js';

const EMPTY = { title: '', slug: '', category: '', excerpt: '', content: '', cover_image: '', meta_title: '', meta_description: '', status: 'draft', is_featured: false, published_at: '', author_name: '' };

export default {
  name: 'AdminPostEditor',
  data: () => ({ p: { ...EMPTY }, tab: 'write', html: '', busy: false, uploading: false, dirty: false }),
  computed: { isNew() { return !this.$route.params.id; } },
  watch: {
    tab(v) { if (v === 'preview') this.preview(); },
    p: { deep: true, handler() { this.dirty = true; } },
  },
  async created() {
    if (!this.isNew) {
      const p = await api.get('/admin/posts/' + this.$route.params.id);
      this.p = { ...EMPTY, ...p, is_featured: !!Number(p.is_featured), published_at: p.published_at ? p.published_at.slice(0, 16).replace(' ', 'T') : '' };
      this.$nextTick(() => (this.dirty = false));
    }
  },
  methods: {
    async preview() { this.html = await renderMarkdown(this.p.content); },
    wrap(before, after = before, placeholder = 'texte') {
      const ta = this.$refs.ta; const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = this.p.content.slice(s, e) || placeholder;
      this.p.content = this.p.content.slice(0, s) + before + sel + after + this.p.content.slice(e);
      this.$nextTick(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
    },
    line(prefix) {
      const ta = this.$refs.ta; const s = ta.selectionStart;
      const start = this.p.content.lastIndexOf('\n', s - 1) + 1;
      this.p.content = this.p.content.slice(0, start) + prefix + this.p.content.slice(start);
      this.$nextTick(() => ta.focus());
    },
    async upload(ev, target) {
      const file = ev.target.files[0]; if (!file) return;
      const fd = new FormData(); fd.append('image', file);
      this.uploading = true;
      try {
        const r = await api.upload('/admin/uploads', fd);
        if (target === 'cover') this.p.cover_image = r.url;
        else this.p.content += `\n\n![${file.name.replace(/\.[^.]+$/, '')}](${r.url})\n`;
      } catch (e) { toast(e.message, 'error'); } finally { this.uploading = false; ev.target.value = ''; }
    },
    async save(status) {
      if (status) this.p.status = status;
      this.busy = true;
      try {
        const r = this.isNew ? await api.post('/admin/posts', this.p) : await api.put('/admin/posts/' + this.$route.params.id, this.p);
        toast(this.p.status === 'published' ? 'Article publié.' : 'Brouillon enregistré.', 'success');
        this.p.slug = r.slug; this.$nextTick(() => (this.dirty = false));
        if (this.isNew) this.$router.replace('/admin/blog/' + r.id);
      } catch (e) { toast(e.message, 'error'); } finally { this.busy = false; }
    },
    async remove() {
      if (!confirm('Supprimer cet article ?')) return;
      await api.del('/admin/posts/' + this.$route.params.id); toast('Article supprimé.'); this.$router.push('/admin/blog');
    },
  },
  template: `
  <div>
    <div class="admin-top">
      <div><RouterLink to="/admin/blog" class="link-arrow small"><Icon name="arrow-left" /> Articles</RouterLink><h1 style="margin-top:8px">{{ isNew ? 'Nouvel article' : 'Modifier l’article' }}</h1></div>
      <div class="row">
        <a v-if="!isNew && p.status === 'published'" :href="'/blog/' + p.slug" target="_blank" class="btn ghost sm"><Icon name="eye" /> Voir</a>
        <button class="btn ghost sm" @click="save('draft')" :disabled="busy">{{ p.status === 'published' ? 'Repasser en brouillon' : 'Enregistrer le brouillon' }}</button>
        <button class="btn sm" @click="save('published')" :disabled="busy || !p.title"><Icon name="send" /> {{ p.status === 'published' ? 'Mettre à jour' : 'Publier' }}</button>
      </div>
    </div>
    <div class="editor">
      <div class="stack">
        <input class="input" v-model="p.title" placeholder="Titre de l’article" style="font-family:var(--serif);font-size:1.5rem;padding:14px 18px;color:var(--navy)">
        <textarea class="textarea" v-model="p.excerpt" rows="2" maxlength="400" placeholder="Chapô : 1 à 2 phrases qui donnent envie de lire (affiché dans les listes et sur Google)"></textarea>
        <div class="tabs" style="margin-bottom:0"><button :class="{on: tab === 'write'}" @click="tab = 'write'">Écrire</button><button :class="{on: tab === 'preview'}" @click="tab = 'preview'">Aperçu</button></div>
        <div v-show="tab === 'write'">
          <div class="md-toolbar">
            <button @click="line('## ')" title="Titre">Titre</button><button @click="line('### ')">Sous-titre</button>
            <button @click="wrap('**')" title="Gras"><b>G</b></button><button @click="wrap('*')" title="Italique"><i>I</i></button>
            <button @click="line('- ')">• Liste</button><button @click="line('1. ')">1. Liste</button><button @click="line('> ')">Citation</button>
            <button @click="wrap('[', '](https://)', 'lien')">Lien</button>
            <label style="padding:6px 10px;cursor:pointer;font-size:.86rem"><Icon name="image" size="15" style="display:inline;vertical-align:-3px" /> Image<input type="file" accept="image/*" hidden @change="upload($event, 'content')"></label>
          </div>
          <textarea ref="ta" class="textarea md-area" v-model="p.content" placeholder="Écrivez votre article ici… (format Markdown : ## pour un titre, **gras**, - pour une liste)"></textarea>
        </div>
        <div v-show="tab === 'preview'" class="preview-box prose" v-html="html || '<p class=muted>Rien à afficher.</p>'"></div>
      </div>
      <div class="stack" style="margin-top:0">
        <div class="card panel stack">
          <div class="row between"><span class="label">Statut</span><span class="badge" :class="p.status">{{ p.status === 'published' ? 'Publié' : 'Brouillon' }}</span></div>
          <div class="field"><label>Catégorie</label><input class="input" v-model="p.category" list="cats" placeholder="Ex. Soins visage"><datalist id="cats"><option>Soins visage</option><option>Épilation</option><option>Conseils beauté</option><option>Actualités</option></datalist></div>
          <div class="field"><label>Date de publication</label><input type="datetime-local" class="input" v-model="p.published_at"><span class="small muted">Date future = programmé</span></div>
          <div class="field"><label>Auteur</label><input class="input" v-model="p.author_name" placeholder="L’équipe DermaGlow"></div>
          <label class="switch"><input type="checkbox" v-model="p.is_featured"> Mettre à la une</label>
        </div>
        <div class="card panel stack">
          <span class="label">Image de couverture</span>
          <label class="img-drop">
            <img v-if="p.cover_image" :src="p.cover_image" alt="">
            <span v-if="uploading"><Spinner /></span><span v-else>{{ p.cover_image ? 'Changer l’image' : 'Cliquer pour ajouter une image (JPG, PNG, WebP)' }}</span>
            <input type="file" accept="image/*" hidden @change="upload($event, 'cover')">
          </label>
          <button v-if="p.cover_image" class="link small" @click="p.cover_image = ''">Retirer l’image</button>
        </div>
        <div class="card panel stack">
          <span class="label">Référencement (Google)</span>
          <div class="field"><label>Adresse (slug)</label><input class="input" v-model="p.slug" placeholder="généré automatiquement"></div>
          <div class="field"><label>Titre SEO</label><input class="input" v-model="p.meta_title" maxlength="200" :placeholder="p.title"></div>
          <div class="field"><label>Description SEO <span class="muted">{{ (p.meta_description || '').length }}/160</span></label><textarea class="textarea" rows="3" v-model="p.meta_description" maxlength="300" :placeholder="p.excerpt"></textarea></div>
        </div>
        <button v-if="!isNew" class="btn danger ghost sm" @click="remove"><Icon name="trash" /> Supprimer l’article</button>
      </div>
    </div>
  </div>`,
};
