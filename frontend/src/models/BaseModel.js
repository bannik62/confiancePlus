/**
 * BaseModel — classe abstraite pour tous les modèles de formulaire
 *
 * Fournit :
 *  - errors{}     : objet { field: "message" } utilisable directement dans les templates Svelte
 *  - isValid      : getter → true si aucune erreur
 *  - validate()   : déclenche tous les setters, peuple errors
 *  - toPayload()  : à surcharger — retourne uniquement les champs propres et validés
 *
 * Chaque sous-classe déclare ses champs privés (_email, etc.)
 * et leurs setters avec regex + règles métier.
 */
export class BaseModel {
  constructor() {
    this.errors = {}
  }

  // ── Helpers de validation ──────────────────────────────────────────────────

  _setError(field, message) {
    this.errors[field] = message
  }

  _clearError(field) {
    delete this.errors[field]
  }

  _validateField(field, value, rules) {
    for (const { test, message } of rules) {
      if (!test(value)) {
        this._setError(field, message)
        return false
      }
    }
    this._clearError(field)
    return true
  }

  // ── Getters globaux ────────────────────────────────────────────────────────

  get isValid() {
    return Object.keys(this.errors).length === 0
  }

  get errorList() {
    return Object.values(this.errors)
  }

  // ── À surcharger dans chaque sous-classe ──────────────────────────────────

  validate() {
    throw new Error('validate() doit être implémenté dans la sous-classe')
  }

  toPayload() {
    throw new Error('toPayload() doit être implémenté dans la sous-classe')
  }

  // ── Regex communs partagés entre les classes ───────────────────────────────

  static REGEX = {
    email:        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    username:     /^[a-zA-Z0-9_]{2,30}$/,
    emoji:        /^\p{Emoji}/u,
    activationCode: /^[A-Z0-9]{6}$/,
    // Mot de passe : min 8 chars, au moins 1 lettre et 1 chiffre
    password:     /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/,
  }
}
