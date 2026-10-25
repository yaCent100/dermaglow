import { reactive } from 'vue';
import { api } from './api.js';

// État partagé : configuration de l'institut + sélection de soins (panier)
function readCart() {
  try { return JSON.parse(sessionStorage.getItem('dg_cart') || '[]'); } catch { return []; }
}

export const store = reactive({
  config: null,
  catalog: null,
  cart: readCart(), // ids des soins sélectionnés
  toasts: [],
});

/** Paiement en ligne actif ? (Stripe désactivé actuellement : tout se règle sur place) */
export function paymentOnline() {
  return ['stripe', 'simulation'].includes(store.config?.payment_mode);
}

export function saveCart() {
  try { sessionStorage.setItem('dg_cart', JSON.stringify(store.cart)); } catch { /* navigation privée */ }
}

export function toggleCart(id) {
  const i = store.cart.indexOf(id);
  i >= 0 ? store.cart.splice(i, 1) : store.cart.push(id);
  saveCart();
}

export function clearCart() { store.cart.splice(0); saveCart(); }

let configPromise = null;
export function loadConfig(force = false) {
  if (!configPromise || force) configPromise = api.get('/config').then((c) => (store.config = c)).catch(() => (configPromise = null));
  return configPromise;
}

let catalogPromise = null;
export function loadCatalog(force = false) {
  if (!catalogPromise || force) catalogPromise = api.get('/services').then((c) => (store.catalog = c)).catch((e) => { catalogPromise = null; throw e; });
  return catalogPromise;
}

export function allServices() {
  return (store.catalog || []).flatMap((c) => c.services.map((s) => ({ ...s, category: c.name, category_sub: c.subtitle })));
}

let tid = 0;
export function toast(message, type = 'info', ms = 4000) {
  const id = ++tid;
  store.toasts.push({ id, message, type });
  setTimeout(() => { const i = store.toasts.findIndex((t) => t.id === id); if (i >= 0) store.toasts.splice(i, 1); }, ms);
}
