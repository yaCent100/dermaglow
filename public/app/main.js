import { createApp } from 'vue';
import { router } from './router.js';
import { Icon, Stars, Spinner, Empty, StatusBadge, Modal, Toasts, reveal } from './components/ui.js';
import { SiteHeader, SiteFooter } from './components/site.js';
import { loadConfig } from './store.js';

const App = {
  components: { SiteHeader, SiteFooter, Toasts },
  computed: {
    isAdmin() { return this.$route.matched.some((r) => r.meta.admin); },
    flush() { return !!this.$route.meta.footerFlush; },
  },
  template: `
    <template v-if="isAdmin"><RouterView /></template>
    <template v-else>
      <a href="#main" class="sr-only">Aller au contenu</a>
      <SiteHeader />
      <main id="main"><RouterView v-slot="{ Component, route }"><Transition name="fade" mode="out-in"><component :is="Component" :key="route.path" /></Transition></RouterView></main>
      <SiteFooter :flush="flush" />
    </template>
    <Toasts />`,
};

loadConfig();

const app = createApp(App);
app.component('Icon', Icon).component('Stars', Stars).component('Spinner', Spinner)
  .component('Empty', Empty).component('StatusBadge', StatusBadge).component('Modal', Modal);
app.directive('reveal', reveal);
app.use(router);
app.mount('#app');
