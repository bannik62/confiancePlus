# Cristaux & suivi — fait / à faire

> Dernière mise à jour : **2026-04-13** (cristal journée parfaite au jour clos).

## Fait

### 2026-04 — produit & technique (hors cristaux)

- **RDV « Non fait »** : enum `AppointmentCompletionOutcome` (`COMPLETED` | `NOT_DONE`), `declineReason`, API `POST /appointments/:id/not-done` ; validation impossible après non fait (plus d’XP) ; accueil : liste principale + bloc déroulant « Rendez-vous non faits » avec suppression uniquement ; Agenda / Stats (calendrier, `DaySnapshot`, heatmap) alignés.
- **Bonus XP journée** : plus de ×1,5 fixe — multiplicateur `max(1, 0.2 × nombre d’habitudes dues)` si tout est coché (`gameConfig.bonusPerTask`, `computeDayXP`, aperçu `frontend/src/lib/xpHabitBonus.js` + Home).
- **Offre du jour (anti-doublon)** : `pickTemplateForUser` exclut les modèles dont le **titre normalisé** est déjà celui d’une habitude active ; **pas** de repli sur tout le catalogue si pool vide ; réponse `exhausted` + modal « Pas de nouvelle proposition… » (sessionStorage 1× / jour).
- **Partage lien (Open Graph)** : `frontend/index.html` — `og:*`, Twitter, canonical, JSON-LD `WebSite`, `link rel="image_src"` ; nom **Habitracks**, URL `https://habitracks.vitalinfo.site/` ; image `/screenshots/desktop.png` en URL absolue ; `frontend/public/robots.txt` (Facebot, `facebookexternalhit`, LinkedInBot).
- **`manifest.json`** : nom court **Habitracks** (aligné branding).

- **Modèle** : `User.cristaux`, `lastCristalConnexionYmd`, `lastCristalJourneeParfaiteYmd` ; `CristalJourneeParfaiteGrant` ; `DailyHabitOffer.cristauxGranted` ; migrations `20260520120000_cristaux`, `20260520130000_cristal_journee_parfaite_grant`.
- **Module** : `backend/src/modules/cristaux/cristaux.service.js` — connexion quotidienne (1 / jour civil, fuseau `ianaTimezone`) ; **journée parfaite** : crédit **après clôture du jour** (premier `/me` / login / toggle du lendemain ou plus tard) si toutes les habitudes **dues** avaient un log ce jour-là ; table `CristalJourneeParfaiteGrant` (anti-doublon par jour) + migration depuis `lastCristalJourneeParfaiteYmd`.
- **Auth** : crédit connexion sur login / register / activate / `GET /auth/me` ; `tryGrantClosedDayJourneeParfaite` après ; `user.cristaux` exposé.
- **Habitudes** : réponse `PATCH /habits/:id/toggle` avec `cristaux` + `grantedJourneeParfaite` si un bonus jour clos est crédité sur cette requête.
- **Offre du jour** : +1 cristal à l’acceptation (transaction) ; **condition** : au moins **une** habitude déjà cochée ce jour avant acceptation (sinon 400).
- **Front** : Topbar 💎 + `mergeUser` ; sync après save coches (`Home.svelte`) et après accept offre (`App.svelte`).
- **Déploiement** : branche `prod` / GitHub `confiancePlus` — UI Topbar poussée (ne pas oublier `prisma migrate deploy` + `prisma generate` côté prod / Docker).
- **Rappels RDV e-mail** : `GMAIL_USER` + `GMAIL_APP_PASSWORD` (comme zerok-billing) ; job chaque minute — **veille** du RDV après `APPOINTMENT_REMINDER_DAY_BEFORE_HOUR` (défaut 18) heure locale assignée ; **1 h avant** le créneau (fuseau `ianaTimezone`). Champs `emailReminder*` sur `Appointment` ; reset si date/heure modifiées.
- **Admin — e-mail** : section dans `Admin.svelte` ; modèle par défaut (`AppSetting` `admin_email_default_*`) ; envoi **tous** (e-mail renseigné, non suspendus) ou **un** utilisateur ; `POST /admin/email/send` ; placeholders `{{username}}`, `{{email}}`.

## À faire / pistes

- **Partage Facebook** : si l’aperçu lien reste vide alors que LinkedIn OK — **Sharing Debugger** → Scrape Again ; vérifier pas de blocage **facebookexternalhit** (WAF) ; image `screenshots/desktop.png` accessible en 200 ; option : image dédiée **1200×630** (`og-share.png`).
- **Tests** : scénarios e2e ou manuels (connexion 1×/jour, offre avec pré-requis coche, journée complète + décochage, RDV non fait → pas de validation XP).
- **UX** : message clair si accept offre refusée (400 « coche au moins une habitude… ») ; toast optionnel quand `grantedJourneeParfaite`.

---

*Tu reprends : actualiser ce fichier en cochant / ajoutant des lignes.*
