import { createRouter, createWebHistory } from 'vue-router';
import { auth } from './api.js';

const page = (name) => () => import(`./pages/${name}.js`);
const admin = (name) => () => import(`./admin/${name}.js`);

const routes = [
  { path: '/', component: page('Home'), meta: { title: '' } },
  { path: '/soins', component: page('Services'), meta: { title: 'Nos soins & tarifs' } },
  { path: '/soins/:slug', component: page('ServiceDetail') },
  { path: '/reservation', component: page('Booking'), meta: { title: 'Réserver un soin', footerFlush: false } },
  { path: '/reservation/paiement-test', component: page('PaymentTest'), meta: { title: 'Paiement (mode test)' } },
  { path: '/reservation/confirmation', component: page('BookingConfirmation'), meta: { title: 'Confirmation' } },
  { path: '/mon-rendez-vous', component: page('ManageBooking'), meta: { title: 'Mon rendez-vous' } },
  { path: '/blog', component: page('Blog'), meta: { title: 'Journal beauté' } },
  { path: '/blog/:slug', component: page('Post') },
  { path: '/avis', component: page('Reviews'), meta: { title: 'Avis clientes' } },
  { path: '/contact', component: page('Contact'), meta: { title: 'Contact & accès' } },
  { path: '/conditions', component: page('Legal'), props: { kind: 'terms' }, meta: { title: 'Conditions de réservation' } },
  { path: '/confidentialite', component: page('Legal'), props: { kind: 'privacy' }, meta: { title: 'Politique de confidentialité' } },
  { path: '/newsletter/confirmation', component: page('NewsletterAction'), props: { action: 'confirm' }, meta: { title: 'Newsletter' } },
  { path: '/newsletter/desinscription', component: page('NewsletterAction'), props: { action: 'unsubscribe' }, meta: { title: 'Newsletter' } },

  { path: '/admin/connexion', component: admin('Login'), meta: { admin: true, bare: true, title: 'Connexion' } },
  {
    path: '/admin', component: admin('Layout'), meta: { admin: true, auth: true },
    children: [
      { path: '', component: admin('Dashboard'), meta: { title: 'Tableau de bord' } },
      { path: 'planning', component: admin('Planning'), meta: { title: 'Planning' } },
      { path: 'rendez-vous', component: admin('Bookings'), meta: { title: 'Rendez-vous' } },
      { path: 'rendez-vous/:id', component: admin('Bookings'), meta: { title: 'Rendez-vous' } },
      { path: 'soins', component: admin('Catalog'), meta: { title: 'Soins & tarifs' } },
      { path: 'blog', component: admin('Posts'), meta: { title: 'Blog' } },
      { path: 'blog/nouveau', component: admin('PostEditor'), meta: { title: 'Nouvel article' } },
      { path: 'blog/:id', component: admin('PostEditor'), meta: { title: 'Modifier l’article' } },
      { path: 'avis', component: admin('Reviews'), meta: { title: 'Avis' } },
      { path: 'newsletter', component: admin('Newsletter'), meta: { title: 'Newsletter' } },
      { path: 'messages', component: admin('Messages'), meta: { title: 'Messages' } },
      { path: 'reglages', component: admin('Settings'), meta: { title: 'Réglages' } },
    ],
  },
  { path: '/:pathMatch(.*)*', component: page('NotFound'), meta: { title: 'Page introuvable' } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 150, behavior: 'smooth' };
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (to.matched.some((r) => r.meta.auth) && !auth.token) {
    return { path: '/admin/connexion', query: { next: to.fullPath } };
  }
  if (to.meta.title !== undefined) {
    document.title = to.meta.title ? `${to.meta.title} | DermaGlow` : 'DermaGlow – Soins de peau & épilation';
  }
  return true;
});

// Si un nouveau déploiement rend un module introuvable : rechargement propre
router.onError((err, to) => {
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(String(err?.message))) {
    window.location.assign(to.fullPath);
  }
});
