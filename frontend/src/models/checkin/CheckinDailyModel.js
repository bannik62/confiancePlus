import { CheckinMoodModel } from './CheckinMoodModel.js'
import { CheckinMemorableModel } from './CheckinMemorableModel.js'

export class CheckinDailyModel {
  constructor() {
    this.mood = new CheckinMoodModel()
    this.memorable = new CheckinMemorableModel()
    this.errors = {}
  }

  validate() {
    const moodOk = this.mood.validate()
    const memorableOk = this.memorable.validate()
    this.errors = {
      ...this.mood.errors,
      ...this.memorable.errors,
    }
    return moodOk && memorableOk
  }

  toPayload({ date, allowMoodOptional = false } = {}) {
    const memorablePayload = this.memorable.toPayload()
    const moodPayload = allowMoodOptional
      ? {
          mood: this.mood.mood ?? undefined,
          moodReason: this.mood.moodReason || undefined,
        }
      : this.mood.toPayload()
    const payload = { ...moodPayload, ...memorablePayload, date }
    const hasImage = memorablePayload.memorableImage instanceof File
    if (!hasImage) return payload

    const fd = new FormData()
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null || v === '') continue
      if (k === 'memorableImage' && v instanceof File) fd.append('memorableImage', v)
      else fd.append(k, String(v))
    }
    return fd
  }
}
