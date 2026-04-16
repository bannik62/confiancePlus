import { BaseModel } from './BaseModel.js'

/** Mode de connexion — aligné sur le schéma backend `loginSchema` */
export const LOGIN_MODE = {
  SOLO:     'SOLO',
  EDUCATOR: 'EDUCATOR',
  FRIENDS:  'FRIENDS',
}

export class UserLogin extends BaseModel {
  #email      = ''
  #password   = ''
  #loginMode  = LOGIN_MODE.SOLO
  #inviteCode = ''

  set email(value) {
    this._validateField('email', value?.trim(), [
      { test: (v) => v.length > 0, message: 'Email requis' },
      { test: (v) => BaseModel.REGEX.email.test(v), message: 'Email invalide' },
    ])
    this.#email = value?.trim()
  }

  set password(value) {
    this._validateField('password', value, [
      { test: (v) => v?.length > 0, message: 'Mot de passe requis' },
    ])
    this.#password = value
  }

  set loginMode(value) {
    const ok = value === LOGIN_MODE.SOLO || value === LOGIN_MODE.EDUCATOR || value === LOGIN_MODE.FRIENDS
    this._validateField('loginMode', ok ? value : '', [
      { test: (v) => v.length > 0, message: 'Choisis un mode de connexion' },
    ])
    this.#loginMode = ok ? value : LOGIN_MODE.SOLO
    if (this.#loginMode !== LOGIN_MODE.FRIENDS) this._clearError('inviteCode')
  }

  set inviteCode(value) {
    const v = typeof value === 'string' ? value.trim() : ''
    if (this.#loginMode === LOGIN_MODE.FRIENDS) {
      this._validateField('inviteCode', v, [
        { test: (x) => x.length > 0, message: "Saisis le code d'invitation du groupe" },
      ])
    } else {
      this._clearError('inviteCode')
    }
    this.#inviteCode = v
  }

  get email()      { return this.#email }
  get password()   { return this.#password }
  get loginMode()  { return this.#loginMode }
  get inviteCode() { return this.#inviteCode }

  validate() {
    this.email = this.#email
    this.password = this.#password
    this.loginMode = this.#loginMode
    this.inviteCode = this.#inviteCode
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Formulaire invalide')
    return {
      email:      this.#email,
      password:   this.#password,
      loginMode:  this.#loginMode,
      inviteCode: this.#loginMode === LOGIN_MODE.FRIENDS ? this.#inviteCode : undefined,
    }
  }
}
