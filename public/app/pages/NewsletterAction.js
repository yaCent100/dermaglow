import { api } from '../api.js';

export default {
  name: 'NewsletterActionPage',
  props: { action: String },
  data: () => ({ state: 'loading', error: '' }),
  async created() {
    try {
      await api.post(this.action === 'confirm' ? '/newsletter/confirm' : '/newsletter/unsubscribe', { token: this.$route.query.token || '' });
      this.state = 'ok';
    } catch (e) { this.state = 'error'; this.error = e.message; }
  },
  template: `
  <section class="section"><div class="container narrow state">
    <template v-if="state === 'loading'"><div class="ring wait"><Spinner lg /></div><h2>Un instant…</h2></template>
    <template v-else-if="state === 'ok' && action === 'confirm'">
      <div class="ring"><Icon name="check" /></div><h2>Inscription confirmée</h2>
      <p class="muted">Bienvenue ! Vous recevrez bientôt nos conseils et nos offres réservées aux abonnées.</p>
      <RouterLink to="/soins" class="btn">Découvrir nos soins</RouterLink>
    </template>
    <template v-else-if="state === 'ok'">
      <div class="ring wait"><Icon name="mail" /></div><h2>Vous êtes désinscrite</h2>
      <p class="muted">Vous ne recevrez plus notre newsletter. Vous pouvez vous réinscrire à tout moment depuis le site.</p>
      <RouterLink to="/" class="btn ghost">Retour à l’accueil</RouterLink>
    </template>
    <template v-else><div class="ring bad"><Icon name="alert" /></div><h2>Lien invalide</h2><p class="muted">{{ error }}</p></template>
  </div></section>`,
};
