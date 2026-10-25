import { store, loadConfig, paymentOnline } from '../store.js';
import { euros } from '../utils.js';

// Textes types — à relire et adapter (ils ne remplacent pas un conseil juridique).
export default {
  name: 'LegalPage',
  props: { kind: String },
  computed: {
    c() { return store.config || {}; },
    online() { return paymentOnline(); },
    depositText() {
      if (!store.config) return '';
      return this.c.deposit_type === 'fixed'
        ? `un acompte de ${euros(Math.round(Number(this.c.deposit_value) * 100))}`
        : `un acompte de ${Number(this.c.deposit_value)} % du montant des soins (minimum ${euros(this.c.deposit_min_cents)})`;
    },
  },
  created() { loadConfig(); },
  template: `
  <section class="section">
    <div class="container narrow">
      <template v-if="kind === 'terms'">
        <div class="eyebrow">Informations</div>
        <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">Conditions de réservation</h1>
        <div class="prose">
          <template v-if="online">
            <h2>Acompte</h2>
            <p>Toute réservation en ligne est confirmée par le paiement de {{ depositText }}, réglé de façon sécurisée via notre prestataire de paiement Stripe. Le solde est réglé à l’institut le jour du rendez-vous.</p>
          </template>
          <template v-else>
            <h2>Réservation et règlement</h2>
            <p>Votre réservation en ligne est confirmée immédiatement par e-mail. Aucun paiement n’est demandé en ligne : le règlement se fait à l’institut, le jour du rendez-vous.</p>
          </template>
          <h2>Annulation et modification</h2>
          <ul>
            <template v-if="online">
              <li>Annulation <strong>au moins {{ c.cancellation_hours || 48 }} heures</strong> avant le rendez-vous : l’acompte est intégralement remboursé.</li>
              <li>Annulation moins de {{ c.cancellation_hours || 48 }} heures avant, ou absence : l’acompte reste acquis à l’institut.</li>
            </template>
            <li v-else>Merci d’annuler <strong>au moins {{ c.cancellation_hours || 48 }} heures</strong> avant le rendez-vous, afin de libérer le créneau pour une autre cliente.</li>
            <li>Pour déplacer un rendez-vous, contactez-nous par téléphone ou par e-mail.</li>
          </ul>
          <p>Vous pouvez annuler à tout moment depuis le lien « Gérer mon rendez-vous » présent dans votre e-mail de confirmation.</p>
          <h2>Retard</h2>
          <p>En cas de retard important, le soin pourra être écourté afin de ne pas pénaliser les clientes suivantes, sans modification du tarif.</p>
          <h2>Annulation par l’institut</h2>
          <p v-if="online">Si nous devions annuler votre rendez-vous, l’acompte vous serait intégralement remboursé.</p>
          <p v-else>Si nous devions annuler votre rendez-vous, nous vous prévenons par e-mail ou par téléphone dans les meilleurs délais.</p>
          <h2>Contre-indications</h2>
          <p>Merci de nous signaler toute grossesse, allergie, traitement médical ou problème de peau lors de la réservation. Certains soins peuvent être déconseillés ; nous nous réservons le droit de les adapter.</p>
          <h2>Contact</h2>
          <p>{{ c.salon_name }} — {{ c.address }}, {{ c.city }} — {{ c.phone }} — {{ c.email }}</p>
        </div>
      </template>
      <template v-else>
        <div class="eyebrow">RGPD</div>
        <h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">Politique de confidentialité</h1>
        <div class="prose">
          <p>{{ c.salon_name }} ({{ c.address }}, {{ c.city }}) est responsable du traitement des données collectées sur ce site.</p>
          <h2>Données collectées</h2>
          <ul>
            <li><strong>Réservation</strong> : nom, prénom, e-mail, téléphone, soins choisis et message éventuel — pour gérer votre rendez-vous (exécution du contrat).</li>
            <li v-if="online"><strong>Paiement</strong> : traité directement par Stripe ; nous n’avons jamais accès à vos données bancaires.</li>
            <li><strong>Newsletter</strong> : e-mail et prénom, uniquement avec votre consentement (double confirmation). Désinscription en un clic dans chaque e-mail.</li>
            <li><strong>Avis & contact</strong> : les informations que vous saisissez, pour publier votre avis (prénom uniquement) ou vous répondre.</li>
          </ul>
          <h2>Durée de conservation</h2>
          <p>Données de rendez-vous : 3 ans après le dernier rendez-vous. Newsletter : jusqu’à votre désinscription. Messages : 1 an.</p>
          <h2>Vos droits</h2>
          <p>Vous disposez d’un droit d’accès, de rectification, d’effacement, d’opposition et de portabilité. Écrivez-nous à {{ c.email }}. Vous pouvez également introduire une réclamation auprès de l’Autorité de protection des données (autoriteprotectiondonnees.be).</p>
          <h2>Cookies</h2>
          <p>Ce site n’utilise aucun cookie publicitaire ni outil de suivi. Seul le stockage technique nécessaire à la réservation (sélection de soins) est utilisé dans votre navigateur.</p>
        </div>
      </template>
    </div>
  </section>`,
};
