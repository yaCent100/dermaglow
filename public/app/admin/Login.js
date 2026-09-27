import { api, auth } from '../api.js';

export default {
  name: 'AdminLogin',
  data: () => ({ email: '', password: '', remember: true, busy: false, error: '' }),
  created() { if (auth.token) this.$router.replace('/admin'); },
  methods: {
    async submit() {
      this.busy = true; this.error = '';
      try {
        const r = await api.post('/admin/login', { email: this.email, password: this.password, remember: this.remember });
        auth.token = r.token;
        this.$router.replace(this.$route.query.next || '/admin');
      } catch (e) { this.error = e.message; } finally { this.busy = false; }
    },
  },
  template: `
  <div class="login-wrap">
    <div class="login-art">
      <img src="/assets/img/hero.jpg" alt="">
      <div class="over"><img src="/assets/img/logo-light.png" alt="DermaGlow" style="height:26px;margin-bottom:24px"><h2>Votre institut,<br><em style="color:var(--powder)">en un coup d’œil.</em></h2></div>
    </div>
    <div class="login-form">
      <form @submit.prevent="submit" class="stack">
        <div class="eyebrow">Espace administration</div>
        <h1 style="font-size:2.6rem">Connexion</h1>
        <div v-if="error" class="alert error"><Icon name="alert" />{{ error }}</div>
        <div class="field"><label for="l-e">E-mail</label><input id="l-e" type="email" class="input" v-model.trim="email" autocomplete="username" required></div>
        <div class="field"><label for="l-p">Mot de passe</label><input id="l-p" type="password" class="input" v-model="password" autocomplete="current-password" required></div>
        <label class="check"><input type="checkbox" v-model="remember"> <span>Rester connectée 30 jours</span></label>
        <button class="btn block" :disabled="busy || !email || !password">{{ busy ? 'Connexion…' : 'Se connecter' }}</button>
        <RouterLink to="/" class="link-arrow small"><Icon name="arrow-left" /> Retour au site</RouterLink>
      </form>
    </div>
  </div>`,
};
