# MCD — Modèle Conceptuel de Données

**Rôle :** décrire le **métier** (quoi ? qui avec qui ?) sans parler de tables ni de SQL.  
**Indépendance :** totalement **indépendant du SGBD**.

---

## Entités principales

| Entité | Signification métier |
|--------|----------------------|
| **Utilisateur** | Compte (solo, membre asso, éducateur) |
| **Groupe** | Espace collectif (amis ou association) |
| **Habitude** | Routine suivie par un utilisateur |
| **Journal de habitude** | Validation d’une habitude à une date donnée |
| **Journal du jour** | Check-in quotidien (humeur, sommeil, journal) |

## Associations (vue métier)

- Un **Utilisateur** possède **plusieurs Habitudes** ; une **Habitude** appartient à **un** Utilisateur.
- Un **Utilisateur** enregistre **plusieurs** journaux de habitude ; chaque ligne concerne **une** Habitude à **une** date.
- Un **Utilisateur** a **au plus un** journal du jour **par date civile**.
- Un **Utilisateur** peut participer à **plusieurs Groupes** ; un **Groupe** regroupe **plusieurs** Utilisateurs — avec un **rôle** (éducateur / membre) porté par la **liaison** (adhésion).

## Diagramme MCD (Mermaid)

> Cardinalités en lecture « entité1 — association — entité2 ».

```mermaid
erDiagram
  UTILISATEUR ||--o{ HABITUDE : "possède"
  UTILISATEUR ||--o{ JOURNAL_HABITUDE : "enregistre"
  UTILISATEUR ||--o{ JOURNAL_DU_JOUR : "remplit"
  HABITUDE ||--o{ JOURNAL_HABITUDE : "est validée par"

  GROUPE ||--o{ ADHESION : "comporte"
  UTILISATEUR ||--o{ ADHESION : "définit"

  UTILISATEUR {
    string identifiant_interne PK
    string email_optionnel UK
    string pseudo UK
    bool compte_en_attente
  }

  GROUPE {
    string identifiant_interne PK
    string nom
    string type_metier "FRIENDS ou ASSOCIATION"
    string code_invitation UK
  }

  ADHESION {
    string role "OWNER ou MEMBER"
    datetime date_entree
  }

  HABITUDE {
    string identifiant_interne PK
    string libelle
    int xp
    string origine "pack ou utilisateur"
    bool active
  }

  JOURNAL_HABITUDE {
    string identifiant_interne PK
    date jour
    string preuve_optionnelle
  }

  JOURNAL_DU_JOUR {
    string identifiant_interne PK
    date jour
    int humeur_optionnelle
    int sommeil_optionnel
    texte journal_optionnel
  }
```

*Note : en Merise « pur », l’entité **Adhésion** correspond à la table de liaison n-aire ; ici elle matérialise la relation Utilisateur–Groupe avec attributs (rôle, date).*
