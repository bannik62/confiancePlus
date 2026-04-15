import { BaseModel } from './BaseModel.js'

const isIcon = (s) => typeof s === 'string' && s.trim().length > 0 && /\p{Extended_Pictographic}/u.test(s)

export class UserCompleteProfile extends BaseModel {
  #code            = ''
  #email           = ''
  #username        = ''
  #avatar          = '🦊'
  #password        = ''
  #passwordConfirm = ''

  set code(value) {
    this.#code = value
  }

  set email(value) {
    const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
    this._validateField('email', v, [
      { test: (x) => x.length > 0,                  message: 'E-mail requis' },
      { test: (x) => BaseModel.REGEX.email.test(x), message: 'E-mail invalide' },
    ])
    this.#email = v
  }

  set username(value) {
    this._validateField('username', value?.trim(), [
      { test: (x) => x.length > 0,                     message: 'Pseudo requis' },
      { test: (x) => BaseModel.REGEX.username.test(x), message: '2 à 30 caractères, lettres/chiffres/_' },
    ])
    this.#username = value?.trim()
  }

  set avatar(value) {
    this._validateField('avatar', value, [
      { test: (x) => isIcon(x ?? ''), message: 'Choisis un emoji comme avatar' },
    ])
    this.#avatar = value?.trim() || '🦊'
  }

  set password(value) {
    this._validateField('password', value, [
      { test: v => v?.length > 0,                     message: 'Mot de passe requis' },
      { test: v => BaseModel.REGEX.password.test(v),  message: '8 caractères min, avec lettre et chiffre' },
    ])
    this.#password = value

    if (this.#passwordConfirm)
      this.passwordConfirm = this.#passwordConfirm
  }

  set passwordConfirm(value) {
    this._validateField('passwordConfirm', value, [
      { test: v => v?.length > 0,              message: 'Confirmation requise' },
      { test: v => v === this.#password,       message: 'Les mots de passe ne correspondent pas' },
    ])
    this.#passwordConfirm = value
  }

  get code()            { return this.#code }
  get email()           { return this.#email }
  get username()        { return this.#username }
  get avatar()          { return this.#avatar }
  get password()        { return this.#password }
  get passwordConfirm() { return this.#passwordConfirm }

  /** Après check-code : remplit sans déclencher d’erreurs sur champs vides */
  prefillActivateStep(code, username, avatar) {
    this.#code = code
    this.#username = username ?? ''
    this.#avatar = avatar && isIcon(avatar) ? avatar : '🦊'
    this.#email = ''
    this.#password = ''
    this.#passwordConfirm = ''
    this.errors = {}
  }

  validate() {
    this.email           = this.#email
    this.username        = this.#username
    this.avatar          = this.#avatar
    this.password        = this.#password
    this.passwordConfirm = this.#passwordConfirm
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Formulaire invalide')
    return {
      code:     this.#code,
      email:    this.#email,
      password: this.#password,
      username: this.#username,
      avatar:   this.#avatar,
    }
  }
}
