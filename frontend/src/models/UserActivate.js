import { BaseModel } from './BaseModel.js'

export class UserActivate extends BaseModel {
  #code = ''

  set code(value) {
    this._validateField('code', value?.trim().toUpperCase(), [
      { test: v => v.length > 0,                           message: 'Code requis' },
      { test: v => BaseModel.REGEX.activationCode.test(v), message: 'Le code doit faire 6 caractères (lettres et chiffres)' },
    ])
    this.#code = value?.trim().toUpperCase()
  }

  get code() { return this.#code }

  validate() {
    this.code = this.#code
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Code invalide')
    return { code: this.#code }
  }
}
