import { BaseModel } from './BaseModel.js'

export class UserLogin extends BaseModel {
  #email    = ''
  #password = ''

  set email(value) {
    this._validateField('email', value?.trim(), [
      { test: v => v.length > 0,                      message: 'Email requis' },
      { test: v => BaseModel.REGEX.email.test(v),     message: 'Email invalide' },
    ])
    this.#email = value?.trim()
  }

  set password(value) {
    this._validateField('password', value, [
      { test: v => v?.length > 0,  message: 'Mot de passe requis' },
    ])
    this.#password = value
  }

  get email()    { return this.#email }
  get password() { return this.#password }

  validate() {
    this.email    = this.#email
    this.password = this.#password
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Formulaire invalide')
    return { email: this.#email, password: this.#password }
  }
}
