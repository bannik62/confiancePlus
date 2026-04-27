# Cristaux & suivi — fait / à faire

> Dernière mise à jour : **2026-04-13** — cristaux (inchangé ci-dessous) + **UI / typo / heatmap / accueil** + **mot de passe oublié (e-mail + `/reset-password`)** + **réactions perf batch**, **streak trophée & claim**, **leaderboards & stats profil**.

## Fait

### 2026-04 — produit & technique (hors cristaux)

- **RDV « Non fait »** : enum `AppointmentCompletionOutcome` (`COMPLETED` | `NOT_DONE`), `declineReason`, API `POST /appointments/:id/not-done` ; validation impossible après non fait (plus d’XP) ; accueil : liste principale + bloc déroulant « Rendez-vous non faits » avec suppression uniquement ; Agenda / Stats (calendrier, `DaySnapshot`, heatmap) alignés.
- **Bonus XP journée** : plus de ×1,5 fixe — multiplicateur `max(1, 0.2 × nombre d’habitudes dues)` si tout est coché (`gameConfig.bonusPerTask`, `computeDayXP`, aperçu `frontend/src/lib/xpHabitBonus.js` + Home).
- **Offre du jour (anti-doublon)** : `pickTemplateForUser` exclut les modèles dont le **titre normalisé** est déjà celui d’une habitude active ; **pas** de repli sur tout le catalogue si pool vide ; réponse `exhausted` + modal « Pas de nouvelle proposition… » (sessionStorage 1× / jour).
- **Partage lien (Open Graph)** : `frontend/index.html` — `og:*`, Twitter, canonical, JSON-LD `WebSite`, `link rel="image_src"` ; nom **Habitracks**, URL `https://habitracks.vitalinfo.site/` ; image `/screenshots/desktop.png` en URL absolue ; `frontend/public/robots.txt` (Facebot, `facebookexternalhit`, LinkedInBot).
- **`manifest.json`** : nom court **Habitracks** (aligné branding).

#### UI / thème / typo (frontend)

- **`theme.css`** : couleurs **`--text` / `--muted`** plus lisibles sur fond sombre ; base **`html`** : `font-size: clamp(15px, 2.2vw + 10px, 17px)` (échelle un peu plus basse sur petit viewport, min 15px) ; `body` inchangé en `1rem`.
- **Texte « secondaire » générique** (vues & composants) : `font-size: clamp(15px, 0.72rem + 0.28vw, 17px)` (remplace l’ancienne formule plus haute), règle projet **pas de police en dessous de 15px** sauf cas explicitement demandés.
- **Accueil — plafond d’habitudes** : paragraphe d’aide sous la liste avec classe **`micro--fine`** à **14px** (dérogation volontaire au plancher 15px pour ce bloc uniquement).
- **Accueil — mini-stats habitudes** : carte cercle `done/total` : première carte du grid en **flex centré** ; en **`max-width: 520px`**, **`circle-wrap`** / **`circle-label`** en **`width: 100%`**, **`big-num`** en **`text-align: center`** pour aligner le ratio avec le disque.
- **Calendrier type GitHub** (`CalendarHeatmap.svelte`, Stats + `EducatorMemberFollowupModal`) : correction des **`clamp(15px, …)`** appliqués par erreur aux **gaps / paddings / min-heights** (borne min incohérente avec le max → grille cassée) ; valeurs basses réalistes puis **+2px** sur ces min (grille un peu plus aérée) ; **tooltip**, **légende texte** et **boutons de mode** restent en typo lisible `clamp(15px, 0.72rem + 0.28vw, 17px)`.
- **Design app (sessions précédentes, rappel)** : cartes **opaques**, **Topbar** / **BottomNav**, **XPBar**, **Shop**, **Profil**, **Stats**, fond **aurora** / **Lenis** — cohérence visuelle sur les onglets principaux.

#### Features — streak, stats, réactions groupe

