# DermaGlow : site et réservation en ligne

Site vitrine et système de réservation pour l’institut **DermaGlow**.

- **Backend** : CodeIgniter 4.6 (PHP 8.1 ou plus), base MySQL/MariaDB (ou SQLite en local)
- **Frontend** : Vue 3 + Vue Router (modules ES, **sans étape de build** : rien à compiler, pas besoin de Node.js)
- **Paiement** : Stripe Checkout pour l’acompte (carte, Bancontact, Apple Pay, Google Pay…). Le solde se règle sur place.

---

## Fonctionnalités

**Côté clientes**
- Accueil, carte des soins et tarifs (26 soins repris de « Nos Prix »), fiche détaillée par soin
- Réservation en 4 étapes : choix d’un ou plusieurs soins, date et créneau (calendrier des disponibilités), coordonnées, paiement de l’acompte
- Page « Mon rendez-vous » (lien reçu par e-mail) avec annulation en ligne et remboursement automatique de l’acompte si l’annulation respecte le délai
- E-mails : confirmation, rappel la veille, annulation, demande d’avis après le soin
- Blog (« Journal ») avec catégories et recherche
- Avis clientes avec notes, badge « Cliente vérifiée » et réponses de l’institut
- Newsletter avec double confirmation (RGPD) et désinscription en un clic
- Formulaire de contact, horaires, conditions de réservation, politique de confidentialité
- SEO : titres et descriptions par page, Open Graph, sitemap.xml, robots.txt, données structurées « BeautySalon »

**Espace admin** (`/admin`)
- Tableau de bord : RDV du jour, chiffre du mois, acomptes, les 14 prochains jours, soins populaires
- Planning semaine (clic sur un créneau libre pour créer un RDV)
- Rendez-vous : recherche, filtres, export CSV, détail (encaisser le solde, marquer terminé ou absente, déplacer, annuler/rembourser, notes internes, historique de la cliente)
- Création manuelle de RDV (téléphone ou sur place, sans acompte)
- Soins et tarifs : prix, durées, acompte par soin, visibilité, ordre d’affichage
- Blog : éditeur avec aperçu, images, brouillons et programmation, SEO
- Avis : modération et réponses publiques
- Newsletter : abonnées, export CSV, campagnes avec envoi de test
- Messages de contact
- Réglages : infos de l’institut, horaires (plusieurs plages par jour), règles d’acompte, délai d’annulation, intervalle des créneaux, pause entre RDV, capacité (nombre de cabines), fermetures exceptionnelles, mot de passe

---

## 1. Tester en local (sur ton ordinateur)

Prérequis : **PHP 8.1 ou plus** avec les extensions `intl`, `mbstring`, `sqlite3` (déjà incluses dans XAMPP, Laragon ou MAMP).

```bash
cd dermaglow
cp .env.example .env
```

Dans `.env`, modifie ces lignes pour utiliser SQLite (aucune base à installer) :

```
CI_ENVIRONMENT = development
app.baseURL = 'http://localhost:8080/'
app.forceGlobalSecureRequests = false
database.default.DBDriver = SQLite3
database.default.database = dermaglow.db
```

Puis :

```bash
php spark migrate
php spark db:seed DermaglowSeeder
php spark serve
```

- Site : http://localhost:8080
- Admin : http://localhost:8080/admin (identifiants `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`)

En local, sans clé Stripe, le paiement est **simulé** : une page « Mode test » remplace Stripe. Les e-mails sont enregistrés dans `writable/emails/` : ouvre-les dans ton navigateur pour les voir.

> Le dossier `vendor/` est déjà inclus. Si tu as Composer, `composer install` le régénère.

---

## 2. Mettre en ligne gratuitement

### Option recommandée : alwaysdata (hébergeur français, offre gratuite)

L’offre gratuite comprend PHP, MySQL, SSH, HTTPS gratuit et une adresse `ton-nom.alwaysdata.net`. **Attention : elle est réservée à un usage personnel.** Elle est parfaite pour tester et montrer le site. Pour l’activité réelle de l’institut, passe à une offre payante (chez eux ou chez un autre hébergeur PHP/MySQL) : le code ne change pas.

1. Crée un compte sur alwaysdata.com.
2. **Base de données** : Bases de données > MySQL > Ajouter. Note le nom, l’utilisateur, le mot de passe et l’hôte (`mysql-ton-nom.alwaysdata.net`).
3. **Envoi des fichiers** : envoie tout le dossier `dermaglow/` par SFTP (FileZilla), par exemple dans `/home/ton-nom/dermaglow/`.
4. **Site** : Web > Sites > modifier le site > Type « PHP ». Racine : `/dermaglow/public/` (important : le dossier **public**).
5. **Configuration** : copie `.env.example` en `.env` sur le serveur et remplis :
   - `app.baseURL = 'https://ton-nom.alwaysdata.net/'`
   - les 4 lignes `database.default.*` (MySQL)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mot de passe solide !)
   - `CRON_KEY` : une longue chaîne aléatoire
