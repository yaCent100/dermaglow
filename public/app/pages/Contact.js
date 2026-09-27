import { api } from '../api.js';
import { store, loadConfig, toast } from '../store.js';
import { OpeningHours } from '../components/site.js';

export default {
  name: 'ContactPage',
  components: { OpeningHours },
  data: () => ({ form: { name: '', email: '', phone: '', subject: '', message: '', website: '' }, busy: false, sent: false, errors: {} }),
  computed: { c() { return store.config; } },
  created() { loadConfig(); },
  methods: {
    async submit() {
      this.busy = true; this.errors = {};
      try { await api.post('/contact', this.form); this.sent = true; }
      catch (e) { this.errors = e.fields || {}; toast(e.message, 'error'); }
      finally { this.busy = false; }
    },
  },
  template: `
  <div>
    <section class="page-head">
      <div class="container">
        <div class="eyebrow">Contact</div>
        <h1>Parlons de <em>votre peau</em></h1>
        <p class="lead">Une question sur un soin, un besoin particulier ou une carte cadeau ? Écrivez-nous, nous répondons sous 24 h ouvrées.</p>
      </div>
    </section>
    <div class="container">
      <div class="grid c2" style="align-items:start;gap:32px">
        <div class="card pad">
          <div v-if="sent" class="state" style="padding:32px 0">
            <div class="ring"><Icon name="check" /></div>
            <h3>Message envoyé !</h3>
            <p class="muted">Merci {{ form.name }}, nous revenons vers vous très vite.</p>
          </div>
          <form v-else @submit.prevent="submit" class="form-grid" novalidate>
            <div class="field"><label for="c-n">Nom *</label><input id="c-n" class="input" :class="{err: errors.name}" v-model.trim="form.name" autocomplete="name"></div>
            <div class="field"><label for="c-e">E-mail *</label><input id="c-e" type="email" class="input" :class="{err: errors.email}" v-model.trim="form.email" autocomplete="email"></div>
            <div class="field"><label for="c-p">Téléphone</label><input id="c-p" type="tel" class="input" v-model.trim="form.phone" autocomplete="tel"></div>
            <div class="field"><label for="c-s">Sujet</label>
              <select id="c-s" class="select" v-model="form.subject"><option value="">Choisir…</option><option>Question sur un soin</option><option>Carte cadeau</option><option>Mon rendez-vous</option><option>Autre</option></select></div>
            <div class="field full"><label for="c-m">Message *</label><textarea id="c-m" class="textarea" :class="{err: errors.message}" v-model="form.message" rows="6"></textarea></div>
            <input class="hp" v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="full row between">
              <span class="small muted">Vos données servent uniquement à vous répondre.</span>
              <button class="btn" :disabled="busy">{{ busy ? 'Envoi…' : 'Envoyer' }} <Icon name="send" /></button>
            </div>
          </form>
        </div>
        <div class="stack">
          <div class="card pad">
            <h3>L’institut</h3>
            <div class="stack">
              <div class="row" style="align-items:flex-start;gap:12px"><Icon name="pin" /><span>{{ c?.address }}<br>{{ c?.city }}</span></div>
              <a class="row" style="gap:12px" :href="'tel:' + (c?.phone || '').replace(/\\s/g,'')"><Icon name="phone" />{{ c?.phone }}</a>
              <a class="row" style="gap:12px" :href="'mailto:' + c?.email"><Icon name="mail" />{{ c?.email }}</a>
              <a v-if="c?.map_url" :href="c.map_url" target="_blank" rel="noopener" class="link-arrow">Itinéraire <Icon name="external" /></a>
            </div>
          </div>
          <div class="card pad">
            <h3>Horaires</h3>
            <OpeningHours :hours="c?.opening_hours" />
            <RouterLink to="/reservation" class="btn block" style="margin-top:22px">Réserver en ligne</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>`,
};