- **Mot de passe oublié** : modèle **`PasswordResetToken`** (hash SHA-256 du jeton, expiration 1 h, usage unique) ; **`POST /auth/forgot-password`** `{ email }` — réponse générique ; e-mail SMTP (`sendMail`) avec lien **`{FRONTEND_URL}/reset-password?t=…`** ; **`GET /auth/reset-password/check`** ; **`POST /auth/reset-password`** `{ token, newPassword, confirmNewPassword }`. Front : **`Login.svelte`** (« Mot de passe oublié ? » + formulaire e-mail) ; **`ResetPassword.svelte`** affiché par **`App.svelte`** uniquement sur **`/reset-password`** — sans paramètre `t` ou jeton invalide : pas de formulaire de changement effectif.
- **Streak — trophées & claim** : `gameConfig.streak.rewards` (ex. palier **7 j** avec `heroImage` sous `/public/badges/...`) ; Prisma **`User.streakMilestoneMaxClaimedAt`** ; `stats.service.js` — offre **`streakMilestoneOffer`**, construction / reset, **`claimStreakMilestone`** ; route **`POST`** dédiée dans `stats.router.js` ; front **`profile` store**, **`api/stats.js`**, modale / snooze dans **`App.svelte`**, intégration **Topbar** / **Groupe** / **Stats** selon les écrans branchés.
- **Leaderboards & agrégats** : **`GET /stats/leaderboard`** ; totaux **réactions perf** (❤️ / 🤔) via **`getPerfReactionTotalsByUserIds`** dans **`stats.service.js`** et **`group.service.js`** pour enrichir les lignes classement.
- **Réactions perf (batch)** : **`POST /habits/perf-reactions/batch`** (avant la route unitaire), schéma **`perfReactionBatchBodySchema`**, implémentation **`setPerfReactionsBatch`** dans **`habits.perfReaction.js`** (e-mail **groupé** côté serveur sur le lot) ; front **`habitsApi.setPerfReactionsBatch`** ; **`PeerHabitsModal.svelte`** — brouillon des clics + **flush à la fermeture** du modal (moins d’appels API, un seul mail côté destinataire).

- **Modèle** : `User.cristaux`, `lastCristalConnexionYmd`, `lastCristalJourneeParfaiteYmd` ; `CristalJourneeParfaiteGrant` ; `DailyHabitOffer.cristauxGranted` ; migrations `20260520120000_cristaux`, `20260520130000_cristal_journee_parfaite_grant`.
- **Module** : `backend/src/modules/cristaux/cristaux.service.js` — connexion quotidienne (1 / jour civil, fuseau `ianaTimezone`) ; **journée parfaite** : crédit **après clôture du jour** (premier `/me` / login / toggle du lendemain ou plus tard) si toutes les habitudes **dues** avaient un log ce jour-là ; table `CristalJourneeParfaiteGrant` (anti-doublon par jour) + migration depuis `lastCristalJourneeParfaiteYmd`.
- **Auth** : crédit connexion sur login / register / activate / `GET /auth/me` ; `tryGrantClosedDayJourneeParfaite` après ; `user.cristaux` exposé.
- **Habitudes** : réponse `PATCH /habits/:id/toggle` avec `cristaux` + `grantedJourneeParfaite` si un bonus jour clos est crédité sur cette requête.
- **Offre du jour** : +1 cristal à l’acceptation (transaction) ; **condition** : au moins **une** habitude déjà cochée ce jour avant acceptation (sinon 400).
- **Front** : Topbar 💎 + `mergeUser` ; sync après save coches (`Home.svelte`) et après accept offre (`App.svelte`).
- **Déploiement** : branche `prod` / GitHub `habitracks` — UI Topbar poussée (ne pas oublier `prisma migrate deploy` + `prisma generate` côté prod / Docker) ; **après** ajout `PasswordResetToken` : migrer + vérifier **`FRONTEND_URL`** (lien e-mail) et **`GMAIL_*`** pour l’envoi.
- **Rappels RDV e-mail** : `GMAIL_USER` + `GMAIL_APP_PASSWORD` (comme zerok-billing) ; job chaque minute — **veille** du RDV après `APPOINTMENT_REMINDER_DAY_BEFORE_HOUR` (défaut 18) heure locale assignée ; **1 h avant** le créneau (fuseau `ianaTimezone`). Champs `emailReminder*` sur `Appointment` ; reset si date/heure modifiées.
- **Admin — e-mail** : section dans `Admin.svelte` ; modèle par défaut (`AppSetting` `admin_email_default_*`) ; envoi **tous** (e-mail renseigné, non suspendus) ou **un** utilisateur ; `POST /admin/email/send` ; placeholders `{{username}}`, `{{email}}`.

## À faire / pistes

- **Partage Facebook** : si l’aperçu lien reste vide alors que LinkedIn OK — **Sharing Debugger** → Scrape Again ; vérifier pas de blocage **facebookexternalhit** (WAF) ; image `screenshots/desktop.png` accessible en 200 ; option : image dédiée **1200×630** (`og-share.png`).
- **Tests** : scénarios e2e ou manuels (connexion 1×/jour, offre avec pré-requis coche, journée complète + décochage, RDV non fait → pas de validation XP).
- **UX** : message clair si accept offre refusée (400 « coche au moins une habitude… ») ; toast optionnel quand `grantedJourneeParfaite`.

---

*Tu reprends : actualiser ce fichier en cochant / ajoutant des lignes.*
