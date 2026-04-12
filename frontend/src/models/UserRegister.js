import { BaseModel } from './BaseModel.js'

// Contextes possibles à l'inscription
export const REGISTER_CONTEXT = {
  SOLO:   'solo',    // utilisateur seul
  CREATE: 'create',  // crée un groupe (devient OWNER)
  JOIN:   'join',    // rejoint un groupe via code invitation
}

export class UserRegister extends BaseModel {
  #email      = ''
  #username   = ''
  #password   = ''
  #avatar     = '🦊'
  #context    = REGISTER_CONTEXT.SOLO
  #groupName  = ''
  #groupType  = 'FRIENDS'
  #inviteCode = ''

  // ── Setters avec validation ──────────────────────────────────────────────

  set email(value) {
    this._validateField('email', value?.trim(), [
      { test: v => v.length > 0,                  message: 'Email requis' },
      { test: v => BaseModel.REGEX.email.test(v), message: 'Email invalide' },
    ])
    this.#email = value?.trim()
  }

  set username(value) {
    this._validateField('username', value?.trim(), [
      { test: v => v.length > 0,                     message: 'Pseudo requis' },
      { test: v => BaseModel.REGEX.username.test(v), message: '2 à 30 caractères, lettres/chiffres/_' },
    ])
    this.#username = value?.trim()
  }

  set password(value) {
    this._validateField('password', value, [
      { test: v => v?.length > 0,                     message: 'Mot de passe requis' },
      { test: v => BaseModel.REGEX.password.test(v),  message: '8 caractères min, avec lettre et chiffre' },
    ])
    this.#password = value
  }

  set avatar(value) {
    this._validateField('avatar', value, [
      { test: v => BaseModel.REGEX.emoji.test(v ?? ''), message: 'Choisissez un emoji' },
    ])
    this.#avatar = value
  }

  set context(value) {
    if (!Object.values(REGISTER_CONTEXT).includes(value))
      this._setError('context', 'Contexte invalide')
    else
      this._clearError('context')
    this.#context = value
  }

  set groupName(value) {
    if (this.#context !== REGISTER_CONTEXT.CREATE) {
      this._clearError('groupName')
      this.#groupName = value
      return
    }
    this._validateField('groupName', value?.trim(), [
      { test: v => v.length >= 2, message: 'Nom du groupe requis (min 2 caractères)' },
      { test: v => v.length <= 50, message: 'Nom trop long (max 50 caractères)' },
    ])
    this.#groupName = value?.trim()
  }

  set groupType(value) {
    if (!['FRIENDS', 'ASSOCIATION'].includes(value))
      this._setError('groupType', 'Type invalide')
    else
      this._clearError('groupType')
    this.#groupType = value
  }

  set inviteCode(value) {
    if (this.#context !== REGISTER_CONTEXT.JOIN) {
      this._clearError('inviteCode')
      this.#inviteCode = value
      return
    }
    this._validateField('inviteCode', value?.trim(), [
      { test: v => v.length > 0, message: 'Code d\'invitation requis' },
    ])
    this.#inviteCode = value?.trim()
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get email()      { return this.#email }
  get username()   { return this.#username }
  get password()   { return this.#password }
  get avatar()     { return this.#avatar }
  get context()    { return this.#context }
  get groupName()  { return this.#groupName }
  get groupType()  { return this.#groupType }
  get inviteCode() { return this.#inviteCode }

  // ── Validation complète ───────────────────────────────────────────────────

  validate() {
    this.email    = this.#email
    this.username = this.#username
    this.password = this.#password
    this.avatar   = this.#avatar
    this.context  = this.#context

    if (this.#context === REGISTER_CONTEXT.CREATE)
      this.groupName = this.#groupName

    if (this.#context === REGISTER_CONTEXT.JOIN)
      this.inviteCode = this.#inviteCode

    return this.isValid
  }

  // ── Payload — adapté au contexte ─────────────────────────────────────────

  toPayload() {
    if (!this.validate()) throw new Error('Formulaire invalide')

    const base = {
      email:    this.#email,
      username: this.#username,
      password: this.#password,
      avatar:   this.#avatar,
    }

    if (this.#context === REGISTER_CONTEXT.CREATE)
      return { ...base, group: { name: this.#groupName, type: this.#groupType } }

    if (this.#context === REGISTER_CONTEXT.JOIN)
      return { ...base, inviteCode: this.#inviteCode }

    return base  // solo
  }
}
