import { BaseModel } from '../BaseModel.js'

export class CheckinMoodModel extends BaseModel {
  #mood = null
  #moodReason = ''

  set mood(value) {
    const n = Number(value)
    this._validateField('mood', n, [
      { test: (v) => Number.isInteger(v), message: 'Humeur invalide' },
      { test: (v) => v >= 1 && v <= 10, message: 'Humeur requise (1-10)' },
    ])
    this.#mood = Number.isFinite(n) ? n : null
  }

  set moodReason(value) {
    const v = typeof value === 'string' ? value.trim() : ''
    this._validateField('moodReason', v, [
      { test: (x) => x.length <= 500, message: 'Phrase d’humeur trop longue (500 max)' },
    ])
    this.#moodReason = v
  }

  get mood() { return this.#mood }
  get moodReason() { return this.#moodReason }

  validate() {
    this.mood = this.#mood
    this.moodReason = this.#moodReason
    return this.isValid
  }

  toPayload() {
    if (!this.validate()) throw new Error('Humeur invalide')
    return {
      mood: this.#mood,
      moodReason: this.#moodReason || undefined,
    }
  }
}
