// Formatage (français, fuseau de l'institut)
export const euros = (cents) => {
  const v = (Number(cents) || 0) / 100;
  return (Number.isInteger(v) ? v.toLocaleString('fr-BE') : v.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' €';
};

export const toDate = (s) => (s instanceof Date ? s : new Date(String(s).replace(' ', 'T')));

export const fmtDate = (s, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  s ? toDate(s).toLocaleDateString('fr-BE', opts) : '';

export const fmtShort = (s) => fmtDate(s, { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtTime = (s) => {
  if (!s) return '';
  const d = toDate(s);
  return String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
};

export const fmtDateTime = (s) => (s ? `${fmtDate(s)} à ${fmtTime(s)}` : '');

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const duration = (min) => {
  min = Number(min) || 0;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const STATUS = {
  pending_payment: 'Paiement en attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absente',
  expired: 'Expiré',
};
export const PAYMENT = {
  unpaid: 'Non payé',
  deposit_paid: 'Acompte payé',
  paid: 'Soldé',
  refunded: 'Remboursé',
};

export function setTitle(t) {
  document.title = t ? `${t} | DermaGlow` : 'DermaGlow – Soins de peau & épilation';
}

/** Markdown -> HTML nettoyé (DOMPurify) */
export async function renderMarkdown(md) {
  const { marked } = await import('marked');
  const html = marked.parse(md || '', { breaks: false, gfm: true });
  return window.DOMPurify ? window.DOMPurify.sanitize(html) : html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

export function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
