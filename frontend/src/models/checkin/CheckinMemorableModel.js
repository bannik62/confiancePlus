import { BaseModel } from '../BaseModel.js'

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export class CheckinMemorableModel extends BaseModel {
  #memorableText = ''
  #shareInLeaderboard = false
  #imageFile = null
  #removeImage = false

  set memorableText(value) {
    const v = typeof value === 'string' ? value.trim() : ''
    this._validateField('memorableText', v, [
      { test: (x) => x.length <= 2000, message: 'Moment mémorable trop long (2000 max)' },
    ])
    this.#memorableText = v
  }

  set shareInLeaderboard(value) {
    this.#shareInLeaderboard = value === true
    this._clearError('shareInLeaderboard')
  }

  set imageFile(file) {
    if (!file) {
      this.#imageFile = null
      this._clearError('imageFile')
      return
    }
    this._validateField('imageFile', file, [
      { test: (f) => ALLOWED_IMAGE_MIME.has(f.type), message: 'Image invalide (jpeg/png/webp)' },
      { test: (f) => f.size <= MAX_IMAGE_BYTES, message: 'Image trop lourde (5MB max)' },
    ])
    this.#imageFile = file
    this.#removeImage = false
  }

  set removeImage(value) {
    this.#removeImage = value === true
    if (this.#removeImage) this.#imageFile = null
  }

  get memorableText() { return this.#memorableText }
  get shareInLeaderboard() { return this.#shareInLeaderboard }
  get imageFile() { return this.#imageFile }
  get removeImage() { return this.#removeImage }

  validate() {
    this.memorableText = this.#memorableText
    if (this.#imageFile) this.imageFile = this.#imageFile
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Moment mémorable invalide')
    return {
      journal: this.#memorableText || undefined,
      shareMemorableInLeaderboard: this.#shareInLeaderboard,
      removeMemorableImage: this.#removeImage || undefined,
      memorableImage: this.#imageFile || undefined,
    }
  }
}
