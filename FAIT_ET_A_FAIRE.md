# Cristaux & suivi — fait / à faire

> Dernière mise à jour : pause utilisateur — à garder à jour au fil des sprints.

## Fait

- **Modèle** : `User.cristaux`, `lastCristalConnexionYmd`, `lastCristalJourneeParfaiteYmd` ; `DailyHabitOffer.cristauxGranted` ; migration Prisma `20260520120000_cristaux`.
- **Module** : `backend/src/modules/cristaux/cristaux.service.js` — connexion quotidienne (1 / jour civil, fuseau `ianaTimezone`) ; journée parfaite (toutes habitudes **dues** cochées le jour concerné).
- **Auth** : crédit connexion sur login / register / activate / `GET /auth/me` ; `user.cristaux` exposé.
- **Habitudes** : réponse `PATCH /habits/:id/toggle` avec `cristaux` + `grantedJourneeParfaite` après coches.
- **Offre du jour** : +1 cristal à l’acceptation (transaction) ; **condition** : au moins **une** habitude déjà cochée ce jour avant acceptation (sinon 400).
- **Front** : Topbar 💎 + `mergeUser` ; sync après save coches (`Home.svelte`) et après accept offre (`App.svelte`).
- **Déploiement** : branche `prod` / GitHub `confiancePlus` — UI Topbar poussée (ne pas oublier `prisma migrate deploy` + `prisma generate` côté prod / Docker).
- **Rappels RDV e-mail** : `GMAIL_USER` + `GMAIL_APP_PASSWORD` (comme zerok-billing) ; job chaque minute — **veille** du RDV après `APPOINTMENT_REMINDER_DAY_BEFORE_HOUR` (défaut 18) heure locale assignée ; **1 h avant** le créneau (fuseau `ianaTimezone`). Champs `emailReminder*` sur `Appointment` ; reset si date/heure modifiées.
- **Admin — e-mail** : section dans `Admin.svelte` ; modèle par défaut (`AppSetting` `admin_email_default_*`) ; envoi **tous** (e-mail renseigné, non suspendus) ou **un** utilisateur ; `POST /admin/email/send` ; placeholders `{{username}}`, `{{email}}`.

## À faire / pistes

- **Journée parfaite — règle métier** : aujourd’hui le bonus part au **dernier toggle** qui complète la journée. Si l’utilisateur **décoche** ensuite, le cristal reste. Piste : attribuer **après minuit** (jour `D` clos) via premier `/me` du lendemain ou job cron par fuseau ; ou **révoquer** au décochage (plus fragile si dépense des cristaux).
- **Tests** : scénarios e2e ou manuels (connexion 1×/jour, offre avec pré-requis coche, journée complète + décochage).
- **UX** : message clair si accept offre refusée (400 « coche au moins une habitude… ») ; toast optionnel quand `grantedJourneeParfaite`.

---

*Tu reprends : actualiser ce fichier en cochant / ajoutant des lignes.*