6. **Installation** : par SSH, lance `php spark migrate && php spark db:seed DermaglowSeeder`.
   Sans SSH : mets une clé dans `INSTALL_KEY`, ouvre `https://ton-site/install?key=TA_CLE`, puis **vide `INSTALL_KEY`**.
7. **Tâches planifiées** (rappels J-1, libération des créneaux non payés) : dans alwaysdata > Tâches planifiées, ajoute toutes les heures `php /home/ton-nom/dermaglow/spark dermaglow:tasks`. Sinon, utilise cron-job.org (gratuit) pour appeler toutes les heures `https://ton-site/cron?key=TA_CRON_KEY`.

### Autre hébergeur (o2switch, Hostinger, OVH, InfinityFree…)

La procédure est la même. Si tu ne peux pas choisir le dossier racine du site, envoie le projet à la racine : le fichier `.htaccess` fourni redirige automatiquement vers `public/` et protège le reste.

---

## 3. Activer Stripe (acompte en ligne)

1. Crée un compte sur stripe.com et active les moyens de paiement voulus (Bancontact est très utilisé en Belgique) dans *Paramètres > Moyens de paiement*.
2. *Développeurs > Clés API* : copie la clé secrète dans `STRIPE_SECRET_KEY`. Commence par la clé **test** `sk_test_…`.
3. *Développeurs > Webhooks > Ajouter un endpoint* :
   - URL : `https://ton-site/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
   - Copie le « Signing secret » `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
4. Teste une réservation avec la carte test `4242 4242 4242 4242`.
5. Quand tout fonctionne, remplace les clés test par les clés **live** (`sk_live_…` et le secret du webhook live).

L’état de la configuration est visible dans **Admin > Réglages > Sécurité & système**.

**Fonctionnement de l’acompte** : le montant est un pourcentage (30 % par défaut, minimum 20 €) ou un montant fixe, modifiable dans Réglages. Un acompte fixe peut aussi être défini soin par soin. Pendant le paiement, le créneau est bloqué 30 minutes, puis libéré si le paiement n’aboutit pas. Si la cliente annule au moins 48 h avant (réglable), l’acompte est remboursé automatiquement via Stripe.

---

## 4. Activer les e-mails

Sans configuration, les e-mails ne partent pas : ils sont enregistrés dans `writable/emails/`. Pour les envoyer, utilise un SMTP, par exemple **Brevo** (gratuit jusqu’à 300 e-mails par jour) :

```
SMTP_HOST = smtp-relay.brevo.com
SMTP_PORT = 587
SMTP_USER = (identifiant SMTP Brevo)
SMTP_PASS = (clé SMTP Brevo)
MAIL_FROM = contact@ton-domaine.be
MAIL_ADMIN = adresse qui reçoit les notifications
```

Pense à valider ton domaine d’envoi chez Brevo (SPF/DKIM) pour ne pas tomber en spam.

---

## 5. À personnaliser avant l’ouverture

- **Admin > Réglages** : adresse, téléphone, e-mail, Instagram, lien Google Maps, horaires
- **Admin > Soins** : vérifier les **durées** (elles ne figuraient pas sur la carte : ce sont des estimations)
- **Admin > Blog** : les 3 articles fournis sont des exemples, à relire ou remplacer
- Pages **Conditions** et **Confidentialité** (`public/app/pages/Legal.js`) : textes types à faire relire
- Textes de l’accueil : `public/app/pages/Home.js`
- Couleurs et polices : variables en haut de `public/assets/css/main.css`

---

## Structure du projet

```
dermaglow/
├── app/
│   ├── Config/Routes.php          toutes les routes (API + site)
│   ├── Controllers/Api/           API publique (soins, réservations, blog, avis…)
│   ├── Controllers/Admin/         API de l’admin (protégée par jeton)
│   ├── Controllers/Spa.php        sert la page Vue + balises SEO
│   ├── Libraries/                 logique métier : BookingService, Availability, Payments (Stripe), Mailer…
│   ├── Database/Migrations/       structure de la base
│   ├── Database/Seeds/            données de départ (carte des soins)
│   └── Views/emails/              modèles d’e-mails
├── public/                        ← racine web
│   ├── app/                       application Vue 3 (pages/, admin/, components/)
│   ├── assets/                    CSS, polices, images, logo
│   ├── vendor/                    Vue, Vue Router, marked, DOMPurify (copies locales)
│   └── uploads/                   images envoyées depuis l’admin
├── writable/                      logs, cache, e-mails locaux (doit être accessible en écriture)
└── vendor/                        CodeIgniter 4 + Stripe PHP
```

## Évolutions possibles

- Plusieurs praticiennes avec leur propre planning
- Cartes cadeaux et forfaits (ex. 6 séances d’épilation)
- Rappels par SMS
- Passage du frontend à Vite et aux composants `.vue` (la structure pages/composants le permet sans tout réécrire)
