import { BaseModel } from './BaseModel.js'

export class UserCompleteProfile extends BaseModel {
  #code            = ''   // code d'activation transmis depuis UserActivate
  #password        = ''
  #passwordConfirm = ''

  set code(value) {
    this.#code = value
  }

  set password(value) {
    this._validateField('password', value, [
      { test: v => v?.length > 0,                     message: 'Mot de passe requis' },
      { test: v => BaseModel.REGEX.password.test(v),  message: '8 caractères min, avec lettre et chiffre' },
    ])
    this.#password = value

    // Revalider la confirmation si déjà saisie
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
  get password()        { return this.#password }
  get passwordConfirm() { return this.#passwordConfirm }

  validate() {
    this.password        = this.#password
    this.passwordConfirm = this.#passwordConfirm
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Formulaire invalide')
    return { code: this.#code, password: this.#password }
  }
}
